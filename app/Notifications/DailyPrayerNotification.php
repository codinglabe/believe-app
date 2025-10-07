<?php

namespace App\Notifications;

use App\Models\ContentItem;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;
use NotificationChannels\Twilio\TwilioChannel;
use NotificationChannels\Twilio\TwilioSmsMessage;
use Illuminate\Support\Facades\Log;

class DailyPrayerNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $contentItem;
    protected $channel;

    public function __construct(ContentItem $contentItem, string $channel = 'web')
    {
        $this->contentItem = $contentItem;
        $this->channel = $channel;
    }

    public function via($notifiable): array
    {
        // Channel-specific via methods
        switch ($this->channel) {
            case 'whatsapp':
                // WhatsApp: Only send via Twilio, NO database/broadcast
                return [TwilioChannel::class];

            case 'push':
                // Push: Only broadcast (for real-time) and database
                return ['broadcast', 'database'];

            case 'web':
                // Web: Only broadcast (for real-time) and database
                return ['broadcast', 'database'];

            default:
                // Default: Only database
                return ['database'];
        }
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

    public function toBroadcast($notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'id' => $this->id, // Important for Laravel Echo
            'type' => get_class($this),
            'title' => $this->contentItem->title,
            'body' => strip_tags($this->contentItem->body),
            'content_item_id' => $this->contentItem->id,
            'type' => 'daily_prayer',
            'channel' => $this->channel,
            'meta' => $this->contentItem->meta ?? [],
            'timestamp' => now()->toISOString(),
        ]);
    }

    public function toDatabase($notifiable): array
    {
        return [
            'title' => $this->contentItem->title,
            'body' => strip_tags($this->contentItem->body),
            'content_item_id' => $this->contentItem->id,
            'type' => 'daily_prayer',
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
