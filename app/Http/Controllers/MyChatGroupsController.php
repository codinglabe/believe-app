<?php

namespace App\Http\Controllers;

use App\Services\CauseGroupChatService;
use App\Services\UserChatGroupsService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MyChatGroupsController extends Controller
{
    public function __construct(
        private readonly UserChatGroupsService $chatGroupsService,
        private readonly CauseGroupChatService $causeGroupChatService,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $filter = (string) $request->query('filter', 'groups');

        if (! in_array($filter, ['groups', 'direct', 'all'], true)) {
            $filter = 'groups';
        }

        $this->causeGroupChatService->ensureForUser($user);

        $payload = $this->chatGroupsService->listForUser($user, $filter);

        return Inertia::render('chat/MyGroups', [
            'groups' => $payload['rooms'],
            'stats' => $payload['stats'],
            'filter' => $filter,
            'topicsSelectUrl' => $user->role === 'user'
                ? route('user.topics.select')
                : route('profile.edit'),
        ]);
    }
}
