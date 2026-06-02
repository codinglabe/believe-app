<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

/**
 * In-app notification for the daily engagement push. Push delivery is handled
 * separately via {@see \App\Services\FirebaseService} in the send job.
 */
class DailyEngagementNotification extends Notification
{
    public function __construct(
        public string $body,
        public int $messageIndex,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'daily_engagement',
            'title' => (string) config('daily_engagement.title', config('app.name')),
            'body' => $this->body,
            'meta' => [
                'message_index' => $this->messageIndex,
            ],
        ];
    }
}
