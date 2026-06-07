<?php

namespace App\Services;

use App\Jobs\NotifyUnityCallRoomMembersJob;
use App\Models\ChatRoom;
use App\Models\UnityCall;
use App\Models\UnityCallParticipant;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UnityCallService
{
    private const RING_SECONDS = 60;

    private const MAX_HOST_AUDIO_PEERS = 32;

    public function __construct(
        private readonly UnityCallNotifier $notifier,
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
            NotifyUnityCallRoomMembersJob::dispatch($call->id, $caller->id);
        }

        return $call;
    }

    public function accept(UnityCall $call, User $user): UnityCall
    {
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

            if ($participant->status !== UnityCallParticipant::STATUS_RINGING) {
                throw ValidationException::withMessages(['call' => __('This call is no longer ringing.')]);
            }

            if (! in_array($call->status, [UnityCall::STATUS_RINGING, UnityCall::STATUS_ACCEPTED], true)) {
                throw ValidationException::withMessages(['call' => __('This call is no longer available.')]);
            }

            if ($call->status === UnityCall::STATUS_RINGING && $call->ring_expires_at && $call->ring_expires_at->isPast()) {
                throw ValidationException::withMessages(['call' => __('This call has expired.')]);
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

            return $call->fresh(['participants.user', 'chatRoom', 'caller']);
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

        return $call->fresh(['participants.user', 'chatRoom', 'caller']);
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
            throw ValidationException::withMessages(['call' => __('This call can no longer be cancelled.')]);
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

        return $call->fresh(['participants.user', 'chatRoom', 'caller']);
    }

    public function end(UnityCall $call, User $user): UnityCall
    {
        $participant = $this->requireParticipant($call, $user);

        if (! in_array($call->status, [UnityCall::STATUS_RINGING, UnityCall::STATUS_ACCEPTED], true)) {
            return $call->fresh(['participants.user', 'chatRoom', 'caller']);
        }

        $call->loadMissing(['caller', 'participants', 'chatRoom']);
        $isDirect = $call->chatRoom?->type === 'direct';
        $isCaller = (int) $call->caller_id === (int) $user->id;

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

        return $call->fresh(['participants.user', 'chatRoom', 'caller']);
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

        return $call->fresh(['participants.user', 'chatRoom', 'caller']);
    }

    public function expireRingingCalls(): int
    {
        $expired = UnityCall::query()
            ->where('status', UnityCall::STATUS_RINGING)
            ->whereNotNull('ring_expires_at')
            ->where('ring_expires_at', '<=', now())
            ->with(['caller', 'participants.user', 'chatRoom'])
            ->get();

        $count = 0;

        foreach ($expired as $call) {
            $call->update([
                'status' => UnityCall::STATUS_MISSED,
                'ended_at' => now(),
            ]);
            $this->forgetWebRtcSignalCache($call);

            $call->participants()
                ->where('status', UnityCallParticipant::STATUS_RINGING)
                ->update(['status' => UnityCallParticipant::STATUS_MISSED]);

            $payload = $this->notifier->payloadForUser($call->fresh(['participants.user', 'chatRoom']), $call->caller, 'missed');

            foreach ($call->participants as $participant) {
                $this->notifier->broadcastStatus($participant->user_id, $payload);
            }

            $count++;
        }

        return $count;
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

    public function userCanAccess(UnityCall $call, User $user): bool
    {
        if ($call->participants()->where('user_id', $user->id)->exists()) {
            return true;
        }

        if (! $call->isActive() || $call->chatRoom?->type === 'direct') {
            return false;
        }

        return ChatRoom::query()
            ->whereKey($call->chat_room_id)
            ->whereHas('members', fn ($q) => $q->where('users.id', $user->id))
            ->exists();
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

    private function finalizeStaleCallsForUser(int $userId): void
    {
        $staleRinging = UnityCall::query()
            ->where('status', UnityCall::STATUS_RINGING)
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
    }

    private function forgetWebRtcSignalCache(UnityCall $call): void
    {
        Cache::forget("unity_call:{$call->id}:webrtc_signals");
    }
}
