<?php

namespace App\Jobs;

use App\Mail\PasswordResetMail;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Password reset email — sent immediately after the forgot-password response via
 * dispatchAfterResponse(). On SMTP failure, the job is re-queued on the mail queue for retry.
 */
class SendPasswordResetEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 90;

    /** @var array<int, int> */
    public array $backoff = [5, 15, 45];

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

        if (! $user->email) {
            Log::warning('SendPasswordResetEmailJob: user has no email', ['user_id' => $this->userId]);

            return;
        }

        try {
            Mail::to($user->email)->send(
                new PasswordResetMail($user, $this->token, $this->domain),
            );
        } catch (Throwable $e) {
            if ($this->job === null) {
                Log::warning('Password reset email failed inline, queueing retry', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'error' => $e->getMessage(),
                ]);
                self::dispatch($this->userId, $this->token, $this->domain);
            }

            throw $e;
        }

        Log::info('Password reset email sent', [
            'user_id' => $user->id,
            'email' => $user->email,
        ]);
    }

    public function failed(Throwable $exception): void
    {
        Log::error('SendPasswordResetEmailJob failed after retries', [
            'user_id' => $this->userId,
            'error' => $exception->getMessage(),
        ]);
    }
}
