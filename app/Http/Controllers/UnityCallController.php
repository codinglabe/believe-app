<?php

namespace App\Http\Controllers;

use App\Models\UnityCall;
use App\Services\UnityCallService;
use App\Events\UnityCallWebRTCSignal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UnityCallController extends Controller
{
    public function store(Request $request, UnityCallService $calls): JsonResponse
    {
        $validated = $request->validate([
            'chat_room_id' => ['required', 'integer', 'exists:chat_rooms,id'],
        ]);

        $call = $calls->initiate($request->user(), (int) $validated['chat_room_id']);

        return response()->json([
            'call_id' => $call->id,
            'status' => $call->status,
            'join_url' => $this->callJoinPath($call),
        ]);
    }

    public function acceptSigned(Request $request, UnityCall $call, int $user, UnityCallService $calls): JsonResponse
    {
        if ((int) $request->user()->id !== $user) {
            abort(403);
        }

        $this->authorizeCall($request, $call);

        $call = $calls->accept($call, $request->user());

        return response()->json($this->acceptResponse($call));
    }

    public function accept(Request $request, UnityCall $call, UnityCallService $calls): JsonResponse
    {
        $this->authorizeCall($request, $call);

        $call = $calls->accept($call, $request->user());

        return response()->json($this->acceptResponse($call));
    }

    public function decline(Request $request, UnityCall $call, UnityCallService $calls): JsonResponse
    {
        $this->authorizeCall($request, $call);

        $call = $calls->decline($call, $request->user());

        return response()->json([
            'call_id' => $call->id,
            'status' => $call->status,
        ]);
    }

    public function declineSigned(Request $request, UnityCall $call, int $user, UnityCallService $calls): JsonResponse
    {
        if ((int) $request->user()->id !== $user) {
            abort(403);
        }

        $this->authorizeCall($request, $call);

        $call = $calls->decline($call, $request->user());

        return response()->json([
            'call_id' => $call->id,
            'status' => $call->status,
        ]);
    }

    public function cancel(Request $request, UnityCall $call, UnityCallService $calls): JsonResponse
    {
        $this->authorizeCall($request, $call);

        $call = $calls->cancel($call, $request->user());

        return response()->json([
            'call_id' => $call->id,
            'status' => $call->status,
        ]);
    }

    public function end(Request $request, UnityCall $call, UnityCallService $calls): JsonResponse
    {
        $this->authorizeCall($request, $call);

        $call = $calls->end($call, $request->user());

        return response()->json([
            'call_id' => $call->id,
            'status' => $call->status,
        ]);
    }

    public function signal(Request $request, UnityCall $call): JsonResponse
    {
        $this->authorizeCall($request, $call);

        $validated = $request->validate([
            'type' => ['required', 'string', 'in:offer,answer,ice-candidate,offer-request'],
            'from' => ['required', 'string'],
            'to' => ['required', 'string'],
            'offer' => ['nullable', 'array'],
            'answer' => ['nullable', 'array'],
            'candidate' => ['nullable', 'array'],
        ]);

        if ((int) $validated['from'] !== (int) $request->user()->id) {
            abort(403);
        }

        if (! in_array($call->status, [UnityCall::STATUS_RINGING, UnityCall::STATUS_ACCEPTED], true)) {
            return response()->json(['ok' => false], 409);
        }

        UnityCallWebRTCSignal::dispatch($call->id, $validated);

        return response()->json(['ok' => true]);
    }

    public function show(Request $request, UnityCall $call, UnityCallService $calls): Response
    {
        $user = $request->user();
        if (! $calls->userCanAccess($call, $user)) {
            abort(403);
        }

        $call->load(['caller', 'participants.user', 'chatRoom']);
        $participant = $call->participantForUser($user->id);
        $isCaller = (int) $call->caller_id === (int) $user->id;

        return Inertia::render('UnityCall/Show', [
            'call' => [
                'id' => $call->id,
                'status' => $call->status,
                'type' => $call->type,
                'chatRoomId' => $call->chat_room_id,
                'chatRoomName' => $call->chatRoom?->name,
                'joinUrl' => $this->callJoinPath($call),
                'ringExpiresAt' => $call->ring_expires_at?->toIso8601String(),
                'answeredAt' => $call->answered_at?->toIso8601String(),
                'endedAt' => $call->ended_at?->toIso8601String(),
            ],
            'caller' => [
                'id' => $call->caller->id,
                'name' => trim((string) $call->caller->name) ?: 'Unknown',
                'avatar' => $call->caller->avatar_url,
            ],
            'participants' => $call->participants->map(fn ($p) => [
                'userId' => $p->user_id,
                'name' => trim((string) ($p->user?->name ?? '')) ?: 'Participant',
                'avatar' => $p->user?->avatar_url,
                'role' => $p->role,
                'status' => $p->status,
            ])->values(),
            'isCaller' => $isCaller,
            'isGroupCall' => $call->chatRoom?->type !== 'direct',
            'participantStatus' => $participant?->status,
            'iceServers' => config('webrtc.ice_servers', []),
            'endCallUrl' => route('unity-calls.end', $call->id),
            'cancelCallUrl' => route('unity-calls.cancel', $call->id),
            'acceptCallUrl' => route('unity-calls.accept', $call->id),
            'chatUrl' => route('chat.index').'?room='.$call->chat_room_id,
            'authUserId' => $user->id,
        ]);
    }

    private function callJoinPath(UnityCall $call): string
    {
        return '/unity-call/'.$call->id;
    }

    private function authorizeCall(Request $request, UnityCall $call): void
    {
        if (! app(UnityCallService::class)->userCanAccess($call, $request->user())) {
            abort(403);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function acceptResponse(UnityCall $call): array
    {
        $call->loadMissing(['caller', 'participants.user', 'chatRoom']);

        return [
            'call_id' => $call->id,
            'status' => $call->status,
            'join_url' => $this->callJoinPath($call),
            'call' => [
                'id' => $call->id,
                'status' => $call->status,
                'type' => $call->type,
                'chatRoomId' => $call->chat_room_id,
                'chatRoomName' => $call->chatRoom?->name,
                'joinUrl' => $this->callJoinPath($call),
                'ringExpiresAt' => $call->ring_expires_at?->toIso8601String(),
                'answeredAt' => $call->answered_at?->toIso8601String(),
                'endedAt' => $call->ended_at?->toIso8601String(),
            ],
            'caller' => [
                'id' => $call->caller->id,
                'name' => trim((string) $call->caller->name) ?: 'Unknown',
                'avatar' => $call->caller->avatar_url,
            ],
            'participants' => $call->participants->map(fn ($p) => [
                'userId' => $p->user_id,
                'name' => trim((string) ($p->user?->name ?? '')) ?: 'Participant',
                'avatar' => $p->user?->avatar_url,
                'role' => $p->role,
                'status' => $p->status,
            ])->values(),
        ];
    }
}
