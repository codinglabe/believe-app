<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class SupporterBirthdayNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public User $celebrant
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $first = explode(' ', trim($this->celebrant->name ?? 'Someone'))[0];

        return [
            'type' => 'supporter_birthday',
            'title' => "🎂 {$first}'s birthday today!",
            'body' => 'Celebrate and send Believe Points as a gift. Gifted points can be used for retail gift cards (not Visa or Mastercard).',
            'meta' => [
                'celebrant_id' => $this->celebrant->id,
                'celebrant_slug' => $this->celebrant->slug,
                'celebrant_name' => $this->celebrant->name,
                'celebrant_avatar' => $this->celebrant->image ? '/storage/'.$this->celebrant->image : null,
            ],
        ];
    }
}
