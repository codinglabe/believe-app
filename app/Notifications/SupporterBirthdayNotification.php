<?php

namespace App\Notifications;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Notifications\Notification;

/**
 * Sent from the birthday console command. Must not use ShouldQueue: the database row
 * must exist immediately so /notifications and the bell show the alert without a queue worker.
 */
class SupporterBirthdayNotification extends Notification
{
    public function __construct(
        public User $celebrant,
        public Organization $organization,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $first = explode(' ', trim($this->celebrant->name ?? 'Someone'))[0];
        $orgName = trim($this->organization->name ?? 'your nonprofit');

        return [
            'type' => 'supporter_birthday',
            'title' => "🎂 {$first}'s birthday today!",
            'body' => "{$first} follows {$orgName} and has a birthday today. Send Believe Points as a gift. Gifted points can be used for retail gift cards (not Visa or Mastercard).",
            'meta' => [
                'celebrant_id' => $this->celebrant->id,
                'celebrant_slug' => $this->celebrant->slug,
                'celebrant_name' => $this->celebrant->name,
                'celebrant_avatar' => $this->celebrant->image ? '/storage/'.$this->celebrant->image : null,
                'organization_id' => $this->organization->id,
                'organization_name' => $this->organization->name,
            ],
        ];
    }
}
