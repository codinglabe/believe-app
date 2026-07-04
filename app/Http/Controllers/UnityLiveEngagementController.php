<?php

namespace App\Http\Controllers;

use App\Events\UnityLiveChatMessageSent;
use App\Models\OrganizationLivestream;
use App\Models\UserLivestream;
use App\Services\ParticipationActivityService;
use App\Support\BrpParticipationModule;
use App\Support\UnityLiveBroadcast;
use App\Support\UnityLiveChat;
use App\Support\UnityLiveStreamResolver;
use App\Support\UnityLiveViewerPresence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class UnityLiveEngagementController extends Controller
{
    public function viewerJoin(Request $request, string $slug): JsonResponse
    {
        $validated = $request->validate([
            'sessionId' => ['required', 'string', 'max:64'],
        ]);

        [$kind, $livestream] = $this->resolveWatchableLivestream($slug);
        $authUser = $request->user();

        UnityLiveViewerPresence::join($kind, $livestream->id, [
            'sessionId' => $validated['sessionId'],
            'userId' => $authUser?->id,
            'name' => $authUser?->name,
        ]);

        return response()->json([
            'ok' => true,
            'viewerCount' => UnityLiveViewerPresence::count($kind, $livestream->id),
        ]);
    }

    public function viewerHeartbeat(Request $request, string $slug): JsonResponse
    {
        $validated = $request->validate([
            'sessionId' => ['required', 'string', 'max:64'],
        ]);

        [$kind, $livestream] = $this->resolveWatchableLivestream($slug);

        UnityLiveViewerPresence::heartbeat($kind, $livestream->id, $validated['sessionId']);

        return response()->json([
            'ok' => true,
            'viewerCount' => UnityLiveViewerPresence::count($kind, $livestream->id),
        ]);
    }

    public function viewerLeave(Request $request, string $slug): JsonResponse
    {
        $validated = $request->validate([
            'sessionId' => ['required', 'string', 'max:64'],
        ]);

        [$kind, $livestream] = $this->resolveLivestream($slug);

        UnityLiveViewerPresence::leave($kind, $livestream->id, $validated['sessionId']);

        if ($authUser = $request->user()) {
            ParticipationActivityService::complete(
                $authUser,
                BrpParticipationModule::UNITY_LIVE,
                $livestream->id,
                'Participation reward for Unity Live participation',
                [
                    'livestream_id' => $livestream->id,
                    'slug' => $slug,
                    'kind' => $kind,
                ],
                referenceType: $kind,
            );
        }

        return response()->json([
            'ok' => true,
            'viewerCount' => UnityLiveViewerPresence::count($kind, $livestream->id),
        ]);
    }

    public function stats(string $slug): JsonResponse
    {
        [$kind, $livestream] = $this->resolveLivestream($slug);

        return response()->json([
            'viewerCount' => UnityLiveViewerPresence::count($kind, $livestream->id),
            'chatCount' => count(UnityLiveChat::messages($kind, $livestream->id, 120)),
        ]);
    }

    public function chatIndex(Request $request, string $slug): JsonResponse
    {
        [$kind, $livestream] = $this->resolveLivestream($slug);

        $afterId = trim((string) $request->query('after_id', ''));
        $since = trim((string) $request->query('since', ''));

        if ($afterId !== '') {
            $messages = UnityLiveChat::messagesAfter($kind, $livestream->id, $afterId);
        } elseif ($since !== '') {
            $messages = UnityLiveChat::messagesSince($kind, $livestream->id, $since);
        } else {
            $messages = UnityLiveChat::messages($kind, $livestream->id);
        }

        return response()->json([
            'messages' => $messages,
            'viewerCount' => UnityLiveViewerPresence::count($kind, $livestream->id),
            'broadcastChannel' => UnityLiveBroadcast::channelName($livestream),
        ]);
    }

    public function chatStore(Request $request, string $slug): JsonResponse
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'min:1', 'max:500'],
            'displayName' => ['nullable', 'string', 'max:80'],
        ]);

        [$kind, $livestream] = $this->resolveWatchableLivestream($slug);
        $authUser = $request->user();

        $name = trim((string) ($validated['displayName'] ?? ''));
        if ($name === '' && $authUser?->name) {
            $name = (string) $authUser->name;
        }
        if ($name === '') {
            $name = 'Guest';
        }

        $message = trim($validated['message']);
        if ($message === '') {
            throw ValidationException::withMessages(['message' => 'Message cannot be empty.']);
        }

        $avatarUrl = $authUser?->avatar_url ?? null;

        $entry = UnityLiveChat::add(
            $kind,
            $livestream->id,
            $name,
            $message,
            $authUser?->id,
            is_string($avatarUrl) && $avatarUrl !== '' ? $avatarUrl : null,
        );

        $channelName = UnityLiveBroadcast::channelName($livestream);

        try {
            event(new UnityLiveChatMessageSent(
                channelName: $channelName,
                message: $entry,
            ));
        } catch (\Throwable $e) {
            Log::warning('Unity Live chat broadcast failed', [
                'livestream_id' => $livestream->id,
                'kind' => $kind,
                'channel' => $channelName,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'ok' => true,
            'message' => $entry,
            'broadcastChannel' => $channelName,
            'viewerCount' => UnityLiveViewerPresence::count($kind, $livestream->id),
        ]);
    }

    /**
     * @return array{0: 'user'|'organization', 1: UserLivestream|OrganizationLivestream}
     */
    private function resolveLivestream(string $slug): array
    {
        return UnityLiveStreamResolver::resolve($slug);
    }

    /**
     * @return array{0: 'user'|'organization', 1: UserLivestream|OrganizationLivestream}
     */
    private function resolveWatchableLivestream(string $slug): array
    {
        return UnityLiveStreamResolver::resolveWatchable($slug);
    }
}
