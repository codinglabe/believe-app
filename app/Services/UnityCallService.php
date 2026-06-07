<?php

namespace App\Services;

use App\Models\ChatRoom;
use App\Models\UnityCall;
use App\Models\UnityCallParticipant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UnityCallService
{
    private const RING_SECONDS = 60;

    public function __construct(
        private readonly UnityCallNotifier $notifier,
    ) {}

    public function initiate(User $caller, int $chatRoomId): UnityCall
    {
        $chatRoom = ChatRoom::query()
            ->with(['members'])
            ->findOrFail($chatRoomId);

        if (! $chatRoom->members->contains('id', $caller->id)) {
            throw ValidationException::withMessages([
                'chat_room_id' => __('You are not a member of this chat.'),
            ]);
        }

        if ($this->activeCallForUser($caller->id)) {
            throw ValidationException::withMessages([
                'chat_room_id' => __('You are already in a call.'),
            ]);
        }

        $callees = $chatRoom->members->where('id', '!=', $caller->id)->values();
        if ($callees->isEmpty()) {
            throw ValidationException::withMessages([
                'chat_room_id' => __('No one else is in this chat to call.'),
            ]);
        }

        return DB::transaction(function () use ($caller, $chatRoom, $callees) {
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

            foreach ($callees as $callee) {
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
    }

    public function accept(UnityCall $call, User $user): UnityCall
    {
        $participant = $this->requireParticipant($call, $user);
        if ($participant->role !== UnityCallParticipant::ROLE_CALLEE) {
            throw ValidationException::withMessages(['call' => __('Only callees can accept this call.')]);
        }
        if ($participant->status !== UnityCallParticipant::STATUS_RINGING) {
            throw ValidationException::withMessages(['call' => __('This call is no longer ringing.')]);
        }
        if (! $call->isActive() || $call->status !== UnityCall::STATUS_RINGING) {
            throw ValidationException::withMessages(['call' => __('This call is no longer available.')]);
        }
        if ($call->ring_expires_at && $call->ring_expires_at->isPast()) {
            throw ValidationException::withMessages(['call' => __('This call has expired.')]);
        }

        $participant->update(['status' => UnityCallParticipant::STATUS_ACCEPTED]);

        $updates = ['status' => UnityCall::STATUS_ACCEPTED];
        if ($call->answered_at === null) {
            $updates['answered_at'] = now();
        }
        $call->update($updates);

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
    }

    public function decline(UnityCall $call, User $user): UnityCall
    {
        $participant = $this->requireParticipant($call, $user);
        if ($participant->role !== UnityCallParticipant::ROLE_CALLEE) {
            throw ValidationException::withMessages(['call' => __('Only callees can decline this call.')]);
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
        if ($call->status !== UnityCall::STATUS_RINGING) {
            throw ValidationException::withMessages(['call' => __('This call can no longer be cancelled.')]);
        }

        $call->update([
            'status' => UnityCall::STATUS_CANCELLED,
            'ended_at' => now(),
        ]);

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

        return $call->fresh(['participants.user', 'chatRoom', 'caller']);
    }

    public function end(UnityCall $call, User $user): UnityCall
    {
        $this->requireParticipant($call, $user);

        if (! in_array($call->status, [UnityCall::STATUS_RINGING, UnityCall::STATUS_ACCEPTED], true)) {
            throw ValidationException::withMessages(['call' => __('This call has already ended.')]);
        }

        $call->update([
            'status' => UnityCall::STATUS_ENDED,
            'ended_at' => now(),
        ]);

        $call->participants()
            ->where('status', UnityCallParticipant::STATUS_RINGING)
            ->update(['status' => UnityCallParticipant::STATUS_MISSED]);

        $call->loadMissing(['caller', 'participants.user', 'chatRoom']);
        $payload = $this->notifier->payloadForUser($call, $call->caller, 'ended');

        foreach ($call->participants as $participant) {
            $this->notifier->broadcastStatus($participant->user_id, $payload);
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
        return UnityCall::query()
            ->whereIn('status', [UnityCall::STATUS_RINGING, UnityCall::STATUS_ACCEPTED])
            ->whereHas('participants', fn ($q) => $q->where('user_id', $userId))
            ->latest('id')
            ->first();
    }

    public function userCanAccess(UnityCall $call, User $user): bool
    {
        return $call->participants()->where('user_id', $user->id)->exists();
    }

    private function requireParticipant(UnityCall $call, User $user): UnityCallParticipant
    {
        $participant = $call->participantForUser($user->id);
        if (! $participant) {
            throw ValidationException::withMessages(['call' => __('You are not part of this call.')]);
        }

        return $participant;
    }
}
