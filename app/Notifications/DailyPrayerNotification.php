<?php

namespace App\Notifications;

use App\Models\ContentItem;
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
                return ['broadcast', 'database'];

            case 'web':
                // Web: Only broadcast and database
                return ['broadcast', 'database'];

            default:
                // Default: Only database
                return ['database'];
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
