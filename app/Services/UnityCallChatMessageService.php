<?php

namespace App\Services;

use App\Events\MessageSent;
use App\Models\ChatMessage;
use App\Models\UnityCall;
use App\Models\UnityCallParticipant;
use Illuminate\Support\Facades\Schema;

class UnityCallChatMessageService
{
    public function syncCallMessage(UnityCall $call): ?ChatMessage
    {
        if (! $this->supportsCallMessages()) {
            return null;
        }

        $call->loadMissing(['caller', 'participants.user', 'chatRoom']);

        if (! $call->chat_room_id) {
            return null;
        }

        $preview = $this->buildPreviewText($call);
        $metadata = $this->buildMetadata($call);

        if ($call->chat_message_id) {
            $message = ChatMessage::query()->find($call->chat_message_id);
            if ($message) {
                $message->update([
                    'message' => $preview,
                    'message_type' => ChatMessage::TYPE_UNITY_CALL,
                    'metadata' => $metadata,
                ]);

                $this->broadcast($message);

                return $message;
            }
        }

        $message = ChatMessage::query()->create([
            'chat_room_id' => $call->chat_room_id,
            'user_id' => $call->caller_id,
            'message' => $preview,
            'message_type' => ChatMessage::TYPE_UNITY_CALL,
            'metadata' => $metadata,
            'attachments' => [],
        ]);

        $message->reads()->attach($call->caller_id);

        $call->update(['chat_message_id' => $message->id]);

        $this->broadcast($message);

        return $message;
    }

    private function broadcast(ChatMessage $message): void
    {
        broadcast(new MessageSent(
            $message->loadMissing(['user.organization', 'replyToMessage.user.organization', 'chatRoom.members']),
        ));
    }

    /**
     * @return array<string, mixed>
     */
    private function buildMetadata(UnityCall $call): array
    {
        $durationSeconds = null;

        if ($call->status === UnityCall::STATUS_ACCEPTED && $call->answered_at) {
            $durationSeconds = now()->diffInSeconds($call->answered_at);
        } elseif ($call->answered_at && $call->ended_at) {
            $durationSeconds = $call->ended_at->diffInSeconds($call->answered_at);
        }

        $acceptedCount = $call->participants
            ->where('role', UnityCallParticipant::ROLE_CALLEE)
            ->where('status', UnityCallParticipant::STATUS_ACCEPTED)
            ->count();

        return [
            'unity_call_id' => $call->id,
            'call_status' => $call->status,
            'call_type' => $call->type,
            'join_url' => '/unity-call/'.$call->id,
            'is_group_call' => $call->chatRoom?->type !== 'direct',
            'answered_at' => $call->answered_at?->utc()->toIso8601String(),
            'ended_at' => $call->ended_at?->utc()->toIso8601String(),
            'duration_seconds' => $durationSeconds,
            'duration_label' => $durationSeconds !== null && $durationSeconds > 0
                ? $this->formatDurationHuman($durationSeconds)
                : null,
            'accepted_count' => $acceptedCount,
            'caller_id' => $call->caller_id,
            'caller_name' => trim((string) ($call->caller?->name ?? '')) ?: 'Someone',
        ];
    }

    private function buildPreviewText(UnityCall $call): string
    {
        return match ($call->status) {
            UnityCall::STATUS_RINGING, UnityCall::STATUS_ACCEPTED => 'Voice call',
            UnityCall::STATUS_ENDED => $this->endedPreview($call),
            UnityCall::STATUS_CANCELLED, UnityCall::STATUS_MISSED => 'Missed voice call',
            UnityCall::STATUS_DECLINED => 'Voice call declined',
            default => 'Voice call',
        };
    }

    private function endedPreview(UnityCall $call): string
    {
        if ($call->answered_at && $call->ended_at) {
            $seconds = $call->ended_at->diffInSeconds($call->answered_at);

            if ($seconds > 0) {
                return 'Voice call · '.$this->formatDurationHuman($seconds);
            }
        }

        return 'Voice call';
    }

    private function formatDurationHuman(int $seconds): string
    {
        $seconds = max(0, $seconds);

        if ($seconds < 60) {
            return $seconds === 1 ? '1 second' : "{$seconds} seconds";
        }

        $minutes = intdiv($seconds, 60);

        if ($minutes < 60) {
            return $minutes === 1 ? '1 minute' : "{$minutes} minutes";
        }

        $hours = intdiv($minutes, 60);
        $remainingMinutes = $minutes % 60;

        if ($remainingMinutes === 0) {
            return $hours === 1 ? '1 hour' : "{$hours} hours";
        }

        $hourPart = $hours === 1 ? '1 hour' : "{$hours} hours";
        $minutePart = $remainingMinutes === 1 ? '1 minute' : "{$remainingMinutes} minutes";

        return "{$hourPart} {$minutePart}";
    }

    private function supportsCallMessages(): bool
    {
        return Schema::hasColumn('chat_messages', 'message_type')
            && Schema::hasColumn('chat_messages', 'metadata')
            && Schema::hasColumn('unity_calls', 'chat_message_id');
    }
}
