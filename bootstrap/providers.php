<?php

return [
    App\Providers\AppServiceProvider::class,
    App\Providers\BroadcastServiceProvider::class,
    NotificationChannels\Twilio\TwilioProvider::class,
];
