<?php

namespace App\Jobs;

use App\Mail\CampaignCreatedMail;
use App\Models\Campaign;
use App\Models\User;
use App\Support\CampaignDeliveryChannels;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendCampaignCreatedEmails implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 120;

    /** @var array<int, int> */
    public array $backoff = [10, 30, 60];

    public function __construct(
        public int $campaignId,
    ) {
        $this->onQueue('mail');
    }

    public function handle(): void
    {
        $campaign = Campaign::query()
            ->with(['organization:id,name', 'selectedUsers:id,name,email'])
            ->find($this->campaignId);

        if ($campaign === null) {
            Log::warning('Campaign created email job skipped: campaign not found', [
                'campaign_id' => $this->campaignId,
            ]);

            return;
        }

        $channels = is_array($campaign->channels) ? $campaign->channels : [];
        if (! CampaignDeliveryChannels::includesEmail($channels)) {
            return;
        }

        $organizationName = trim((string) ($campaign->organization?->name ?? ''));
        if ($organizationName === '') {
            $organizationName = 'An organization';
        }

        $campaignUrl = route('notifications.index');
        $startDateFormatted = $campaign->start_date?->format('F j, Y') ?? '';
        $endDateFormatted = $campaign->end_date?->format('F j, Y') ?? '';
        $sendTimeLocal = (string) ($campaign->send_time_local ?? '');

        $sent = 0;
        foreach ($campaign->selectedUsers as $recipient) {
            if ($this->sendToRecipient(
                $recipient,
                $organizationName,
                (string) $campaign->name,
                $startDateFormatted,
                $endDateFormatted,
                $sendTimeLocal,
                $campaignUrl,
            )) {
                $sent++;
            }
        }

        Log::info('Campaign created emails processed', [
            'campaign_id' => $campaign->id,
            'sent_count' => $sent,
            'recipient_count' => $campaign->selectedUsers->count(),
        ]);
    }

    private function sendToRecipient(
        User $recipient,
        string $organizationName,
        string $campaignName,
        string $startDateFormatted,
        string $endDateFormatted,
        string $sendTimeLocal,
        string $campaignUrl,
    ): bool {
        $email = trim((string) $recipient->email);
        if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            Log::info('Skipped campaign created email: invalid recipient email', [
                'campaign_id' => $this->campaignId,
                'user_id' => $recipient->id,
            ]);

            return false;
        }

        try {
            Mail::to($email)->send(new CampaignCreatedMail(
                recipientName: trim((string) $recipient->name),
                organizationName: $organizationName,
                campaignName: $campaignName,
                startDateFormatted: $startDateFormatted,
                endDateFormatted: $endDateFormatted,
                sendTimeLocal: $sendTimeLocal,
                campaignUrl: $campaignUrl,
            ));

            return true;
        } catch (\Throwable $e) {
            Log::error('Failed to send campaign created email', [
                'campaign_id' => $this->campaignId,
                'user_id' => $recipient->id,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('SendCampaignCreatedEmails job failed: '.$exception->getMessage(), [
            'campaign_id' => $this->campaignId,
        ]);
    }
}
