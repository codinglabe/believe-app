<?php

namespace App\Services;

use App\Events\UnityCallRoomIncoming;
use App\Events\UnityCallRoomStatus;
use App\Events\UnityCallSessionStatusChanged;
use App\Events\UnityCallStatusChanged;
use App\Models\ChatRoom;
use App\Models\UnityCall;
use App\Models\UnityCallParticipant;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

class UnityCallNotifier
{
    public function __construct(
        private readonly FirebaseService $firebaseService,
    ) {}

    public function notifyIncoming(UnityCall $call, User $caller, User $callee): void
    {
        $call->loadMissing(['chatRoom', 'livestream']);
        $callerName = trim((string) $caller->name) ?: 'Someone';
        $joinPath = '/unity-call/'.$call->id;
        $joinUrl = url($joinPath);
        $isGroupCall = $call->chatRoom?->type !== 'direct';
        // Include caller + group hints so cold start after notification tap can rebuild the overlay.
        $ringUrl = $joinPath.'?'.http_build_query([
            'ring' => '1',
            'caller_id' => (string) $caller->id,
            'caller_name' => Str::limit($callerName, 48, ''),
            'chat_room_id' => $call->chat_room_id ? (string) $call->chat_room_id : '',
            'chat_room_name' => $isGroupCall ? Str::limit((string) ($call->chatRoom?->name ?? ''), 64, '') : '',
            'is_group_call' => $isGroupCall ? '1' : '0',
        ], '', '&', PHP_QUERY_RFC3986);
        $expiresAt = $call->ring_expires_at ?? now()->addMinutes(2);
        $declineUrl = URL::temporarySignedRoute(
            'unity-calls.decline-signed',
            $expiresAt,
            ['call' => $call->id, 'user' => $callee->id],
        );
        $acceptUrl = URL::temporarySignedRoute(
            'unity-calls.accept-signed',
            $expiresAt,
            ['call' => $call->id, 'user' => $callee->id],
        );
        $title = $isGroupCall
            ? (trim((string) ($call->chatRoom?->name ?? '')) ?: 'Group audio call')
            : 'Incoming audio call';
        $body = $isGroupCall
            ? "{$callerName} is calling"
            : "{$callerName} is calling you";

        $pushData = $this->firebaseService->stringifyFcmData([
            'type' => 'incoming_call',
            'title' => $title,
            'body' => $body,
            'call_id' => (string) $call->id,
            'caller_id' => (string) $caller->id,
            'caller_name' => $callerName,
            'caller_avatar' => (string) ($caller->avatar_url ?? ''),
            'chat_room_id' => $call->chat_room_id ? (string) $call->chat_room_id : '',
            'chat_room_name' => (string) ($call->chatRoom?->name ?? ''),
            'is_group_call' => $isGroupCall ? '1' : '0',
            'join_url' => $joinUrl,
            'ring_url' => $ringUrl,
            'accept_url' => $acceptUrl,
            'decline_url' => $declineUrl,
            'url' => $ringUrl,
            'click_action' => $ringUrl,
            'source_type' => 'unity_call',
            'source_id' => (string) $call->id,
            'module_name' => 'unity_call',
            'module_record_id' => $call->id,
            'created_by' => $caller->id,
            'deep_link' => parse_url($joinUrl, PHP_URL_PATH) ?: $joinUrl,
        ]);

        try {
            $this->firebaseService->sendToUser($callee->id, $title, $body, $pushData);
        } catch (\Throwable $e) {
            Log::warning('unity_call.incoming_push_failed', [
                'call_id' => $call->id,
                'callee_id' => $callee->id,
                'error' => $e->getMessage(),
            ]);
        }

        $this->broadcastStatus($callee->id, $this->payloadForUser($call, $caller, 'incoming'));
    }

    public function broadcastRoomIncoming(UnityCall $call, User $caller, ChatRoom $room): void
    {
        $call->loadMissing(['chatRoom', 'participants.user']);
        $payload = $this->payloadForUser($call, $caller, 'incoming');
        UnityCallRoomIncoming::dispatch($room, $payload);
    }

    public function broadcastRoomStatus(UnityCall $call, User $caller, string $reason): void
    {
        $call->loadMissing(['chatRoom', 'participants.user']);
        if (! $call->chatRoom) {
            return;
        }

        $payload = $this->payloadForUser($call, $caller, $reason);
        UnityCallRoomStatus::dispatch($call->chatRoom, $payload);
    }

    public function broadcastSessionStatus(UnityCall $call, User $caller, string $reason): void
    {
        $call->loadMissing(['participants.user', 'chatRoom']);
        $payload = $this->payloadForUser($call, $caller, $reason);
        UnityCallSessionStatusChanged::dispatch($call->id, $payload);
    }

    public function broadcastStatus(int $userId, array $payload): void
    {
        UnityCallStatusChanged::dispatch($userId, $payload);
    }

    /**
     * @return array<string, mixed>
     */
    public function payloadForUser(UnityCall $call, User $caller, string $reason): array
    {
        $call->loadMissing(['participants.user', 'chatRoom', 'livestream']);

        $participants = $call->participants
            ->filter(function ($p) use ($call, $reason) {
                if ($call->chatRoom?->type === 'direct') {
                    return true;
                }

                if (in_array($reason, ['accepted', 'incoming', 'participant_declined', 'participant_left'], true)) {
                    if ($p->role === UnityCallParticipant::ROLE_CALLER) {
                        return true;
                    }

                    $liveStatuses = [
                        UnityCallParticipant::STATUS_ACCEPTED,
                        UnityCallParticipant::STATUS_RINGING,
                    ];

                    if (in_array($reason, ['participant_declined', 'participant_left'], true)) {
                        $liveStatuses[] = UnityCallParticipant::STATUS_DECLINED;
                        $liveStatuses[] = UnityCallParticipant::STATUS_LEFT;
                        $liveStatuses[] = UnityCallParticipant::STATUS_MISSED;
                    }

                    return in_array($p->status, $liveStatuses, true);
                }

                return $p->status === UnityCallParticipant::STATUS_ACCEPTED
                    || $p->role === UnityCallParticipant::ROLE_CALLER;
            })
            ->take(100)
            ->values();

        return [
            'reason' => $reason,
            'call' => [
                'id' => $call->id,
                'status' => $call->status,
                'type' => $call->type,
                'chatRoomId' => $call->chat_room_id,
                'chatRoomName' => $call->chatRoom?->name,
                'chatRoomType' => $call->chatRoom?->type,
                'isGroupCall' => $call->chatRoom?->type !== 'direct',
                'joinUrl' => '/unity-call/'.$call->id,
                'ringExpiresAt' => $call->ring_expires_at?->toIso8601String(),
                'answeredAt' => $call->answered_at?->toIso8601String(),
                'endedAt' => $call->ended_at?->toIso8601String(),
            ],
            'caller' => [
                'id' => $caller->id,
                'name' => trim((string) $caller->name) ?: 'Unknown',
                'avatar' => $caller->avatar_url ?? null,
            ],
            'participants' => $participants->map(fn ($p) => [
                'userId' => $p->user_id,
                'name' => trim((string) ($p->user?->name ?? '')) ?: 'Participant',
                'avatar' => $p->user?->avatar_url,
                'role' => $p->role,
                'status' => $p->status,
            ])->values()->all(),
        ];
    }
}
