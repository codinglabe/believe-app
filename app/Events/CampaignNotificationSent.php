<?php

namespace App\Events;

use App\Models\ContentItem;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CampaignNotificationSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $contentItem;
    public $userId;
    public $channel;

    public function __construct(ContentItem $contentItem, int $userId, string $channel)
    {
        $this->contentItem = $contentItem;
        $this->userId = $userId;
        $this->channel = $channel;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.' . $this->userId),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'campaign.notification';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'id' => uniqid('notif_'),
            'title' => $this->contentItem->title,
            'body' => strip_tags($this->contentItem->body),
            'content_item_id' => $this->contentItem->id,
            'type' => $this->contentItem->type,
            'channel' => $this->channel,
            'meta' => $this->contentItem->meta ?? [],
            'timestamp' => now()->toISOString(),
        ];
    }
}
