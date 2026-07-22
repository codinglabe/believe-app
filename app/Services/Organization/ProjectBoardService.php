<?php

namespace App\Services\Organization;

use App\Models\Organization;
use App\Models\ProjectActivity;
use App\Models\ProjectAttachment;
use App\Models\ProjectBoard;
use App\Models\ProjectCard;
use App\Models\ProjectList;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ProjectBoardService
{
    public const DEFAULT_LISTS = ['To Do', 'Doing', 'Done'];

    public const BACKGROUNDS = [
        'purple-blue',
        'blue-indigo',
        'slate',
        'rose',
        'emerald',
        'amber',
    ];

    public function createBoard(Organization $org, User $user, array $data): ProjectBoard
    {
        return DB::transaction(function () use ($org, $user, $data) {
            $board = ProjectBoard::create([
                'organization_id' => $org->id,
                'created_by' => $user->id,
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'background' => $data['background'] ?? 'purple-blue',
            ]);

            foreach (self::DEFAULT_LISTS as $index => $listName) {
                ProjectList::create([
                    'board_id' => $board->id,
                    'name' => $listName,
                    'position' => $index,
                ]);
            }

            $this->log($board, $user, 'board.created', null, ['name' => $board->name]);

            return $board->fresh(['lists']);
        });
    }

    /**
     * Assignable users: org owner + board members with linked users.
     *
     * @return Collection<int, array{id: int, name: string, email: string, avatar: string|null}>
     */
    public function assignableUsers(Organization $org): Collection
    {
        $users = collect();

        if ($org->user_id) {
            $owner = User::query()->find($org->user_id);
            if ($owner) {
                $users->push($owner);
            }
        }

        $org->loadMissing(['boardMembers.user']);
        foreach ($org->boardMembers as $member) {
            if ($member->user) {
                $users->push($member->user);
            }
        }

        return $users
            ->unique('id')
            ->values()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'avatar' => $u->avatar ?? $u->profile_photo_url ?? null,
            ]);
    }

    public function isAssignableUser(Organization $org, int $userId): bool
    {
        return $this->assignableUsers($org)->contains('id', $userId);
    }

    public function reorderLists(ProjectBoard $board, array $orderedIds): void
    {
        foreach ($orderedIds as $position => $listId) {
            ProjectList::query()
                ->where('board_id', $board->id)
                ->where('id', $listId)
                ->update(['position' => $position]);
        }
    }

    /**
     * Move a card to a list at a given index; reindex both source and target lists.
     */
    public function moveCard(ProjectCard $card, int $targetListId, int $position, User $user): ProjectCard
    {
        return DB::transaction(function () use ($card, $targetListId, $position, $user) {
            $sourceListId = $card->list_id;
            $boardId = $card->board_id;

            $targetList = ProjectList::query()
                ->where('board_id', $boardId)
                ->where('id', $targetListId)
                ->firstOrFail();

            $card->list_id = $targetList->id;
            $card->save();

            $this->reindexListCards($targetListId, $card->id, $position);

            if ($sourceListId !== $targetListId) {
                $this->reindexListCards($sourceListId);
            }

            // Only log list changes (not same-list reorders) — Trello-style.
            if ($sourceListId !== $targetListId) {
                $fromList = ProjectList::query()->find($sourceListId);
                $this->log(
                    $card->board,
                    $user,
                    'card.moved',
                    $card,
                    [
                        'title' => $card->title,
                        'from_list_id' => $sourceListId,
                        'to_list_id' => $targetListId,
                        'list_id' => $targetListId,
                        'from_list' => $fromList?->name,
                        'to_list' => $targetList->name,
                    ]
                );
            }

            return $card->fresh([
                'labels',
                'members:id,name,email',
                'checklists.items',
            ]);
        });
    }

    /**
     * Reindex cards in a list. If $insertCardId is set, place that card at $insertPosition.
     */
    public function reindexListCards(int $listId, ?int $insertCardId = null, ?int $insertPosition = null): void
    {
        $cards = ProjectCard::query()
            ->where('list_id', $listId)
            ->whereNull('archived_at')
            ->orderBy('position')
            ->get();

        if ($insertCardId !== null && $insertPosition !== null) {
            $moving = $cards->firstWhere('id', $insertCardId);
            if ($moving) {
                $others = $cards->reject(fn ($c) => $c->id === $insertCardId)->values();
                $insertPosition = max(0, min($insertPosition, $others->count()));
                $others->splice($insertPosition, 0, [$moving]);
                $cards = $others;
            }
        }

        foreach ($cards->values() as $index => $card) {
            if ($card) {
                ProjectCard::query()->where('id', $card->id)->update(['position' => $index]);
            }
        }
    }

    public function nextListPosition(ProjectBoard $board): int
    {
        return (int) ProjectList::query()
            ->where('board_id', $board->id)
            ->whereNull('archived_at')
            ->max('position') + 1;
    }

    public function nextCardPosition(ProjectList $list): int
    {
        return (int) ProjectCard::query()
            ->where('list_id', $list->id)
            ->whereNull('archived_at')
            ->max('position') + 1;
    }

    public function log(
        ProjectBoard $board,
        ?User $user,
        string $action,
        ?ProjectCard $card = null,
        ?array $meta = null
    ): ProjectActivity {
        return ProjectActivity::create([
            'board_id' => $board->id,
            'card_id' => $card?->id,
            'user_id' => $user?->id,
            'action' => $action,
            'meta' => $meta,
        ]);
    }

    /**
     * Delete stored attachment files for the given card IDs, then remove their folders.
     *
     * @param  list<int>|Collection<int, int>  $cardIds
     */
    public function deleteAttachmentFilesForCards(int $organizationId, iterable $cardIds): void
    {
        $ids = collect($cardIds)->map(fn ($id) => (int) $id)->filter()->unique()->values();
        if ($ids->isEmpty()) {
            return;
        }

        $paths = ProjectAttachment::query()
            ->whereIn('card_id', $ids)
            ->pluck('path')
            ->filter()
            ->values()
            ->all();

        if ($paths !== []) {
            Storage::disk('public')->delete($paths);
        }

        foreach ($ids as $cardId) {
            Storage::disk('public')->deleteDirectory("project-attachments/{$organizationId}/{$cardId}");
        }
    }

    /** Permanently delete a board and all attachment files on disk. */
    public function deleteBoard(ProjectBoard $board): void
    {
        $orgId = (int) $board->organization_id;
        $cardIds = ProjectCard::query()
            ->where('board_id', $board->id)
            ->pluck('id');

        $this->deleteAttachmentFilesForCards($orgId, $cardIds);
        $board->delete();
    }

    /** Permanently delete a card and its attachment files on disk. */
    public function deleteCard(ProjectCard $card): void
    {
        $orgId = (int) ProjectBoard::query()
            ->where('id', $card->board_id)
            ->value('organization_id');

        $this->deleteAttachmentFilesForCards($orgId, [$card->id]);
        $card->delete();
    }

    /**
     * Redirect back to the board show page with optional open card.
     * Always lands on org.projects.show with ?card= when a card is open so
     * Inertia partial reloads refresh activeCard + board (unlike bare back()).
     */
    public function redirectToShow(
        ProjectBoard $board,
        ?ProjectCard $card = null,
        ?string $success = null,
        bool $closeCard = false
    ): RedirectResponse {
        $params = ['board' => $board->id];
        $prev = [];

        $previous = url()->previous();
        $parts = parse_url($previous) ?: [];
        if (! empty($parts['query'])) {
            parse_str($parts['query'], $prev);
            foreach (['member', 'label', 'due'] as $key) {
                if (! empty($prev[$key])) {
                    $params[$key] = $prev[$key];
                }
            }
        }

        if ($closeCard) {
            // omit card — closes the modal
        } elseif ($card) {
            $params['card'] = $card->id;
        } elseif (! empty($prev['card'])) {
            $params['card'] = $prev['card'];
        }

        $response = redirect()->route('org.projects.show', $params);

        return $success ? $response->with('success', $success) : $response;
    }

    /**
     * Serialize board for Kanban show page with optional filters.
     *
     * @param  array{member?: int|null, label?: int|null, due?: string|null}  $filters
     */
    public function serializeBoard(ProjectBoard $board, array $filters = []): array
    {
        $board->load([
            'labels',
            'lists' => fn ($q) => $q->whereNull('archived_at')->orderBy('position'),
            'lists.cards' => fn ($q) => $q->whereNull('archived_at')->orderBy('position')
                ->withCount(['comments', 'attachments']),
            'lists.cards.labels',
            'lists.cards.members:id,name,email',
            'lists.cards.checklists.items',
        ]);

        $memberFilter = isset($filters['member']) && $filters['member'] !== '' && $filters['member'] !== null
            ? (int) $filters['member']
            : null;
        $labelFilter = isset($filters['label']) && $filters['label'] !== '' && $filters['label'] !== null
            ? (int) $filters['label']
            : null;
        $dueFilter = $filters['due'] ?? null;

        $lists = $board->lists->map(function (ProjectList $list) use ($memberFilter, $labelFilter, $dueFilter) {
            $cards = $list->cards->filter(function (ProjectCard $card) use ($memberFilter, $labelFilter, $dueFilter) {
                if ($memberFilter && ! $card->members->contains('id', $memberFilter)) {
                    return false;
                }
                if ($labelFilter && ! $card->labels->contains('id', $labelFilter)) {
                    return false;
                }
                if ($dueFilter === 'overdue' && ! $card->isOverdue()) {
                    return false;
                }
                if ($dueFilter === 'week') {
                    if (! $card->due_at || $card->due_at->isPast() || $card->due_at->gt(now()->addDays(7))) {
                        return false;
                    }
                }
                if ($dueFilter === 'none' && $card->due_at !== null) {
                    return false;
                }

                return true;
            })->values();

            return [
                'id' => $list->id,
                'name' => $list->name,
                'position' => $list->position,
                'cards' => $cards->map(fn (ProjectCard $card) => $this->serializeCardSummary($card))->all(),
            ];
        })->all();

        return [
            'id' => $board->id,
            'name' => $board->name,
            'description' => $board->description,
            'background' => $board->background,
            'is_starred' => $board->is_starred,
            'archived_at' => $board->archived_at?->toIso8601String(),
            'labels' => $board->labels->map(fn ($l) => [
                'id' => $l->id,
                'name' => $l->name,
                'color' => $l->color,
            ])->all(),
            'lists' => $lists,
        ];
    }

    public function serializeCardSummary(ProjectCard $card): array
    {
        $checklistItems = $card->checklists->flatMap->items;
        $complete = $checklistItems->where('is_complete', true)->count();
        $total = $checklistItems->count();

        return [
            'id' => $card->id,
            'list_id' => $card->list_id,
            'board_id' => $card->board_id,
            'title' => $card->title,
            'description' => $card->description,
            'position' => $card->position,
            'due_at' => $card->due_at?->toIso8601String(),
            'is_overdue' => $card->isOverdue(),
            'cover_color' => $card->cover_color,
            'labels' => $card->labels->map(fn ($l) => [
                'id' => $l->id,
                'name' => $l->name,
                'color' => $l->color,
            ])->all(),
            'members' => $card->members->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
            ])->all(),
            'checklist_progress' => [
                'complete' => $complete,
                'total' => $total,
            ],
            'comment_count' => (int) ($card->comments_count ?? 0),
            'attachment_count' => (int) ($card->attachments_count ?? 0),
        ];
    }

    public function serializeCardDetail(ProjectCard $card): array
    {
        $card->load([
            'labels',
            'members:id,name,email',
            'checklists.items',
            'rootComments.user:id,name,email',
            'rootComments.likes',
            'rootComments.replies.user:id,name,email',
            'rootComments.replies.likes',
            'attachments.user:id,name,email',
            'activities' => fn ($q) => $q->latest()->limit(50)->with('user:id,name'),
            'list:id,name',
        ]);

        $summary = $this->serializeCardSummary($card);
        $userId = auth()->id();

        $serializeComment = function ($c) use ($userId, &$serializeComment) {
            return [
                'id' => $c->id,
                'parent_id' => $c->parent_id,
                'body' => $c->body,
                'created_at' => $c->created_at?->toIso8601String(),
                'likes_count' => $c->relationLoaded('likes') ? $c->likes->count() : $c->likes()->count(),
                'liked_by_me' => $userId
                    ? ($c->relationLoaded('likes')
                        ? $c->likes->contains('user_id', $userId)
                        : $c->likes()->where('user_id', $userId)->exists())
                    : false,
                'user' => $c->user ? [
                    'id' => $c->user->id,
                    'name' => $c->user->name,
                    'email' => $c->user->email,
                ] : null,
                'replies' => $c->relationLoaded('replies')
                    ? $c->replies->map(fn ($r) => $serializeComment($r))->all()
                    : [],
            ];
        };

        return array_merge($summary, [
            'list_name' => $card->list?->name,
            'checklists' => $card->checklists->map(fn ($cl) => [
                'id' => $cl->id,
                'title' => $cl->title,
                'position' => $cl->position,
                'items' => $cl->items->map(fn ($item) => [
                    'id' => $item->id,
                    'title' => $item->title,
                    'is_complete' => $item->is_complete,
                    'position' => $item->position,
                ])->all(),
            ])->all(),
            'comments' => $card->rootComments->map(fn ($c) => $serializeComment($c))->all(),
            'attachments' => $card->attachments->map(fn ($a) => [
                'id' => $a->id,
                'original_name' => $a->original_name,
                'mime' => $a->mime,
                'size' => $a->size,
                'url' => $a->url(),
                'created_at' => $a->created_at?->toIso8601String(),
                'user' => $a->user ? [
                    'id' => $a->user->id,
                    'name' => $a->user->name,
                ] : null,
            ])->all(),
            'activities' => (function () use ($card) {
                $listNameById = ProjectList::query()
                    ->where('board_id', $card->board_id)
                    ->pluck('name', 'id');

                return $card->activities->map(function ($act) use ($listNameById) {
                    $meta = is_array($act->meta) ? $act->meta : [];

                    if (in_array($act->action, ['card.moved', 'card.created'], true)) {
                        if (empty($meta['from_list']) && ! empty($meta['from_list_id'])) {
                            $meta['from_list'] = $listNameById[(int) $meta['from_list_id']] ?? null;
                        }
                        $toId = $meta['to_list_id'] ?? $meta['list_id'] ?? null;
                        if (empty($meta['to_list']) && $toId) {
                            $meta['to_list'] = $listNameById[(int) $toId] ?? null;
                        }
                        if (empty($meta['list']) && ! empty($meta['list_id'])) {
                            $meta['list'] = $listNameById[(int) $meta['list_id']] ?? null;
                        }
                    }

                    return [
                        'id' => $act->id,
                        'action' => $act->action,
                        'meta' => $meta,
                        'created_at' => $act->created_at?->toIso8601String(),
                        'user' => $act->user ? [
                            'id' => $act->user->id,
                            'name' => $act->user->name,
                        ] : null,
                    ];
                })->all();
            })(),
        ]);
    }
}
