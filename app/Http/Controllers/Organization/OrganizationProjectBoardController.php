<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\ProjectBoard;
use App\Services\Organization\ProjectBoardService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class OrganizationProjectBoardController extends Controller
{
    public function __construct(
        protected ProjectBoardService $boards
    ) {}

    protected function resolveOrg(): Organization
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        if (! $user) {
            abort(403, 'Unauthenticated.');
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

    public function index(Request $request)
    {
        $org = $this->resolveOrg();
        $view = $request->get('view', 'active');

        $query = ProjectBoard::query()
            ->where('organization_id', $org->id)
            ->withCount([
                'lists as lists_count' => fn ($q) => $q->whereNull('archived_at'),
                'cards as cards_count' => fn ($q) => $q->whereNull('archived_at'),
            ]);

        if ($view === 'archived') {
            $query->archived();
        } else {
            $query->active();
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', '%'.$request->search.'%');
        }

        $boards = $query
            ->orderByDesc('is_starred')
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (ProjectBoard $b) => [
                'id' => $b->id,
                'name' => $b->name,
                'description' => $b->description,
                'background' => $b->background,
                'is_starred' => $b->is_starred,
                'archived_at' => $b->archived_at?->toIso8601String(),
                'lists_count' => $b->lists_count,
                'cards_count' => $b->cards_count,
                'updated_at' => $b->updated_at?->toIso8601String(),
            ]);

        return Inertia::render('Organization/Projects/Index', [
            'boards' => $boards,
            'organization' => ['id' => $org->id, 'name' => $org->name],
            'filters' => [
                'view' => $view,
                'search' => $request->get('search', ''),
            ],
            'backgrounds' => ProjectBoardService::BACKGROUNDS,
            'can' => [
                'create' => $request->user()->can('project.create'),
                'update' => $request->user()->can('project.update'),
                'delete' => $request->user()->can('project.delete'),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $org = $this->resolveOrg();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:2000'],
            'background' => ['nullable', 'string', 'in:'.implode(',', ProjectBoardService::BACKGROUNDS)],
        ]);

        $board = $this->boards->createBoard($org, $request->user(), $data);

        // Render Show in the same Inertia response (no redirect/GET round-trip).
        return Inertia::render('Organization/Projects/Show', $this->boardShowProps($request, $org, $board))
            ->with('success', 'Board created.');
    }

    public function show(Request $request, int $board)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);

        return Inertia::render('Organization/Projects/Show', $this->boardShowProps($request, $org, $projectBoard));
    }

    /**
     * @return array<string, mixed>
     */
    protected function boardShowProps(Request $request, Organization $org, ProjectBoard $projectBoard): array
    {
        $filters = [
            'member' => $request->get('member'),
            'label' => $request->get('label'),
            'due' => $request->get('due'),
        ];

        $activeCard = null;
        if ($request->filled('card')) {
            $card = \App\Models\ProjectCard::query()
                ->where('board_id', $projectBoard->id)
                ->where('id', (int) $request->get('card'))
                ->first();
            if ($card) {
                $activeCard = $this->boards->serializeCardDetail($card);
            }
        }

        return [
            'board' => $this->boards->serializeBoard($projectBoard, $filters),
            'organization' => ['id' => $org->id, 'name' => $org->name],
            'assignableUsers' => $this->boards->assignableUsers($org)->all(),
            'filters' => $filters,
            'backgrounds' => ProjectBoardService::BACKGROUNDS,
            'activeCard' => $activeCard,
            'can' => [
                'create' => $request->user()->can('project.create'),
                'update' => $request->user()->can('project.update'),
                'delete' => $request->user()->can('project.delete'),
            ],
        ];
    }

    public function update(Request $request, int $board)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:2000'],
            'background' => ['nullable', 'string', 'in:'.implode(',', ProjectBoardService::BACKGROUNDS)],
        ]);

        $projectBoard->update($data);
        $this->boards->log($projectBoard, $request->user(), 'board.updated', null, $data);

        return $this->boards->redirectToShow($projectBoard, null, 'Board updated.');
    }

    public function toggleStar(Request $request, int $board)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);
        $projectBoard->update(['is_starred' => ! $projectBoard->is_starred]);

        return $this->boards->redirectToShow($projectBoard);
    }

    public function archive(Request $request, int $board)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);
        $projectBoard->update(['archived_at' => now()]);
        $this->boards->log($projectBoard, $request->user(), 'board.archived');

        return redirect()
            ->route('org.projects.index')
            ->with('success', 'Board archived.');
    }

    public function restore(Request $request, int $board)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);
        $projectBoard->update(['archived_at' => null]);
        $this->boards->log($projectBoard, $request->user(), 'board.restored');

        return back()->with('success', 'Board restored.');
    }

    public function destroy(Request $request, int $board)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);
        $this->boards->deleteBoard($projectBoard);

        return redirect()
            ->route('org.projects.index')
            ->with('success', 'Board deleted.');
    }
}
