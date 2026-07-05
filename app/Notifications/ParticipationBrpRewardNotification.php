<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

/**
 * In-app notification when participation BRP is awarded by the reward engine.
 */
class ParticipationBrpRewardNotification extends Notification
{
    /**
     * @param  array<string, mixed>  $metadata
     */
    public function __construct(
        public string $module,
        public string $title,
        public string $body,
        public string $deepLink,
        public float $pointsAwarded,
        public float $currentBalance,
        public int $referenceId,
        public string $referenceType = 'default',
        public array $metadata = [],
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toDatabase($notifiable));
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'participation_brp_reward',
            'title' => $this->title,
            'body' => $this->body,
            'message' => $this->body,
            'url' => $this->deepLink,
            'click_action' => $this->deepLink,
            'meta' => array_merge([
                'participation_module' => $this->module,
                'reference_id' => $this->referenceId,
                'reference_type' => $this->referenceType,
                'points_awarded' => $this->pointsAwarded,
                'current_brp_balance' => $this->currentBalance,
            ], $this->metadata),
        ];
    }
}
