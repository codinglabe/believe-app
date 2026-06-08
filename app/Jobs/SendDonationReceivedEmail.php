<?php

namespace App\Jobs;

use App\Mail\DonationReceivedMail;
use App\Models\Donation;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendDonationReceivedEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 120;

    /** @var array<int, int> */
    public array $backoff = [10, 30, 60];

    public function __construct(
        public int $donationId,
        public int $orgUserId,
    ) {
        $this->onQueue('mail');
    }

    public function handle(): void
    {
        $donation = Donation::query()
            ->with(['user:id,name', 'organization'])
            ->find($this->donationId);

        if ($donation === null) {
            Log::warning('Donation received email job skipped: donation not found', [
                'donation_id' => $this->donationId,
            ]);

            return;
        }

        $orgUser = User::query()->find($this->orgUserId);
        if ($orgUser === null) {
            Log::warning('Donation received email job skipped: organization user not found', [
                'donation_id' => $this->donationId,
                'org_user_id' => $this->orgUserId,
            ]);

            return;
        }

        $email = trim((string) $orgUser->email);
        if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            Log::warning('Donation received email job skipped: invalid organization email', [
                'donation_id' => $this->donationId,
                'org_user_id' => $this->orgUserId,
            ]);

            return;
        }

        $donorName = trim((string) ($donation->user?->name ?? 'A supporter')) ?: 'A supporter';
        $donationsUrl = route('donations.index');

        try {
            Mail::to($email)->send(new DonationReceivedMail(
                $donation,
                $orgUser,
                $donorName,
                $donationsUrl,
            ));

            Log::info('Donation received email sent', [
                'donation_id' => $donation->id,
                'org_user_id' => $orgUser->id,
                'email' => $email,
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to send donation received email', [
                'donation_id' => $donation->id,
                'org_user_id' => $orgUser->id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
