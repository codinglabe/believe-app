<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\ProjectBoard;
use App\Models\ProjectCard;
use App\Models\ProjectList;
use App\Services\Organization\ProjectBoardService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class OrganizationProjectCardController extends Controller
{
    public function __construct(
        protected ProjectBoardService $boards
    ) {}

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

    public function store(Request $request, int $board)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);

        $data = $request->validate([
            'list_id' => ['required', 'integer'],
            'title' => ['required', 'string', 'max:255'],
        ]);

        $list = ProjectList::query()
            ->where('board_id', $projectBoard->id)
            ->where('id', $data['list_id'])
            ->whereNull('archived_at')
            ->firstOrFail();

        $card = ProjectCard::create([
            'board_id' => $projectBoard->id,
            'list_id' => $list->id,
            'created_by' => $request->user()->id,
            'title' => $data['title'],
            'position' => $this->boards->nextCardPosition($list),
        ]);

        $this->boards->log($projectBoard, $request->user(), 'card.created', $card, [
            'title' => $card->title,
            'list_id' => $list->id,
            'list' => $list->name,
        ]);

        return $this->boards->redirectToShow($projectBoard, null, 'Card added.');
    }

    public function show(Request $request, int $board, int $card)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);
        $this->findCard($projectBoard, $card);

        return redirect()->route('org.projects.show', [
            'board' => $projectBoard->id,
            'card' => $card,
            'member' => $request->get('member'),
            'label' => $request->get('label'),
            'due' => $request->get('due'),
        ]);
    }

    public function update(Request $request, int $board, int $card)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);
        $projectCard = $this->findCard($projectBoard, $card);

        $data = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:10000'],
            'due_at' => ['nullable', 'date'],
            'cover_color' => ['nullable', 'string', 'max:32'],
            'clear_due_at' => ['sometimes', 'boolean'],
            'clear_cover_color' => ['sometimes', 'boolean'],
        ]);

        if (! empty($data['clear_due_at'])) {
            $data['due_at'] = null;
        }
        if (! empty($data['clear_cover_color'])) {
            $data['cover_color'] = null;
        }
        unset($data['clear_due_at'], $data['clear_cover_color']);

        $before = [
            'title' => $projectCard->title,
            'description' => $projectCard->description,
            'due_at' => $projectCard->due_at?->toIso8601String(),
            'cover_color' => $projectCard->cover_color,
        ];

        $projectCard->update($data);
        $projectCard->refresh();

        $changes = [];
        if (array_key_exists('title', $data) && $before['title'] !== $projectCard->title) {
            $changes[] = 'title';
        }
        if (array_key_exists('description', $data) && ($before['description'] ?? null) !== ($projectCard->description ?? null)) {
            $changes[] = empty($projectCard->description) ? 'removed the description' : 'updated the description';
        }
        if (array_key_exists('due_at', $data)) {
            $newDue = $projectCard->due_at?->toIso8601String();
            if (($before['due_at'] ?? null) !== $newDue) {
                $changes[] = $projectCard->due_at
                    ? 'set due date to '.$projectCard->due_at->format('M j, Y')
                    : 'removed the due date';
            }
        }
        if (array_key_exists('cover_color', $data) && ($before['cover_color'] ?? null) !== ($projectCard->cover_color ?? null)) {
            $changes[] = $projectCard->cover_color
                ? 'changed the cover'
                : 'removed the cover';
        }

        if ($changes !== []) {
            $this->boards->log($projectBoard, $request->user(), 'card.updated', $projectCard, [
                'title' => $projectCard->title,
                'changes' => $changes,
            ]);
        }

        return $this->boards->redirectToShow($projectBoard, $projectCard);
    }

    public function move(Request $request, int $board, int $card)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);
        $projectCard = $this->findCard($projectBoard, $card);

        $data = $request->validate([
            'list_id' => ['required', 'integer'],
            'position' => ['required', 'integer', 'min:0'],
        ]);

        $this->boards->moveCard(
            $projectCard,
            (int) $data['list_id'],
            (int) $data['position'],
            $request->user()
        );

        return $this->boards->redirectToShow($projectBoard);
    }

    public function archive(Request $request, int $board, int $card)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);
        $projectCard = $this->findCard($projectBoard, $card);

        $projectCard->update(['archived_at' => now()]);
        $this->boards->log($projectBoard, $request->user(), 'card.archived', $projectCard, [
            'title' => $projectCard->title,
        ]);

        return $this->boards->redirectToShow($projectBoard, null, 'Card archived.', true);
    }

    public function restore(Request $request, int $board, int $card)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);
        $projectCard = $this->findCard($projectBoard, $card);

        $list = ProjectList::query()->find($projectCard->list_id);
        $projectCard->update([
            'archived_at' => null,
            'position' => $list ? $this->boards->nextCardPosition($list) : 0,
        ]);
        $this->boards->log($projectBoard, $request->user(), 'card.restored', $projectCard);

        return $this->boards->redirectToShow($projectBoard, $projectCard, 'Card restored.');
    }

    public function destroy(Request $request, int $board, int $card)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);
        $projectCard = $this->findCard($projectBoard, $card);
        $this->boards->deleteCard($projectCard);

        return $this->boards->redirectToShow($projectBoard, null, 'Card deleted.', true);
    }
}
