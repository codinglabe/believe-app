<?php

namespace App\Jobs;

use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Sends the branded password-reset email on the dedicated mail queue so it is not
 * delayed behind IRS import and other long-running default-queue jobs.
 */
class SendPasswordResetEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 60;

    public function __construct(
        public int $userId,
        #[\SensitiveParameter] public string $token,
        public ?string $domain = null,
    ) {
        $this->onQueue('mail');
    }

    public function handle(): void
    {
        $user = User::find($this->userId);

        if (! $user) {
            Log::warning('SendPasswordResetEmailJob: user not found', ['user_id' => $this->userId]);

            return;
        }

        $user->notify(new ResetPasswordNotification($this->token, $this->domain));
    }
}
