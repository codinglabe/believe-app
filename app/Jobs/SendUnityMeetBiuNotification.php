<?php

namespace App\Jobs;

use App\Models\UserLivestream;
use App\Services\UnityMeetBiuNotifier;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendUnityMeetBiuNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;

    public $timeout = 120;

    public function __construct(
        public int $livestreamId,
        public string $recipientEmail,
    ) {}

    public function handle(UnityMeetBiuNotifier $notifier): void
    {
        $livestream = UserLivestream::query()->find($this->livestreamId);

        if (! $livestream) {
            Log::warning('Unity Meet BIU notification skipped: livestream not found', [
                'livestream_id' => $this->livestreamId,
            ]);

            return;
        }

        if (in_array($livestream->status, ['cancelled', 'ended'], true)) {
            Log::info('Unity Meet BIU notification skipped: meeting no longer active', [
                'livestream_id' => $livestream->id,
                'status' => $livestream->status,
            ]);

            return;
        }

        $result = $notifier->notifyByEmail($livestream, $this->recipientEmail);

        if (! $result['sent'] && $result['reason'] === 'no_biu_account') {
            Log::info('Unity Meet BIU notification skipped: no BIU account for email', [
                'livestream_id' => $this->livestreamId,
                'email' => $this->recipientEmail,
            ]);
        }
    }
}
