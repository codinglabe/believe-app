<?php

namespace App\Jobs;

use App\Jobs\Concerns\UsesPushNotificationQueue;
use App\Models\DailyEngagementNotificationLog;
use App\Models\User;
use App\Notifications\DailyEngagementNotification;
use App\Services\FirebaseService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendDailyEngagementPushJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels, UsesPushNotificationQueue;

    public int $tries = 1;

    public int $timeout = 60;

    public function __construct(
        public int $userId,
        public string $body,
        public int $messageIndex,
        public string $sentOn,
    ) {
        $this->configurePushNotificationQueue();
    }

    public function handle(FirebaseService $firebase): void
    {
        if (DailyEngagementNotificationLog::query()
            ->where('user_id', $this->userId)
            ->whereDate('sent_on', $this->sentOn)
            ->exists()) {
            return;
        }

        $user = User::query()->find($this->userId);
        if (! $user || ! $user->shouldReceivePush()) {
            return;
        }

        $title = (string) config('daily_engagement.title', config('app.name'));
        $homeUrl = url('/');

        $results = $firebase->sendToUser($user->id, $title, $this->body, [
            'type' => 'daily_engagement',
            'message_index' => (string) $this->messageIndex,
            'click_action' => $homeUrl,
            'url' => $homeUrl,
            'source_type' => 'daily_engagement',
            'source_id' => $this->sentOn,
            'module_name' => 'daily_engagement',
        ]);

        $successCount = is_array($results)
            ? count(array_filter($results, fn ($r) => ($r['success'] ?? false)))
            : 0;

        if ($successCount === 0) {
            Log::warning('Daily engagement push failed for user', [
                'user_id' => $user->id,
                'sent_on' => $this->sentOn,
            ]);

            return;
        }

        $user->notify(new DailyEngagementNotification($this->body, $this->messageIndex));

        DailyEngagementNotificationLog::create([
            'user_id' => $user->id,
            'sent_on' => $this->sentOn,
            'message_index' => $this->messageIndex,
        ]);
    }
}
