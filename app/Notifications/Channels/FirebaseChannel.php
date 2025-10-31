<?php

namespace App\Notifications\Channels;

use Illuminate\Notifications\Notification;

class FirebaseChannel
{
    /**
     * Send the given notification.
     */
    public function send($notifiable, Notification $notification)
    {
        if (method_exists($notification, 'toFirebase')) {
            return $notification->toFirebase($notifiable);
        }
    }
}
