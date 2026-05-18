<?php

namespace App\Jobs;

use App\Models\ChatMessage;
use App\Services\FirebaseService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendChatMessageNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $message;
    public $tries = 3;
    public $timeout = 60;

    /**
     * Create a new job instance.
     */
    public function __construct(ChatMessage $message)
    {
        $this->message = $message;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            $chatRoom = $this->message->chatRoom;
            $sender = $this->message->user;
            $senderName = $sender->name;

            // Get all room members except the sender
            $receivers = $chatRoom->members()
                ->where('user_id', '!=', $sender->id)
                ->where('login_status', true)
                ->get();

            Log::info('Preparing to send chat message notifications', [
                'chat_room_id' => $chatRoom->id,
                'message_id' => $this->message->id,
                'receivers_count' => $receivers->count(),
                'receivers' => $receivers->pluck('id')->toArray(),
            ]);

            if ($receivers->isEmpty()) {
                Log::info('No receivers found for chat message', [
                    'chat_room_id' => $chatRoom->id,
                    'message_id' => $this->message->id
                ]);
                return;
            }

            // Determine notification content based on room type
            if ($chatRoom->type === 'direct') {
                $title = "New Message";
                $body = "New message from {$senderName}";
            } else {
                $roomName = $chatRoom->name ?: 'Group Chat';
                $title = $roomName;
                $body = "{$senderName}: " . ($this->message->message ? substr($this->message->message, 0, 100) . (strlen($this->message->message) > 100 ? '...' : '') : 'Sent an attachment');
            }

            $chatUrl = route('chat.index');

            $firebaseService = app(FirebaseService::class);

            foreach ($receivers as $receiver) {
                $this->sendNotificationToReceiver($receiver, $title, $body, $chatUrl, $firebaseService);
            }

            Log::info('Chat message notifications sent successfully', [
                'message_id' => $this->message->id,
                'chat_room_id' => $chatRoom->id,
                'room_type' => $chatRoom->type,
                'receivers_count' => $receivers->count()
            ]);

        } catch (\Exception $e) {
            Log::error('Error in SendChatMessageNotification job: ' . $e->getMessage(), [
                'message_id' => $this->message->id ?? 'unknown',
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Send notification to individual receiver
     */
    private function sendNotificationToReceiver($receiver, $title, $body, $chatUrl, $firebaseService): void
    {
        try {
            $data = [
                'content_item_id' => (string) $this->message->id,
                'type' => 'chat_message',
                'message_id' => (string) $this->message->id,
                'chat_room_id' => (string) $this->message->chat_room_id,
                'chat_room_type' => $this->message->chatRoom->type,
                'sender_id' => (string) $this->message->user_id,
                'url' => $chatUrl,
                'click_action' => $chatUrl,
                'source_type' => 'chat',
                'source_id' => (string) $this->message->id,
            ];

            // Send Firebase notification (logs to push_notification_logs for admin overview)
            $result = $firebaseService->sendToUser($receiver->id, $title, $body, $data);

            $successCount = is_array($result) ? count(array_filter($result, fn ($r) => ($r['success'] ?? false))) : 0;
            if ($successCount > 0) {
                Log::info('✅ Firebase Chat notification sent successfully', [
                    'receiver_id' => $receiver->id,
                    'message_id' => $this->message->id,
                ]);
            } else {
                Log::warning('❌ Firebase Chat notification failed', [
                    'receiver_id' => $receiver->id,
                    'message_id' => $this->message->id,
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Error sending notification to receiver: ' . $e->getMessage(), [
                'receiver_id' => $receiver->id,
                'message_id' => $this->message->id
            ]);
        }
    }

    /**
     * Store notification in database
     */
    private function storeDatabaseNotification($user, $title, $body, $data): void
    {
        try {
            $user->notifications()->create([
                'title' => $title,
                'body' => $body,
                'data' => $data,
                'type' => 'chat_message',
                'read_at' => null,
            ]);
        } catch (\Exception $e) {
            Log::error('Error storing database notification: ' . $e->getMessage());
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('SendChatMessageNotification job failed: ' . $exception->getMessage(), [
            'message_id' => $this->message->id ?? 'unknown',
        ]);
    }
}
