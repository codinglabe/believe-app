<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

/**
 * In-app confirmation when a supporter completes a qualifying participation activity.
 */
class ParticipationConfirmedNotification extends Notification
{
    /**
     * @param  array<string, mixed>  $metadata
     */
    public function __construct(
        public string $module,
        public string $title,
        public string $body,
        public string $deepLink,
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
            'type' => 'participation_confirmed',
            'title' => $this->title,
            'body' => $this->body,
            'message' => $this->body,
            'url' => $this->deepLink,
            'click_action' => $this->deepLink,
            'meta' => array_merge([
                'participation_module' => $this->module,
                'reference_id' => $this->referenceId,
                'reference_type' => $this->referenceType,
            ], $this->metadata),
        ];
    }
}
