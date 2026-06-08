<?php

namespace App\Jobs;

use App\Mail\DonationConfirmationMail;
use App\Models\Donation;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendDonationConfirmationEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 120;

    /** @var array<int, int> */
    public array $backoff = [10, 30, 60];

    public function __construct(
        public int $donationId,
        public int $donorUserId,
    ) {
        $this->onQueue('mail');
    }

    public function handle(): void
    {
        $donation = Donation::query()
            ->with(['organization', 'careAlliance:id,name,slug'])
            ->find($this->donationId);

        if ($donation === null) {
            Log::warning('Donation confirmation email job skipped: donation not found', [
                'donation_id' => $this->donationId,
            ]);

            return;
        }

        $donor = User::query()->find($this->donorUserId);
        if ($donor === null) {
            Log::warning('Donation confirmation email job skipped: donor not found', [
                'donation_id' => $this->donationId,
                'donor_user_id' => $this->donorUserId,
            ]);

            return;
        }

        $email = trim((string) $donor->email);
        if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            Log::warning('Donation confirmation email job skipped: invalid donor email', [
                'donation_id' => $this->donationId,
                'donor_user_id' => $this->donorUserId,
            ]);

            return;
        }

        $recipientLabel = $this->recipientLabel($donation);
        $successUrl = route('donations.success', ['donation_id' => $donation->id]);

        try {
            Mail::to($email)->send(new DonationConfirmationMail(
                $donation,
                $donor,
                $recipientLabel,
                $successUrl,
            ));

            Log::info('Donation confirmation email sent', [
                'donation_id' => $donation->id,
                'donor_user_id' => $donor->id,
                'email' => $email,
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to send donation confirmation email', [
                'donation_id' => $donation->id,
                'donor_user_id' => $donor->id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    private function recipientLabel(Donation $donation): string
    {
        if ($donation->care_alliance_id && $donation->careAlliance) {
            return trim((string) $donation->careAlliance->name) ?: 'Unity Impact Alliance';
        }

        return trim((string) ($donation->organization?->name ?? '')) ?: 'Organization';
    }
}
