<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\ProjectBoard;
use App\Models\ProjectList;
use App\Services\Organization\ProjectBoardService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class OrganizationProjectListController extends Controller
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

    protected function findList(ProjectBoard $board, int $listId): ProjectList
    {
        return ProjectList::query()
            ->where('board_id', $board->id)
            ->where('id', $listId)
            ->firstOrFail();
    }

    public function store(Request $request, int $board)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
        ]);

        $list = ProjectList::create([
            'board_id' => $projectBoard->id,
            'name' => $data['name'],
            'position' => $this->boards->nextListPosition($projectBoard),
        ]);

        $this->boards->log($projectBoard, $request->user(), 'list.created', null, [
            'name' => $list->name,
            'list_id' => $list->id,
        ]);

        return $this->boards->redirectToShow($projectBoard, null, 'List added.');
    }

    public function update(Request $request, int $board, int $list)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);
        $projectList = $this->findList($projectBoard, $list);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
        ]);

        $projectList->update($data);
        $this->boards->log($projectBoard, $request->user(), 'list.renamed', null, [
            'name' => $projectList->name,
            'list_id' => $projectList->id,
        ]);

        return $this->boards->redirectToShow($projectBoard, null, 'List renamed.');
    }

    public function reorder(Request $request, int $board)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);

        $data = $request->validate([
            'ordered_ids' => ['required', 'array'],
            'ordered_ids.*' => ['integer'],
        ]);

        $this->boards->reorderLists($projectBoard, $data['ordered_ids']);

        return $this->boards->redirectToShow($projectBoard);
    }

    public function archive(Request $request, int $board, int $list)
    {
        $org = $this->resolveOrg();
        $projectBoard = $this->findBoard($org, $board);
        $projectList = $this->findList($projectBoard, $list);

        $projectList->update(['archived_at' => now()]);
        $this->boards->log($projectBoard, $request->user(), 'list.archived', null, [
            'name' => $projectList->name,
            'list_id' => $projectList->id,
        ]);

        return $this->boards->redirectToShow($projectBoard, null, 'List archived.');
    }
}
