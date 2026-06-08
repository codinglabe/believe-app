<?php

namespace App\Services;

use App\Enums\PushNotificationModule;
use App\Jobs\SendDonationConfirmationEmail;
use App\Jobs\SendDonationReceivedEmail;
use App\Models\Donation;
use App\Models\User;
use App\Notifications\DonationConfirmedForDonorNotification;
use App\Notifications\DonationReceivedForOrganizationNotification;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DonationCompletionNotifier
{
    public function __construct(
        private readonly FirebaseService $firebaseService,
    ) {}

    public function notify(Donation $donation): void
    {
        if (! in_array($donation->status, ['completed', 'active'], true)) {
            return;
        }

        if (! $donation->organization_id) {
            return;
        }

        $donationId = $donation->id;

        DB::afterCommit(function () use ($donationId): void {
            $cacheKey = 'donation_completion_notify:'.$donationId;
            if (! Cache::add($cacheKey, 1, now()->addDays(30))) {
                return;
            }

            $donation = Donation::query()
                ->with(['user', 'organization.user', 'careAlliance:id,name,slug'])
                ->find($donationId);

            if ($donation === null || ! in_array($donation->status, ['completed', 'active'], true)) {
                Cache::forget($cacheKey);

                return;
            }

            $this->notifyDonor($donation);
            $this->notifyOrganization($donation);
        });
    }

    private function notifyDonor(Donation $donation): void
    {
        $donor = $donation->user;
        if (! $donor instanceof User) {
            return;
        }

        $recipientLabel = $this->recipientLabel($donation);
        $amountLabel = $this->formatAmount($donation);
        $successUrl = route('donations.success', ['donation_id' => $donation->id]);

        $title = 'Donation confirmed';
        $body = "Thank you! Your {$amountLabel} gift to {$recipientLabel} was received.";

        try {
            $donor->notify(new DonationConfirmedForDonorNotification($donation, $recipientLabel, $successUrl));
        } catch (\Throwable $e) {
            Log::warning('Donation donor in-app notification failed', [
                'donation_id' => $donation->id,
                'user_id' => $donor->id,
                'error' => $e->getMessage(),
            ]);
        }

        $pushData = $this->firebaseService->stringifyFcmData([
            'type' => 'donation_confirmed',
            'title' => $title,
            'body' => $body,
            'url' => $successUrl,
            'click_action' => $successUrl,
            'donation_id' => (string) $donation->id,
            'organization_id' => (string) $donation->organization_id,
            'source_type' => 'donation',
            'source_id' => (string) $donation->id,
            'module_name' => PushNotificationModule::Donations->value,
            'module_record_id' => $donation->id,
            'created_by' => $donor->id,
            'deep_link' => parse_url($successUrl, PHP_URL_PATH) ?: $successUrl,
        ]);

        try {
            $this->firebaseService->sendToUser($donor->id, $title, $body, $pushData);
        } catch (\Throwable $e) {
            Log::warning('Donation donor push notification failed', [
                'donation_id' => $donation->id,
                'user_id' => $donor->id,
                'error' => $e->getMessage(),
            ]);
        }

        $email = trim((string) $donor->email);
        if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
            try {
                SendDonationConfirmationEmail::dispatch($donation->id, $donor->id);
            } catch (\Throwable $e) {
                Log::warning('Donation donor confirmation email job dispatch failed', [
                    'donation_id' => $donation->id,
                    'user_id' => $donor->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    private function notifyOrganization(Donation $donation): void
    {
        $organization = $donation->organization;
        $orgUser = $organization?->user;
        if (! $orgUser instanceof User) {
            return;
        }

        $donorName = trim((string) ($donation->user?->name ?? 'A supporter')) ?: 'A supporter';
        $amountLabel = $this->formatAmount($donation);
        $donationsUrl = route('donations.index');
        $isRecurring = $donation->frequency && $donation->frequency !== 'one-time';

        $title = 'New donation received';
        $body = "{$donorName} donated {$amountLabel}".($isRecurring ? ' (recurring)' : '').'.';

        try {
            $orgUser->notify(new DonationReceivedForOrganizationNotification($donation, $donorName, $donationsUrl));
        } catch (\Throwable $e) {
            Log::warning('Donation organization in-app notification failed', [
                'donation_id' => $donation->id,
                'organization_id' => $donation->organization_id,
                'user_id' => $orgUser->id,
                'error' => $e->getMessage(),
            ]);
        }

        $pushData = $this->firebaseService->stringifyFcmData([
            'type' => 'donation_received',
            'title' => $title,
            'body' => $body,
            'url' => $donationsUrl,
            'click_action' => $donationsUrl,
            'donation_id' => (string) $donation->id,
            'organization_id' => (string) $donation->organization_id,
            'donor_user_id' => $donation->user_id ? (string) $donation->user_id : '',
            'source_type' => 'donation',
            'source_id' => (string) $donation->id,
            'module_name' => PushNotificationModule::Donations->value,
            'module_record_id' => $donation->id,
            'created_by' => $donation->user_id,
            'deep_link' => parse_url($donationsUrl, PHP_URL_PATH) ?: $donationsUrl,
        ]);

        try {
            $this->firebaseService->sendToUser($orgUser->id, $title, $body, $pushData);
        } catch (\Throwable $e) {
            Log::warning('Donation organization push notification failed', [
                'donation_id' => $donation->id,
                'organization_id' => $donation->organization_id,
                'user_id' => $orgUser->id,
                'error' => $e->getMessage(),
            ]);
        }

        $email = trim((string) $orgUser->email);
        if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
            try {
                SendDonationReceivedEmail::dispatch($donation->id, $orgUser->id);
            } catch (\Throwable $e) {
                Log::warning('Donation organization received email job dispatch failed', [
                    'donation_id' => $donation->id,
                    'organization_id' => $donation->organization_id,
                    'user_id' => $orgUser->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    private function recipientLabel(Donation $donation): string
    {
        if ($donation->care_alliance_id && $donation->careAlliance) {
            return trim((string) $donation->careAlliance->name) ?: 'Unity Impact Alliance';
        }

        return trim((string) ($donation->organization?->name ?? '')) ?: 'Organization';
    }

    private function formatAmount(Donation $donation): string
    {
        return '$'.number_format((float) $donation->amount, 2);
    }
}
