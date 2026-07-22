<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\ProjectAttachment;
use App\Models\ProjectBoard;
use App\Models\ProjectCard;
use App\Models\ProjectChecklist;
use App\Models\ProjectChecklistItem;
use App\Models\ProjectComment;
use App\Models\ProjectLabel;
use App\Models\User;
use App\Services\Organization\ProjectBoardService;
use App\Services\Organization\ProjectCardMemberNotifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class OrganizationProjectCardExtrasController extends Controller
{
    public function __construct(
        protected ProjectBoardService $boards
    ) {}

    protected function backToCard(ProjectBoard $board, ProjectCard $card, ?string $success = null)
    {
        // Explicit redirect with ?card= so partial reloads always refresh activeCard + board.
        return $this->boards->redirectToShow($board, $card, $success);
    }

    protected function resolveOrg(): Organization
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        if (! $user) {
            abort(403);
        }
        $org = Organization::forAuthUser($user);
        if (! $org) {
            abort(403, 'No organisation linked to your account.');
        }

        return $org;
    }

    protected function findBoard(Organization $org, int $boardId): ProjectBoard
    {
        return ProjectBoard::query()
            ->where('organization_id', $org->id)
            ->where('id', $boardId)
            ->firstOrFail();
    }

    protected function findCard(ProjectBoard $board, int $cardId): ProjectCard
    {
        return ProjectCard::query()
            ->where('board_id', $board->id)
            ->where('id', $cardId)
            ->firstOrFail();
    }

    // ── Board labels ──────────────────────────────────────────────

    public function storeLabel(Request $request, int $board)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:60'],
            'color' => ['required', 'string', 'max:32'],
        ]);

        ProjectLabel::create([
            'board_id' => $projectBoard->id,
            'name' => $data['name'],
            'color' => $data['color'],
        ]);

        if ($request->filled('card')) {
            $card = $this->findCard($projectBoard, (int) $request->get('card'));

            return $this->backToCard($projectBoard, $card, 'Label created.');
        }

        return back()->with('success', 'Label created.');
    }

    public function updateLabel(Request $request, int $board, int $label)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);

        $projectLabel = ProjectLabel::query()
            ->where('board_id', $projectBoard->id)
            ->where('id', $label)
            ->firstOrFail();

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:60'],
            'color' => ['sometimes', 'required', 'string', 'max:32'],
        ]);

        $projectLabel->update($data);

        return back()->with('success', 'Label updated.');
    }

    public function destroyLabel(Request $request, int $board, int $label)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);

        ProjectLabel::query()
            ->where('board_id', $projectBoard->id)
            ->where('id', $label)
            ->firstOrFail()
            ->delete();

        return back()->with('success', 'Label deleted.');
    }

    // ── Card labels ───────────────────────────────────────────────

    public function syncCardLabels(Request $request, int $board, int $card)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);
        $projectCard = $this->findCard($projectBoard, $card);

        $data = $request->validate([
            'label_ids' => ['array'],
            'label_ids.*' => ['integer'],
        ]);

        $validIds = ProjectLabel::query()
            ->where('board_id', $projectBoard->id)
            ->whereIn('id', $data['label_ids'] ?? [])
            ->pluck('id')
            ->all();

        $projectCard->labels()->sync($validIds);
        $labelNames = ProjectLabel::query()
            ->whereIn('id', $validIds)
            ->pluck('name')
            ->all();
        $this->boards->log($projectBoard, $request->user(), 'card.labels_updated', $projectCard, [
            'labels' => $labelNames,
        ]);

        return $this->backToCard($projectBoard, $projectCard);
    }

    // ── Card members ──────────────────────────────────────────────

    public function syncCardMembers(Request $request, int $board, int $card)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);
        $projectCard = $this->findCard($projectBoard, $card);

        $data = $request->validate([
            'user_ids' => ['array'],
            'user_ids.*' => ['integer'],
        ]);

        $allowed = $this->boards->assignableUsers($org)->pluck('id')->all();
        $validIds = array_values(array_intersect($data['user_ids'] ?? [], $allowed));

        $previousIds = $projectCard->members()->pluck('users.id')->map(fn ($id) => (int) $id)->all();
        $newlyAddedIds = array_values(array_diff($validIds, $previousIds));

        $projectCard->members()->sync($validIds);
        $memberNames = $this->boards->assignableUsers($org)
            ->whereIn('id', $validIds)
            ->pluck('name')
            ->values()
            ->all();
        $this->boards->log($projectBoard, $request->user(), 'card.members_updated', $projectCard, [
            'members' => $memberNames,
        ]);

        $actor = $request->user();
        if ($newlyAddedIds !== [] && $actor instanceof User) {
            app(ProjectCardMemberNotifier::class)->notifyNewlyAssigned(
                $projectBoard,
                $projectCard,
                $actor,
                $newlyAddedIds,
            );
        }

        return $this->backToCard($projectBoard, $projectCard);
    }

    // ── Checklists ────────────────────────────────────────────────

    public function storeChecklist(Request $request, int $board, int $card)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);
        $projectCard = $this->findCard($projectBoard, $card);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:120'],
        ]);

        $position = (int) ProjectChecklist::query()
            ->where('card_id', $projectCard->id)
            ->max('position') + 1;

        ProjectChecklist::create([
            'card_id' => $projectCard->id,
            'title' => $data['title'],
            'position' => $position,
        ]);

        $this->boards->log($projectBoard, $request->user(), 'checklist.created', $projectCard, [
            'title' => $data['title'],
        ]);

        return $this->backToCard($projectBoard, $projectCard);
    }

    public function updateChecklist(Request $request, int $board, int $card, int $checklist)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);
        $projectCard = $this->findCard($projectBoard, $card);

        $cl = ProjectChecklist::query()
            ->where('card_id', $projectCard->id)
            ->where('id', $checklist)
            ->firstOrFail();

        $data = $request->validate([
            'title' => ['required', 'string', 'max:120'],
        ]);

        $cl->update($data);

        $this->boards->log($projectBoard, $request->user(), 'checklist.updated', $projectCard, [
            'title' => $cl->title,
        ]);

        return $this->backToCard($projectBoard, $projectCard);
    }

    public function destroyChecklist(Request $request, int $board, int $card, int $checklist)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);
        $projectCard = $this->findCard($projectBoard, $card);

        $cl = ProjectChecklist::query()
            ->where('card_id', $projectCard->id)
            ->where('id', $checklist)
            ->firstOrFail();
        $title = $cl->title;
        $cl->delete();

        $this->boards->log($projectBoard, $request->user(), 'checklist.deleted', $projectCard, [
            'title' => $title,
        ]);

        return $this->backToCard($projectBoard, $projectCard);
    }

    public function storeChecklistItem(Request $request, int $board, int $card, int $checklist)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);
        $projectCard = $this->findCard($projectBoard, $card);

        $cl = ProjectChecklist::query()
            ->where('card_id', $projectCard->id)
            ->where('id', $checklist)
            ->firstOrFail();

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
        ]);

        $position = (int) ProjectChecklistItem::query()
            ->where('checklist_id', $cl->id)
            ->max('position') + 1;

        ProjectChecklistItem::create([
            'checklist_id' => $cl->id,
            'title' => $data['title'],
            'position' => $position,
        ]);

        $this->boards->log($projectBoard, $request->user(), 'checklist.item_added', $projectCard, [
            'checklist' => $cl->title,
            'title' => $data['title'],
        ]);

        return $this->backToCard($projectBoard, $projectCard);
    }

    public function updateChecklistItem(Request $request, int $board, int $card, int $checklist, int $item)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);
        $projectCard = $this->findCard($projectBoard, $card);

        $cl = ProjectChecklist::query()
            ->where('card_id', $projectCard->id)
            ->where('id', $checklist)
            ->firstOrFail();

        $checklistItem = ProjectChecklistItem::query()
            ->where('checklist_id', $cl->id)
            ->where('id', $item)
            ->firstOrFail();

        $data = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'is_complete' => ['sometimes', 'boolean'],
        ]);

        $wasComplete = (bool) $checklistItem->is_complete;
        $checklistItem->update($data);
        $checklistItem->refresh();

        if (array_key_exists('is_complete', $data) && $wasComplete !== (bool) $checklistItem->is_complete) {
            $this->boards->log(
                $projectBoard,
                $request->user(),
                $checklistItem->is_complete ? 'checklist.item_completed' : 'checklist.item_uncompleted',
                $projectCard,
                [
                    'checklist' => $cl->title,
                    'title' => $checklistItem->title,
                ]
            );
        } elseif (array_key_exists('title', $data)) {
            $this->boards->log($projectBoard, $request->user(), 'checklist.item_updated', $projectCard, [
                'checklist' => $cl->title,
                'title' => $checklistItem->title,
            ]);
        }

        return $this->backToCard($projectBoard, $projectCard);
    }

    public function destroyChecklistItem(Request $request, int $board, int $card, int $checklist, int $item)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);
        $projectCard = $this->findCard($projectBoard, $card);

        $cl = ProjectChecklist::query()
            ->where('card_id', $projectCard->id)
            ->where('id', $checklist)
            ->firstOrFail();

        $checklistItem = ProjectChecklistItem::query()
            ->where('checklist_id', $cl->id)
            ->where('id', $item)
            ->firstOrFail();
        $itemTitle = $checklistItem->title;
        $checklistItem->delete();

        $this->boards->log($projectBoard, $request->user(), 'checklist.item_removed', $projectCard, [
            'checklist' => $cl->title,
            'title' => $itemTitle,
        ]);

        return $this->backToCard($projectBoard, $projectCard);
    }

    // ── Comments ──────────────────────────────────────────────────

    public function storeComment(Request $request, int $board, int $card)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);
        $projectCard = $this->findCard($projectBoard, $card);

        $data = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
            'parent_id' => ['nullable', 'integer'],
        ]);

        $parentId = null;
        if (! empty($data['parent_id'])) {
            $parent = ProjectComment::query()
                ->where('card_id', $projectCard->id)
                ->where('id', $data['parent_id'])
                ->firstOrFail();
            // Replies only nest one level under a root (or under the root of a reply).
            $parentId = $parent->parent_id ?: $parent->id;
        }

        ProjectComment::create([
            'card_id' => $projectCard->id,
            'parent_id' => $parentId,
            'user_id' => $request->user()->id,
            'body' => $data['body'],
        ]);

        $this->boards->log($projectBoard, $request->user(), 'card.commented', $projectCard);

        return $this->backToCard($projectBoard, $projectCard);
    }

    public function updateComment(Request $request, int $board, int $card, int $comment)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);
        $projectCard = $this->findCard($projectBoard, $card);

        $projectComment = ProjectComment::query()
            ->where('card_id', $projectCard->id)
            ->where('id', $comment)
            ->firstOrFail();

        if ($projectComment->user_id !== $request->user()->id && ! $request->user()->can('project.manage')) {
            abort(403);
        }

        $data = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $projectComment->update(['body' => $data['body']]);

        return $this->backToCard($projectBoard, $projectCard);
    }

    public function toggleCommentLike(Request $request, int $board, int $card, int $comment)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);
        $projectCard = $this->findCard($projectBoard, $card);

        $projectComment = ProjectComment::query()
            ->where('card_id', $projectCard->id)
            ->where('id', $comment)
            ->firstOrFail();

        $existing = \App\Models\ProjectCommentLike::query()
            ->where('comment_id', $projectComment->id)
            ->where('user_id', $request->user()->id)
            ->first();

        if ($existing) {
            $existing->delete();
        } else {
            \App\Models\ProjectCommentLike::create([
                'comment_id' => $projectComment->id,
                'user_id' => $request->user()->id,
            ]);
        }

        return $this->backToCard($projectBoard, $projectCard);
    }

    public function destroyComment(Request $request, int $board, int $card, int $comment)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);
        $projectCard = $this->findCard($projectBoard, $card);

        $projectComment = ProjectComment::query()
            ->where('card_id', $projectCard->id)
            ->where('id', $comment)
            ->firstOrFail();

        if ($projectComment->user_id !== $request->user()->id && ! $request->user()->can('project.manage')) {
            abort(403);
        }

        $projectComment->delete();

        return $this->backToCard($projectBoard, $projectCard);
    }

    // ── Attachments ───────────────────────────────────────────────

    public function storeAttachment(Request $request, int $board, int $card)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);
        $projectCard = $this->findCard($projectBoard, $card);

        $request->validate([
            'file' => ['required', 'file', 'max:10240'],
        ]);

        $file = $request->file('file');
        $path = $file->store(
            "project-attachments/{$org->id}/{$projectCard->id}",
            'public'
        );

        ProjectAttachment::create([
            'card_id' => $projectCard->id,
            'user_id' => $request->user()->id,
            'path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime' => $file->getClientMimeType(),
            'size' => $file->getSize() ?: 0,
        ]);

        $this->boards->log($projectBoard, $request->user(), 'card.attachment_added', $projectCard, [
            'name' => $file->getClientOriginalName(),
        ]);

        return $this->backToCard($projectBoard, $projectCard, 'Attachment uploaded.');
    }

    public function destroyAttachment(Request $request, int $board, int $card, int $attachment)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);
        $projectCard = $this->findCard($projectBoard, $card);

        $att = ProjectAttachment::query()
            ->where('card_id', $projectCard->id)
            ->where('id', $attachment)
            ->firstOrFail();

        Storage::disk('public')->delete($att->path);
        $name = $att->original_name;
        $att->delete();

        $this->boards->log($projectBoard, $request->user(), 'card.attachment_removed', $projectCard, [
            'name' => $name,
        ]);

        return $this->backToCard($projectBoard, $projectCard, 'Attachment removed.');
    }
}
