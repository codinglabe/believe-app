<?php

namespace App\Notifications;

use App\Models\ContentItem;
use App\Services\FirebaseService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;
use NotificationChannels\Twilio\TwilioChannel;
use NotificationChannels\Twilio\TwilioSmsMessage;
use Illuminate\Support\Facades\Log;

class DailyPrayerNotification extends Notification implements ShouldQueue, ShouldBroadcast
{
    use Queueable;

    protected $contentItem;
    protected $channel;
    protected $notifiable; // Add this property

    public function __construct(ContentItem $contentItem, string $channel = 'web')
    {
        $this->contentItem = $contentItem;
        $this->channel = $channel;
    }

    public function via($notifiable): array
    {
        // Store the notifiable for broadcast
        $this->notifiable = $notifiable;

        // Channel-specific via methods
        switch ($this->channel) {
            case 'whatsapp':
                // WhatsApp: Only send via Twilio
                return [TwilioChannel::class];

            case 'push':
                // Push: Only broadcast and database
                return ['broadcast', 'database', 'firebase'];

            case 'web':
                // Web: Only broadcast and database
                return ['broadcast', 'database', 'firebase'];

            default:
                // Default: Only database
                return ['database'];
        }
    }

    public function toFirebase($notifiable)
    {
        if (!$notifiable->pushTokens) {
            Log::warning('User has no push token', ['user_id' => $notifiable->id]);
            return null;
        }

        Log::info('Sending Firebase notification for content item', [
            'content_item_id' => $this->contentItem->id,
            'title' => $this->contentItem->title,
            'user_id' => $notifiable->id,
        ]);

        try {
            $firebaseService = new FirebaseService();

            $data = [
                'content_item_id' => (string) $this->contentItem->id,
                'type' => $this->contentItem->type,
                'channel' => $this->channel,
                'click_action' => route('notifications.content.show', ['content_item' => $this->contentItem->id]),
                'url' => route('notifications.content.show', ['content_item' => $this->contentItem->id]),
            ];

            // Add meta data if exists
            if ($this->contentItem->meta && is_array($this->contentItem->meta)) {
                foreach ($this->contentItem->meta as $key => $value) {
                    if (is_array($value)) {
                        $data['meta_' . $key] = json_encode($value);
                    } else {
                        $data['meta_' . $key] = (string) $value;
                    }
                }
            }

            // Add image URL if available
            if (isset($this->contentItem->meta['image_url'])) {
                $data['image_url'] = $this->contentItem->meta['image_url'];
            }


            $result = $firebaseService->sendToUser(
                $notifiable->id,
                $this->contentItem->title,
                strip_tags($this->contentItem->body),
                $data
            );

            Log::info('Firebase notification sent successfully', [
                'user_id' => $notifiable->id,
                'content_item_id' => $this->contentItem->id,
            ]);

            return $result;

        } catch (\Exception $e) {
            Log::error('Firebase notification error', [
                'user_id' => $notifiable->id,
                'content_item_id' => $this->contentItem->id,
                'error_message' => $e->getMessage(),
            ]);

            return null;
        }
    }
    /**
     * Define the broadcast channels
     */
    public function broadcastOn()
    {
        // Check if notifiable is set
        if (!$this->notifiable) {
            return [];
        }

        // Broadcast to user's private channel
        return new \Illuminate\Broadcasting\PrivateChannel('user.' . $this->notifiable->id);
    }

    /**
     * The event's broadcast name
     */
    public function broadcastAs()
    {
        return 'campaign.notification';
    }

    /**
     * Get the data to broadcast
     */
    public function toBroadcast($notifiable): BroadcastMessage
    {
        // Store notifiable if not already set
        if (!$this->notifiable) {
            $this->notifiable = $notifiable;
        }

        return new BroadcastMessage([
            'id' => $this->id, // Notification ID
            'title' => $this->contentItem->title,
            'body' => strip_tags($this->contentItem->body),
            'content_item_id' => $this->contentItem->id,
            'type' => $this->contentItem->type,
            'content_type' => $this->contentItem->type,
            'channel' => $this->channel,
            'meta' => $this->contentItem->meta ?? [],
            'timestamp' => now()->toISOString(),
            'notification_id' => $this->id,
        ]);
    }

    public function toTwilio($notifiable)
    {
        Log::info('Sending WhatsApp notification', [
            'user_id' => $notifiable->id,
            'content_item_id' => $this->contentItem->id,
        ]);

        $message = "🙏 *{$this->contentItem->title}*\n\n";
        $message .= strip_tags($this->contentItem->body);

        if (isset($this->contentItem->meta['scripture_ref'])) {
            $message .= "\n\n📖 " . $this->contentItem->meta['scripture_ref'];
        }

        $message .= "\n\n---\nReply STOP to unsubscribe";

        return (new TwilioSmsMessage())
            ->content($message);
    }

    public function toDatabase($notifiable): array
    {
        return [
            'title' => $this->contentItem->title,
            'body' => strip_tags($this->contentItem->body),
            'content_item_id' => $this->contentItem->id,
            'type' => $this->contentItem->type,
            'channel' => $this->channel,
            'meta' => $this->contentItem->meta ?? [],
            'sent_at' => now()->toISOString(),
        ];
    }

    public function toArray($notifiable): array
    {
        return [
            'title' => $this->contentItem->title,
            'body' => strip_tags($this->contentItem->body),
            'content_item_id' => $this->contentItem->id,
            'channel' => $this->channel,
        ];
    }
}
