<?php

namespace App\Jobs;

use App\Mail\WalletTransactionMail;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendWalletTransactionEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 120;

    /** @var array<int, int> */
    public array $backoff = [10, 30, 60];

    public function __construct(
        public int $transactionId,
        public int $userId,
        public string $headline,
        public string $message,
        public string $walletUrl,
    ) {
        $this->onQueue('mail');
    }

    public function handle(): void
    {
        $transaction = Transaction::query()->find($this->transactionId);
        if ($transaction === null) {
            Log::warning('Wallet transaction email skipped: transaction not found', [
                'transaction_id' => $this->transactionId,
            ]);

            return;
        }

        $user = User::query()->find($this->userId);
        if ($user === null) {
            Log::warning('Wallet transaction email skipped: user not found', [
                'transaction_id' => $this->transactionId,
                'user_id' => $this->userId,
            ]);

            return;
        }

        $email = trim((string) $user->email);
        if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            return;
        }

        try {
            Mail::to($email)->send(new WalletTransactionMail(
                $transaction,
                $user,
                $this->headline,
                $this->message,
                $this->walletUrl,
            ));
        } catch (\Throwable $e) {
            Log::error('Failed to send wallet transaction email', [
                'transaction_id' => $transaction->id,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
