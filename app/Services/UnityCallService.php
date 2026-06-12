<?php

namespace App\Services;

use App\Jobs\NotifyUnityCallRoomMembersJob;
use App\Models\ChatRoom;
use App\Models\UnityCall;
use App\Models\UnityCallParticipant;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class UnityCallService
{
    private const RING_SECONDS = 60;

    private const MAX_HOST_AUDIO_PEERS = 32;

    public function __construct(
        private readonly UnityCallNotifier $notifier,
        private readonly UnityCallChatMessageService $chatMessages,
    ) {}

    public function initiate(User $caller, int $chatRoomId): UnityCall
    {
        $chatRoom = ChatRoom::query()->findOrFail($chatRoomId);
        $isDirect = $chatRoom->type === 'direct';

        if (! $chatRoom->members()->where('users.id', $caller->id)->exists()) {
            throw ValidationException::withMessages([
                'chat_room_id' => __('You are not a member of this chat.'),
            ]);
        }

        $this->releaseActiveCallsForUser($caller->id);

        if ($isDirect) {
            $callee = $chatRoom->members()->where('users.id', '!=', $caller->id)->first();
            if (! $callee) {
                throw ValidationException::withMessages([
                    'chat_room_id' => __('No one else is in this chat to call.'),
                ]);
            }

            if ($this->userIsBusyOnCall($callee->id)) {
                throw ValidationException::withMessages([
                    'chat_room_id' => __(':name is already on another call. Try again in a moment.', [
                        'name' => $callee->name,
                    ]),
                ]);
            }
        } elseif (! $chatRoom->members()->where('users.id', '!=', $caller->id)->exists()) {
            throw ValidationException::withMessages([
                'chat_room_id' => __('No one else is in this chat to call.'),
            ]);
        }

        $call = DB::transaction(function () use ($caller, $chatRoom, $isDirect) {
            $call = UnityCall::create([
                'caller_id' => $caller->id,
                'chat_room_id' => $chatRoom->id,
                'user_livestream_id' => null,
                'type' => UnityCall::TYPE_AUDIO,
                'status' => UnityCall::STATUS_RINGING,
                'ring_expires_at' => now()->addSeconds(self::RING_SECONDS),
            ]);

            UnityCallParticipant::create([
                'unity_call_id' => $call->id,
                'user_id' => $caller->id,
                'role' => UnityCallParticipant::ROLE_CALLER,
                'status' => UnityCallParticipant::STATUS_ACCEPTED,
            ]);

            if ($isDirect) {
                $callee = $chatRoom->members()->where('users.id', '!=', $caller->id)->first();
                UnityCallParticipant::create([
                    'unity_call_id' => $call->id,
                    'user_id' => $callee->id,
                    'role' => UnityCallParticipant::ROLE_CALLEE,
                    'status' => UnityCallParticipant::STATUS_RINGING,
                ]);
                $this->notifier->notifyIncoming($call, $caller, $callee);
            }

            $this->notifier->broadcastStatus(
                $caller->id,
                $this->notifier->payloadForUser($call->fresh(['participants.user', 'chatRoom']), $caller, 'ringing'),
            );

            return $call->fresh(['participants.user', 'chatRoom', 'caller']);
        });

        if (! $isDirect) {
            $this->notifier->broadcastRoomIncoming($call, $caller, $chatRoom);
            NotifyUnityCallRoomMembersJob::dispatchSync($call->id, $caller->id);
        }

        $this->syncChatCallMessage($call->fresh(['participants.user', 'chatRoom', 'caller']));

        return $call;
    }

    public function accept(UnityCall $call, User $user): UnityCall
    {
        if ($this->userIsBusyOnOtherCall($user->id, $call->id)) {
            throw ValidationException::withMessages([
                'call' => __('You are already on another call. End it before joining this one.'),
            ]);
        }

        return DB::transaction(function () use ($call, $user) {
            $call = UnityCall::query()->whereKey($call->id)->lockForUpdate()->firstOrFail();
            $participant = $this->ensureCalleeParticipant($call, $user);
            $participant = UnityCallParticipant::query()
                ->whereKey($participant->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($participant->role !== UnityCallParticipant::ROLE_CALLEE) {
                throw ValidationException::withMessages(['call' => __('Only callees can accept this call.')]);
            }

            if ($participant->status === UnityCallParticipant::STATUS_ACCEPTED) {
                return $call->fresh(['participants.user', 'chatRoom', 'caller']);
            }

            $rejoinable = in_array($participant->status, [
                UnityCallParticipant::STATUS_DECLINED,
                UnityCallParticipant::STATUS_LEFT,
                UnityCallParticipant::STATUS_MISSED,
            ], true);

            if ($participant->status !== UnityCallParticipant::STATUS_RINGING && ! $rejoinable) {
                throw ValidationException::withMessages(['call' => __('This call is no longer ringing.')]);
            }

            if (! in_array($call->status, [UnityCall::STATUS_RINGING, UnityCall::STATUS_ACCEPTED], true)) {
                throw ValidationException::withMessages(['call' => __('This call is no longer available.')]);
            }

            if ($rejoinable && in_array($call->status, [UnityCall::STATUS_RINGING, UnityCall::STATUS_ACCEPTED], true)) {
                // Rejoin, answer late, or change mind while the call is still live.
            } elseif ($rejoinable) {
                throw ValidationException::withMessages(['call' => __('This call is no longer available.')]);
            }

            $participant->update(['status' => UnityCallParticipant::STATUS_ACCEPTED]);

            $updates = [];
            if ($call->status === UnityCall::STATUS_RINGING) {
                $updates['status'] = UnityCall::STATUS_ACCEPTED;
            }
            if ($call->answered_at === null) {
                $updates['answered_at'] = now();
            }
            if ($updates !== []) {
                $call->update($updates);
            }

            $call->loadMissing(['caller', 'participants.user', 'chatRoom']);
            $caller = $call->caller;

            $acceptedPayload = $this->notifier->payloadForUser(
                $call->fresh(['participants.user', 'chatRoom']),
                $caller,
                'accepted',
            );

            foreach ($call->participants as $p) {
                $this->notifier->broadcastStatus($p->user_id, $acceptedPayload);
            }

            $this->notifier->broadcastStatus($call->caller_id, $acceptedPayload);

            $freshCall = $call->fresh(['participants.user', 'chatRoom']);
            $this->notifier->broadcastSessionStatus($freshCall, $caller, 'accepted');
            $this->notifier->broadcastRoomStatus($freshCall, $caller, 'accepted');

            $fresh = $call->fresh(['participants.user', 'chatRoom', 'caller']);
            $this->syncChatCallMessage($fresh);

            return $fresh;
        });
    }

    public function decline(UnityCall $call, User $user): UnityCall
    {
        $participant = $this->ensureCalleeParticipant($call, $user);
        if ($participant->role !== UnityCallParticipant::ROLE_CALLEE) {
            throw ValidationException::withMessages(['call' => __('Only callees can decline this call.')]);
        }

        if ($participant->status === UnityCallParticipant::STATUS_DECLINED) {
            return $call->fresh(['participants.user', 'chatRoom', 'caller']);
        }

        if (in_array($participant->status, [
            UnityCallParticipant::STATUS_LEFT,
            UnityCallParticipant::STATUS_MISSED,
        ], true)) {
            return $call->fresh(['participants.user', 'chatRoom', 'caller']);
        }

        $participant->update(['status' => UnityCallParticipant::STATUS_DECLINED]);

        $call->loadMissing(['caller', 'participants']);
        $caller = $call->caller;

        $remainingRinging = $call->participants
            ->where('role', UnityCallParticipant::ROLE_CALLEE)
            ->where('status', UnityCallParticipant::STATUS_RINGING)
            ->count();

        $anyAccepted = $call->participants
            ->where('role', UnityCallParticipant::ROLE_CALLEE)
            ->where('status', UnityCallParticipant::STATUS_ACCEPTED)
            ->isNotEmpty();

        if (! $anyAccepted && $remainingRinging === 0) {
            $call->update([
                'status' => UnityCall::STATUS_DECLINED,
                'ended_at' => now(),
            ]);
            $this->forgetWebRtcSignalCache($call);
            $reason = 'declined';
        } else {
            $reason = 'participant_declined';
        }

        $payload = $this->notifier->payloadForUser($call->fresh(['participants.user', 'chatRoom']), $caller, $reason);

        foreach ($call->participants as $participant) {
            $this->notifier->broadcastStatus($participant->user_id, $payload);
        }

        $fresh = $call->fresh(['participants.user', 'chatRoom']);
        $this->notifier->broadcastSessionStatus($fresh, $caller, $reason);
        $this->notifier->broadcastRoomStatus($fresh, $caller, $reason);

        $fresh = $call->fresh(['participants.user', 'chatRoom', 'caller']);
        $this->syncChatCallMessage($fresh);

        return $fresh;
    }

    public function cancel(UnityCall $call, User $user): UnityCall
    {
        if ((int) $call->caller_id !== (int) $user->id) {
            throw ValidationException::withMessages(['call' => __('Only the caller can cancel this call.')]);
        }

        if (in_array($call->status, [
            UnityCall::STATUS_CANCELLED,
            UnityCall::STATUS_ENDED,
            UnityCall::STATUS_DECLINED,
            UnityCall::STATUS_MISSED,
        ], true)) {
            return $call->fresh(['participants.user', 'chatRoom', 'caller']);
        }

        if ($call->status === UnityCall::STATUS_ACCEPTED) {
            return $this->end($call, $user);
        }

        if ($call->status !== UnityCall::STATUS_RINGING) {
            return $call->fresh(['participants.user', 'chatRoom', 'caller']);
        }

        $call->update([
            'status' => UnityCall::STATUS_CANCELLED,
            'ended_at' => now(),
        ]);
        $this->forgetWebRtcSignalCache($call);

        $call->participants()
            ->where('status', UnityCallParticipant::STATUS_RINGING)
            ->update(['status' => UnityCallParticipant::STATUS_MISSED]);

        $call->loadMissing(['caller', 'participants.user', 'chatRoom']);
        $payload = $this->notifier->payloadForUser($call, $call->caller, 'cancelled');

        foreach ($call->participants as $participant) {
            if ($participant->user_id === $call->caller_id) {
                continue;
            }
            $this->notifier->broadcastStatus($participant->user_id, $payload);
        }

        $this->notifier->broadcastStatus($call->caller_id, $payload);

        $this->notifier->broadcastRoomStatus($call->fresh(['participants.user', 'chatRoom']), $call->caller, 'cancelled');
        $this->notifier->broadcastSessionStatus($call->fresh(['participants.user', 'chatRoom']), $call->caller, 'cancelled');

        $fresh = $call->fresh(['participants.user', 'chatRoom', 'caller']);
        $this->syncChatCallMessage($fresh);

        return $fresh;
    }

    public function end(UnityCall $call, User $user): UnityCall
    {
        $call->loadMissing(['caller', 'participants', 'chatRoom']);
        $isCaller = (int) $call->caller_id === (int) $user->id;
        $participant = $call->participantForUser($user->id);

        if (! $participant) {
            if ($isCaller) {
                throw ValidationException::withMessages(['call' => __('You are not part of this call.')]);
            }

            return $this->decline($call, $user);
        }

        if (! in_array($call->status, [UnityCall::STATUS_RINGING, UnityCall::STATUS_ACCEPTED], true)) {
            return $call->fresh(['participants.user', 'chatRoom', 'caller']);
        }

        $isDirect = $call->chatRoom?->type === 'direct';

        if (! $isCaller && $participant->status === UnityCallParticipant::STATUS_RINGING) {
            return $this->decline($call, $user);
        }

        if ($call->status === UnityCall::STATUS_RINGING && ! $isCaller) {
            return $this->decline($call, $user);
        }

        if (! $isDirect && ! $isCaller && $call->status === UnityCall::STATUS_ACCEPTED) {
            return $this->leave($call, $user);
        }

        $call->update([
            'status' => UnityCall::STATUS_ENDED,
            'ended_at' => now(),
        ]);
        $this->forgetWebRtcSignalCache($call);

        $call->participants()
            ->where('status', UnityCallParticipant::STATUS_RINGING)
            ->update(['status' => UnityCallParticipant::STATUS_MISSED]);

        $call->loadMissing(['participants.user', 'chatRoom']);
        $payload = $this->notifier->payloadForUser($call, $call->caller, 'ended');

        foreach ($call->participants as $p) {
            $this->notifier->broadcastStatus($p->user_id, $payload);
        }

        $this->notifier->broadcastRoomStatus($call->fresh(['participants.user', 'chatRoom']), $call->caller, 'ended');
        $this->notifier->broadcastSessionStatus($call->fresh(['participants.user', 'chatRoom']), $call->caller, 'ended');

        $fresh = $call->fresh(['participants.user', 'chatRoom', 'caller']);
        $this->syncChatCallMessage($fresh);

        return $fresh;
    }

    public function leave(UnityCall $call, User $user): UnityCall
    {
        $participant = $this->requireParticipant($call, $user);

        if ($participant->role === UnityCallParticipant::ROLE_CALLER) {
            throw ValidationException::withMessages(['call' => __('The host cannot leave — end the call for everyone instead.')]);
        }

        if ($call->status !== UnityCall::STATUS_ACCEPTED) {
            throw ValidationException::withMessages(['call' => __('You can only leave an active call.')]);
        }

        $participant->update(['status' => UnityCallParticipant::STATUS_LEFT]);

        $call->loadMissing(['caller', 'participants.user', 'chatRoom']);

        $remainingAcceptedCallees = $call->participants
            ->where('role', UnityCallParticipant::ROLE_CALLEE)
            ->where('status', UnityCallParticipant::STATUS_ACCEPTED)
            ->count();

        if ($remainingAcceptedCallees === 0) {
            $call->update([
                'status' => UnityCall::STATUS_ENDED,
                'ended_at' => now(),
            ]);
            $this->forgetWebRtcSignalCache($call);
            $reason = 'ended';
        } else {
            $reason = 'participant_left';
        }

        $payload = $this->notifier->payloadForUser($call->fresh(['participants.user', 'chatRoom']), $call->caller, $reason);

        foreach ($call->participants as $p) {
            $this->notifier->broadcastStatus($p->user_id, $payload);
        }

        $fresh = $call->fresh(['participants.user', 'chatRoom']);
        $this->notifier->broadcastSessionStatus($fresh, $call->caller, $reason);
        $this->notifier->broadcastRoomStatus($fresh, $call->caller, $reason);

        $fresh = $call->fresh(['participants.user', 'chatRoom', 'caller']);
        $this->syncChatCallMessage($fresh);

        return $fresh;
    }

    public function expireRingingCalls(): int
    {
        $expired = UnityCall::query()
            ->where('status', UnityCall::STATUS_RINGING)
            ->where(function ($query) {
                $query->where(function ($inner) {
                    $inner->whereNotNull('ring_expires_at')
                        ->where('ring_expires_at', '<=', now());
                })->orWhere(function ($inner) {
                    $inner->whereNull('ring_expires_at')
                        ->where('created_at', '<=', now()->subSeconds(self::RING_SECONDS));
                });
            })
            ->with(['caller', 'participants.user', 'chatRoom'])
            ->get();

        $count = 0;

        foreach ($expired as $call) {
            $ringingCallees = $call->participants
                ->where('role', UnityCallParticipant::ROLE_CALLEE)
                ->where('status', UnityCallParticipant::STATUS_RINGING);

            foreach ($ringingCallees as $participant) {
                $this->expireRingingParticipant($call, $participant);
                $count++;
            }
        }

        return $count;
    }

    public function expireCallIfRinging(UnityCall $call, User $user): UnityCall
    {
        if (! $this->userCanExpireRinging($call, $user)) {
            return $call->fresh(['participants.user', 'chatRoom', 'caller']);
        }

        return DB::transaction(function () use ($call, $user) {
            $call = UnityCall::query()->whereKey($call->id)->lockForUpdate()->firstOrFail();
            $participant = $call->participantForUser($user->id);

            if (! $participant || $participant->role !== UnityCallParticipant::ROLE_CALLEE) {
                return $call->fresh(['participants.user', 'chatRoom', 'caller']);
            }

            if ($participant->status !== UnityCallParticipant::STATUS_RINGING) {
                return $call->fresh(['participants.user', 'chatRoom', 'caller']);
            }

            if (! $this->isRingExpired($call)) {
                return $call->fresh(['participants.user', 'chatRoom', 'caller']);
            }

            $this->expireRingingParticipant($call, $participant);

            return $call->fresh(['participants.user', 'chatRoom', 'caller']);
        });
    }

    public function ringSeconds(): int
    {
        return self::RING_SECONDS;
    }

    private function isRingExpired(UnityCall $call): bool
    {
        if ($call->status !== UnityCall::STATUS_RINGING) {
            return false;
        }

        if ($call->ring_expires_at) {
            return $call->ring_expires_at->lte(now()->addSeconds(3));
        }

        return $call->created_at->lte(now()->subSeconds(self::RING_SECONDS));
    }

    private function expireRingingParticipant(UnityCall $call, UnityCallParticipant $participant): void
    {
        if ($participant->status !== UnityCallParticipant::STATUS_RINGING) {
            return;
        }

        $participant->update(['status' => UnityCallParticipant::STATUS_MISSED]);

        $call->loadMissing(['caller', 'participants.user', 'chatRoom']);
        $caller = $call->caller;
        $fresh = $call->fresh(['participants.user', 'chatRoom', 'caller']);
        $payload = $this->notifier->payloadForUser($fresh, $caller, 'participant_missed');

        foreach ($fresh->participants as $row) {
            $this->notifier->broadcastStatus($row->user_id, $payload);
        }

        $this->notifier->broadcastSessionStatus($fresh, $caller, 'participant_missed');
        $this->notifier->broadcastRoomStatus($fresh, $caller, 'participant_missed');

        $this->syncChatCallMessage($fresh);
    }

    public function activeCallForUser(int $userId): ?UnityCall
    {
        $this->finalizeStaleCallsForUser($userId);

        return UnityCall::query()
            ->whereIn('status', [UnityCall::STATUS_RINGING, UnityCall::STATUS_ACCEPTED])
            ->whereNull('ended_at')
            ->whereHas('participants', fn ($q) => $q->where('user_id', $userId))
            ->latest('id')
            ->first();
    }

    /**
     * @return array<string, mixed>|null
     */
    public function incomingCallPayloadForUser(User $user): ?array
    {
        $this->finalizeStaleCallsForUser($user->id);

        $call = UnityCall::query()
            ->with(['caller', 'participants.user', 'chatRoom'])
            ->where('status', UnityCall::STATUS_RINGING)
            ->whereNull('ended_at')
            ->where('caller_id', '!=', $user->id)
            ->where(function ($query) use ($user) {
                $query->whereHas('participants', function ($participantQuery) use ($user) {
                    $participantQuery
                        ->where('user_id', $user->id)
                        ->where('role', UnityCallParticipant::ROLE_CALLEE)
                        ->where('status', UnityCallParticipant::STATUS_RINGING);
                })->orWhere(function ($groupQuery) use ($user) {
                    $groupQuery
                        ->whereHas('chatRoom', function ($roomQuery) use ($user) {
                            $roomQuery
                                ->where('type', '!=', 'direct')
                                ->where('is_active', true)
                                ->whereHas('members', fn ($memberQuery) => $memberQuery->where('users.id', $user->id));
                        })
                        ->whereDoesntHave('participants', fn ($participantQuery) => $participantQuery
                            ->where('user_id', $user->id)
                            ->whereIn('status', [
                                UnityCallParticipant::STATUS_DECLINED,
                                UnityCallParticipant::STATUS_MISSED,
                                UnityCallParticipant::STATUS_ACCEPTED,
                            ]));
                });
            })
            ->latest('id')
            ->first();

        if (! $call || ! $call->caller) {
            return null;
        }

        if ($call->chatRoom?->type === 'direct') {
            $participant = $call->participantForUser($user->id);
            if (! $participant || $participant->status !== UnityCallParticipant::STATUS_RINGING) {
                return null;
            }
        }

        return $this->notifier->payloadForUser($call, $call->caller, 'incoming');
    }

    /**
     * @return array<int, array{id: int, type: string}>
     */
    public function chatRoomsForIncomingListener(User $user): array
    {
        return $user->chatRooms()
            ->where('chat_rooms.is_active', true)
            ->whereIn('chat_rooms.type', ['direct', 'private', 'public'])
            ->orderByDesc('chat_rooms.updated_at')
            ->limit(64)
            ->get(['chat_rooms.id', 'chat_rooms.type'])
            ->map(fn ($room) => [
                'id' => (int) $room->id,
                'type' => (string) $room->type,
            ])
            ->values()
            ->all();
    }

    /**
     * True when the user is ringing or already connected on any active call.
     */
    public function userIsBusyOnCall(int $userId): bool
    {
        $this->finalizeStaleCallsForUser($userId);

        return UnityCall::query()
            ->whereIn('status', [UnityCall::STATUS_RINGING, UnityCall::STATUS_ACCEPTED])
            ->whereNull('ended_at')
            ->whereHas('participants', fn ($q) => $q
                ->where('user_id', $userId)
                ->whereIn('status', [
                    UnityCallParticipant::STATUS_RINGING,
                    UnityCallParticipant::STATUS_ACCEPTED,
                ]))
            ->exists();
    }

    /**
     * True when the user is ringing or connected on a different active call.
     */
    public function userIsBusyOnOtherCall(int $userId, int $exceptCallId): bool
    {
        $this->finalizeStaleCallsForUser($userId, $exceptCallId);

        return UnityCall::query()
            ->whereIn('status', [UnityCall::STATUS_RINGING, UnityCall::STATUS_ACCEPTED])
            ->whereNull('ended_at')
            ->whereKeyNot($exceptCallId)
            ->whereHas('participants', fn ($q) => $q
                ->where('user_id', $userId)
                ->whereIn('status', [
                    UnityCallParticipant::STATUS_RINGING,
                    UnityCallParticipant::STATUS_ACCEPTED,
                ]))
            ->exists();
    }

    /**
     * True when the user is already connected to a different live call.
     * Ringing-only rows on other calls do not block answering a new incoming call.
     */
    public function userHasConflictingAcceptedCall(int $userId, int $exceptCallId): bool
    {
        $this->finalizeStaleCallsForUser($userId, $exceptCallId);

        return UnityCall::query()
            ->whereIn('status', [UnityCall::STATUS_RINGING, UnityCall::STATUS_ACCEPTED])
            ->whereNull('ended_at')
            ->whereKeyNot($exceptCallId)
            ->whereHas('participants', fn ($q) => $q
                ->where('user_id', $userId)
                ->where('status', UnityCallParticipant::STATUS_ACCEPTED))
            ->exists();
    }

    public function userCanAccess(UnityCall $call, User $user): bool
    {
        if ($call->participants()->where('user_id', $user->id)->exists()) {
            return true;
        }

        if (! $call->isActive()) {
            return false;
        }

        $chatRoom = $call->relationLoaded('chatRoom')
            ? $call->chatRoom
            : ChatRoom::query()->find($call->chat_room_id);

        if (! $chatRoom) {
            return false;
        }

        if ($chatRoom->type === 'direct') {
            return false;
        }

        if ($chatRoom->members()->where('users.id', $user->id)->exists()) {
            return true;
        }

        if ($chatRoom->type === 'public') {
            return $this->ensurePublicChatRoomMember($chatRoom, $user);
        }

        return false;
    }

    public function prepareCalleeForIncomingRing(UnityCall $call, User $user): UnityCall
    {
        if ((int) $call->caller_id === (int) $user->id || ! $call->isActive()) {
            return $call->fresh(['participants.user', 'chatRoom', 'caller']);
        }

        try {
            $this->ensureCalleeParticipant($call, $user);
        } catch (ValidationException) {
            // Access may still be denied below; do not fail the page load.
        }

        return $call->fresh(['participants.user', 'chatRoom', 'caller']);
    }

    public function userCanExpireRinging(UnityCall $call, User $user): bool
    {
        if ($this->userCanAccess($call, $user)) {
            return true;
        }

        $participant = $call->participantForUser($user->id);
        if ($participant && $participant->role === UnityCallParticipant::ROLE_CALLEE) {
            return true;
        }

        return false;
    }

    /**
     * Public group chats appear in the sidebar before explicit join — mirror chat message access.
     */
    private function ensurePublicChatRoomMember(ChatRoom $chatRoom, User $user): bool
    {
        if (! $chatRoom->is_active) {
            return false;
        }

        if ($user->role === 'admin') {
            $this->attachChatRoomMember($chatRoom, $user);

            return true;
        }

        if (! in_array($user->role, ['organization', 'user'], true)) {
            return false;
        }

        $interestedTopicIds = $user->interestedTopics()->pluck('chat_topics.id')->all();
        $matchesTopic = $chatRoom->topics()
            ->whereIn('chat_topics.id', $interestedTopicIds)
            ->exists();

        if (! $matchesTopic) {
            return false;
        }

        $this->attachChatRoomMember($chatRoom, $user);

        return true;
    }

    private function attachChatRoomMember(ChatRoom $chatRoom, User $user): void
    {
        if ($chatRoom->members()->where('users.id', $user->id)->exists()) {
            return;
        }

        $chatRoom->members()->attach($user->id, [
            'role' => 'member',
            'joined_at' => now(),
        ]);
    }

    private function ensureCalleeParticipant(UnityCall $call, User $user): UnityCallParticipant
    {
        $participant = $call->participantForUser($user->id);
        if ($participant) {
            return $participant;
        }

        if ((int) $call->caller_id === (int) $user->id) {
            throw ValidationException::withMessages(['call' => __('Only callees can join this way.')]);
        }

        if (! $this->userCanAccess($call, $user)) {
            throw ValidationException::withMessages(['call' => __('You are not part of this call.')]);
        }

        return UnityCallParticipant::create([
            'unity_call_id' => $call->id,
            'user_id' => $user->id,
            'role' => UnityCallParticipant::ROLE_CALLEE,
            'status' => UnityCallParticipant::STATUS_RINGING,
        ]);
    }

    private function requireParticipant(UnityCall $call, User $user): UnityCallParticipant
    {
        $participant = $call->participantForUser($user->id);
        if (! $participant) {
            throw ValidationException::withMessages(['call' => __('You are not part of this call.')]);
        }

        return $participant;
    }

    private function finalizeStaleCallsForUser(int $userId, ?int $exceptCallId = null): void
    {
        $staleRinging = UnityCall::query()
            ->where('status', UnityCall::STATUS_RINGING)
            ->when($exceptCallId, fn ($query) => $query->whereKeyNot($exceptCallId))
            ->whereHas('participants', fn ($q) => $q->where('user_id', $userId))
            ->where(function ($query) {
                $query->where(function ($inner) {
                    $inner->whereNotNull('ring_expires_at')
                        ->where('ring_expires_at', '<=', now());
                })->orWhere(function ($inner) {
                    $inner->whereNull('ring_expires_at')
                        ->where('created_at', '<=', now()->subSeconds(self::RING_SECONDS));
                });
            })
            ->with(['caller', 'participants.user', 'chatRoom'])
            ->get();

        foreach ($staleRinging as $call) {
            $participant = $call->participantForUser($userId);

            if ($participant
                && $participant->role === UnityCallParticipant::ROLE_CALLEE
                && $participant->status === UnityCallParticipant::STATUS_RINGING) {
                $this->expireRingingParticipant($call, $participant);

                continue;
            }

            if ($participant && $participant->role === UnityCallParticipant::ROLE_CALLER) {
                continue;
            }

            $this->terminateOrphanedCall($call);
        }
    }

    /**
     * Close any stuck ringing/accepted calls before the user starts a new one.
     */
    private function releaseActiveCallsForUser(int $userId): void
    {
        $this->finalizeStaleCallsForUser($userId);

        $activeCalls = UnityCall::query()
            ->whereIn('status', [UnityCall::STATUS_RINGING, UnityCall::STATUS_ACCEPTED])
            ->whereNull('ended_at')
            ->whereHas('participants', fn ($q) => $q->where('user_id', $userId))
            ->with(['caller', 'participants.user', 'chatRoom'])
            ->get();

        foreach ($activeCalls as $call) {
            $this->terminateOrphanedCall($call);
        }
    }

    private function terminateOrphanedCall(UnityCall $call): void
    {
        if (! in_array($call->status, [UnityCall::STATUS_RINGING, UnityCall::STATUS_ACCEPTED], true)) {
            return;
        }

        if ($call->status === UnityCall::STATUS_RINGING) {
            $status = UnityCall::STATUS_MISSED;
            $reason = 'missed';
        } else {
            $status = UnityCall::STATUS_ENDED;
            $reason = 'ended';
        }

        $call->update([
            'status' => $status,
            'ended_at' => now(),
        ]);
        $this->forgetWebRtcSignalCache($call);

        $call->participants()
            ->where('status', UnityCallParticipant::STATUS_RINGING)
            ->update(['status' => UnityCallParticipant::STATUS_MISSED]);

        $call->loadMissing(['participants.user', 'chatRoom']);
        $payload = $this->notifier->payloadForUser(
            $call->fresh(['participants.user', 'chatRoom']),
            $call->caller,
            $reason,
        );

        foreach ($call->participants as $participant) {
            $this->notifier->broadcastStatus($participant->user_id, $payload);
        }

        $this->syncChatCallMessage($call->fresh(['participants.user', 'chatRoom', 'caller']));
    }

    private function syncChatCallMessage(UnityCall $call): void
    {
        try {
            $this->chatMessages->syncCallMessage($call);
        } catch (\Throwable $e) {
            Log::warning('unity_call.chat_message_sync_failed', [
                'call_id' => $call->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function forgetWebRtcSignalCache(UnityCall $call): void
    {
        Cache::forget("unity_call:{$call->id}:webrtc_signals");
    }
}
