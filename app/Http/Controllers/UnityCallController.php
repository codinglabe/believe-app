<?php

namespace App\Http\Controllers;

use App\Models\UnityCall;
use App\Services\UnityCallService;
use App\Services\WebRtcIceService;
use App\Support\UnityCallDelivery;
use App\Events\UnityCallWebRTCSignal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class UnityCallController extends Controller
{
    public function store(Request $request, UnityCallService $calls): JsonResponse
    {
        if (! config('unity_call.enabled')) {
            abort(403, 'Unity Call is not available.');
        }

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

    public function incoming(Request $request, UnityCallService $calls): JsonResponse
    {
        $payload = $calls->incomingCallPayloadForUser($request->user());

        return response()->json([
            'incoming' => $payload,
        ]);
    }

    public function active(Request $request, UnityCallService $calls, WebRtcIceService $webrtcIce): JsonResponse
    {
        $session = $calls->restorableCallSessionForUser($request->user());
        if ($session === null) {
            return response()->json(['active' => null]);
        }

        $session['iceServers'] = $webrtcIce->iceServers();

        return response()->json(['active' => $session]);
    }

    public function chatRooms(Request $request, UnityCallService $calls): JsonResponse
    {
        return response()->json([
            'rooms' => $calls->chatRoomsForIncomingListener($request->user()),
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

    public function expireRinging(Request $request, UnityCall $call, UnityCallService $calls): JsonResponse
    {
        $user = $request->user();
        $call->loadMissing(['chatRoom', 'participants']);

        if (! $calls->userCanExpireRinging($call, $user)) {
            return response()->json([
                'call_id' => $call->id,
                'status' => $call->status,
                'participant_status' => 'missed',
            ]);
        }

        $call = $calls->expireCallIfRinging($call, $user);
        $call->loadMissing(['participants']);
        $participant = $call->participantForUser($user->id);

        return response()->json([
            'call_id' => $call->id,
            'status' => $call->status,
            'participant_status' => $participant?->status,
        ]);
    }

    public function markIncomingDelivered(Request $request, int $call, UnityCallService $calls): JsonResponse
    {
        $unityCall = UnityCall::query()->find($call);
        if ($unityCall === null) {
            return response()->json(['ok' => false]);
        }

        $this->authorizeCall($request, $unityCall);
        $calls->markCalleeIncomingDelivered($unityCall, $request->user());

        return response()->json(['ok' => true]);
    }

    public function signal(Request $request, UnityCall $call, UnityCallService $calls): JsonResponse
    {
        $this->authorizeCall($request, $call);

        $validated = $request->validate([
            'type' => ['required', 'string', 'in:offer,answer,ice-candidate,offer-request,incoming-delivered'],
            'from' => ['required', 'string'],
            'to' => ['required', 'string'],
            'offer' => ['nullable', 'array'],
            'answer' => ['nullable', 'array'],
            'candidate' => ['nullable', 'array'],
        ]);

        if ((int) $validated['from'] !== (int) $request->user()->id) {
            abort(403);
        }

        if ($validated['type'] === 'incoming-delivered') {
            $calls->markCalleeIncomingDelivered($call, $request->user());

            return response()->json(['ok' => true]);
        }

        if (! in_array($call->status, [UnityCall::STATUS_RINGING, UnityCall::STATUS_ACCEPTED], true)) {
            return response()->json(['ok' => false], 409);
        }

        $validated = $this->normalizeWebRtcSignal($validated);
        $this->cacheWebRtcSignal($call->id, $validated);
        UnityCallWebRTCSignal::dispatch($call->id, $validated);

        return response()->json(['ok' => true]);
    }

    public function pendingSignals(Request $request, UnityCall $call): JsonResponse
    {
        $this->authorizeCall($request, $call);

        if (! in_array($call->status, [UnityCall::STATUS_RINGING, UnityCall::STATUS_ACCEPTED], true)) {
            return response()->json(['signals' => []]);
        }

        $userId = (string) $request->user()->id;
        $signals = $this->getCachedWebRtcSignals($call->id);
        $forMe = array_values(array_filter(
            $signals,
            fn (array $signal) => (string) ($signal['to'] ?? '') === $userId,
        ));

        $forMe = array_map(fn (array $signal) => $this->normalizeWebRtcSignal($signal), $forMe);

        return response()->json(['signals' => $forMe]);
    }

    public function show(Request $request, UnityCall $call, UnityCallService $calls, WebRtcIceService $webrtcIce): Response
    {
        $user = $request->user();

        if ($request->query('ring') === '1') {
            $call = $calls->prepareCalleeForIncomingRing($call, $user);
        } elseif ((int) $call->caller_id !== (int) $user->id && $call->isActive()) {
            $call = $calls->prepareCalleeForIncomingRing($call, $user);
        }

        if (! $calls->userCanAccess($call, $user)) {
            abort(403);
        }

        $call = $calls->expireCallIfRinging($call, $user);

        if (! $call->isActive()) {
            $chatUrl = route('chat.index');
            if ($call->chat_room_id) {
                $chatUrl .= '?room='.$call->chat_room_id;
            }

            return redirect()->to($chatUrl);
        }

        $call->load(['caller', 'participants.user', 'chatRoom']);
        $participant = $call->participantForUser($user->id);
        $isCaller = (int) $call->caller_id === (int) $user->id;
        $isGroupCall = $call->chatRoom?->type !== 'direct';

        $participantsQuery = $call->participants()->with('user');
        if ($isGroupCall) {
            $participantsQuery->where(function ($query) use ($call, $user) {
                $query->where('status', 'accepted')
                    ->orWhere('user_id', $call->caller_id)
                    ->orWhere('user_id', $user->id);
            });
        }

        $participantRows = $participantsQuery->limit(100)->get();

        return Inertia::render('UnityCall/Show', [
            'call' => [
                'id' => $call->id,
                'status' => $call->status,
                'type' => $call->type,
                'chatRoomId' => $call->chat_room_id,
                'chatRoomName' => $call->chatRoom?->name,
                'chatRoomType' => $call->chatRoom?->type,
                'isGroupCall' => $isGroupCall,
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
            'participants' => $participantRows->map(fn ($p) => [
                'userId' => $p->user_id,
                'name' => trim((string) ($p->user?->name ?? '')) ?: 'Participant',
                'avatar' => $p->user?->avatar_url,
                'role' => $p->role,
                'status' => $p->status,
                'incomingDelivered' => UnityCallDelivery::participantIncomingDelivered($p),
            ])->values(),
            'isCaller' => $isCaller,
            'isGroupCall' => $isGroupCall,
            'participantStatus' => $participant?->status,
            'iceServers' => $webrtcIce->iceServers(),
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
        if (! app(UnityCallService::class)->userCanBroadcastOnCall($request->user(), (int) $call->id)) {
            abort(403);
        }
    }

    /**
     * @param  array<string, mixed>  $signal
     */
    private function cacheWebRtcSignal(int $callId, array $signal): void
    {
        $key = "unity_call:{$callId}:webrtc_signals";
        $signals = Cache::get($key, []);
        if (! is_array($signals)) {
            $signals = [];
        }

        $type = (string) ($signal['type'] ?? '');
        if (in_array($type, ['offer', 'answer', 'offer-request'], true)) {
            $from = (string) ($signal['from'] ?? '');
            $to = (string) ($signal['to'] ?? '');
            $signals = array_values(array_filter(
                $signals,
                fn (array $existing) => ! (
                    (string) ($existing['type'] ?? '') === $type
                    && (string) ($existing['from'] ?? '') === $from
                    && (string) ($existing['to'] ?? '') === $to
                ),
            ));
        }

        $signals[] = $signal;

        if (count($signals) > 80) {
            $signals = array_slice($signals, -80);
        }

        Cache::put($key, $signals, now()->addMinutes(15));
    }

    /**
     * @param  array<string, mixed>  $signal
     * @return array<string, mixed>
     */
    private function normalizeWebRtcSignal(array $signal): array
    {
        foreach (['offer', 'answer'] as $key) {
            if (! isset($signal[$key]['sdp']) || ! is_string($signal[$key]['sdp'])) {
                continue;
            }

            $sdp = $signal[$key]['sdp'];
            $sdp = str_replace(['\\n', '\\r\\n'], "\n", $sdp);
            $sdp = str_replace("\r\n", "\n", $sdp);
            $sdp = str_replace("\r", "\n", $sdp);
            $lines = array_values(array_filter(array_map('trim', explode("\n", $sdp)), fn ($line) => $line !== ''));
            $signal[$key]['sdp'] = implode("\r\n", $lines)."\r\n";
        }

        return $signal;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function getCachedWebRtcSignals(int $callId): array
    {
        $signals = Cache::get("unity_call:{$callId}:webrtc_signals", []);

        return is_array($signals) ? $signals : [];
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
            'serverNow' => now()->toIso8601String(),
            'call' => [
                'id' => $call->id,
                'status' => $call->status,
                'type' => $call->type,
                'chatRoomId' => $call->chat_room_id,
                'chatRoomName' => $call->chatRoom?->name,
                'isGroupCall' => $call->chatRoom?->type !== 'direct',
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
                'incomingDelivered' => UnityCallDelivery::participantIncomingDelivered($p),
            ])->values(),
        ];
    }
}
