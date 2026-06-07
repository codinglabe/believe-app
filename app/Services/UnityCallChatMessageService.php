<?php

namespace App\Services;

use App\Events\MessageSent;
use App\Models\ChatMessage;
use App\Models\UnityCall;
use App\Models\UnityCallParticipant;

class UnityCallChatMessageService
{
    public function syncCallMessage(UnityCall $call): ?ChatMessage
    {
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

        if ($call->answered_at && $call->ended_at) {
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
            'accepted_count' => $acceptedCount,
            'caller_id' => $call->caller_id,
            'caller_name' => trim((string) ($call->caller?->name ?? '')) ?: 'Someone',
        ];
    }

    private function buildPreviewText(UnityCall $call): string
    {
        $caller = trim((string) ($call->caller?->name ?? '')) ?: 'Someone';

        return match ($call->status) {
            UnityCall::STATUS_RINGING => "{$caller} started an audio call",
            UnityCall::STATUS_ACCEPTED => 'Audio call in progress',
            UnityCall::STATUS_ENDED => $this->endedPreview($call),
            UnityCall::STATUS_CANCELLED, UnityCall::STATUS_MISSED => 'Missed audio call',
            UnityCall::STATUS_DECLINED => 'Audio call declined',
            default => 'Audio call',
        };
    }

    private function endedPreview(UnityCall $call): string
    {
        if ($call->answered_at && $call->ended_at) {
            $seconds = $call->ended_at->diffInSeconds($call->answered_at);

            return 'Audio call · '.$this->formatDuration($seconds);
        }

        return 'Audio call ended';
    }

    private function formatDuration(int $seconds): string
    {
        $seconds = max(0, $seconds);
        $hours = intdiv($seconds, 3600);
        $minutes = intdiv($seconds % 3600, 60);
        $remaining = $seconds % 60;

        if ($hours > 0) {
            return sprintf('%d:%02d:%02d', $hours, $minutes, $remaining);
        }

        return sprintf('%d:%02d', $minutes, $remaining);
    }
}
