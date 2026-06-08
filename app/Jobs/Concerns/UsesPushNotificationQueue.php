<?php

namespace App\Jobs\Concerns;

/**
 * Push delivery must not depend on a long-running queue worker — mobile users
 * expect immediate alerts. Default connection is {@see config('services.firebase.queue_connection')}.
 */
trait UsesPushNotificationQueue
{
    protected function configurePushNotificationQueue(): void
    {
        $this->onConnection((string) config('services.firebase.queue_connection', 'sync'));
    }
}
