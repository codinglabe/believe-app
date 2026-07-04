<?php

namespace App\Services;

use App\Data\OrganizationSetupChecklistItems;
use App\Models\AiChatConversation;
use App\Models\AiVideo;
use App\Models\Campaign;
use App\Models\FacebookAccount;
use App\Models\Newsletter;
use App\Models\Organization;
use App\Models\Transaction;
use App\Models\User;
use App\Models\UserLivestream;
use App\Support\LivestreamOverlayConfig;
use App\Support\PayAsYouGoServices;
use App\Support\UserEmailCredits;

class OrganizationSetupChecklistService
{
    public function __construct(
        private readonly OrganizationOnboardingService $onboardingService,
    ) {}

    /**
     * @return array{
     *     percent: int,
     *     completed: int,
     *     total: int,
     *     sections: list<array{
     *         id: string,
     *         label: string,
     *         completed: int,
     *         total: int,
     *         percent: int,
     *         items: list<array<string, mixed>>
     *     }>
     * }|null
     */
    public function forOrganization(?Organization $organization, ?User $user): ?array
    {
        if (! $organization || ! $user) {
            return null;
        }

        $organization->loadMissing(['emailConnections', 'livestreams', 'bridgeIntegration']);

        $statusById = $this->resolveStatuses($organization, $user);

        $items = collect(OrganizationSetupChecklistItems::all())
            ->map(function (array $def) use ($statusById) {
                $status = $statusById[$def['id']] ?? 'not_started';

                return [
                    'id' => $def['id'],
                    'section' => $def['section'],
                    'label' => $def['label'],
                    'description' => $def['description'],
                    'route' => $def['route'],
                    'route_label' => $this->actionLabel($status, $def['route_label']),
                    'status' => $status,
                ];
            })
            ->values()
            ->all();

        $sections = collect($items)
            ->groupBy('section')
            ->map(function ($sectionItems, $sectionId) {
                $completed = $sectionItems->where('status', 'completed')->count();
                $total = $sectionItems->count();
                $percent = $total > 0 ? (int) round(($completed / $total) * 100) : 100;

                return [
                    'id' => (string) $sectionId,
                    'label' => $sectionId === OrganizationSetupChecklistItems::SECTION_SYSTEM ? 'System' : 'Tools',
                    'completed' => $completed,
                    'total' => $total,
                    'percent' => $percent,
                    'items' => $sectionItems->values()->all(),
                ];
            })
            ->values()
            ->sortBy(fn (array $s) => $s['id'] === OrganizationSetupChecklistItems::SECTION_SYSTEM ? 0 : 1)
            ->values()
            ->all();

        $completed = collect($items)->where('status', 'completed')->count();
        $total = count($items);
        $percent = $total > 0 ? (int) round(($completed / $total) * 100) : 100;

        return [
            'percent' => $percent,
            'completed' => $completed,
            'total' => $total,
            'sections' => $sections,
        ];
    }

    /**
     * @return array<string, 'completed'|'in_progress'|'not_started'>
     */
    private function resolveStatuses(Organization $organization, User $user): array
    {
        $integrationCount = $this->connectedIntegrationCount($organization);

        $stripeStarted = filled($organization->stripe_connect_account_id);
        $stripeReady = StripeConnectOrganizationService::organizationCanAcceptDirectDonations($organization);

        $paypalStarted = filled($organization->paypal_payout_email);
        $paypalReady = (bool) $organization->paypal_payouts_enabled;

        $payoutPreferenceSet = filled($organization->preferred_payout_method);
        $payoutReady = $organization->isPayoutReady();

        $youtubePartial = filled($organization->youtube_channel_url ?? null)
            && ! filled($organization->youtube_access_token ?? null);

        $dropboxConnected = filled($organization->dropbox_refresh_token ?? null);

        $facebookConnected = FacebookAccount::query()
            ->where('organization_id', $organization->id)
            ->where('is_connected', true)
            ->exists();
        $facebookPartial = ! $facebookConnected && FacebookAccount::query()
            ->where('organization_id', $organization->id)
            ->exists();

        $emailConnectionCount = $organization->emailConnections()->where('is_active', true)->count();
        $emailInvitesSent = (int) ($user->emails_used ?? 0) > 0;

        $onboardingComplete = $this->onboardingService->isComplete($organization);
        $onboardingPartial = ! $onboardingComplete
            && ($this->onboardingService->profileCompletionForOrganization($organization)['completed'] ?? 0) > 0;

        $bridge = BridgeVerificationService::payloadForOrganization($organization);
        $ownershipVerified = $user->ownership_verified_at !== null;

        $verificationComplete = $onboardingComplete || $bridge['is_verified'] || $ownershipVerified;
        $verificationPartial = ! $verificationComplete && ($onboardingPartial || $bridge['initialized']);

        $payg = PayAsYouGoServices::forUser($user);
        $paygPurchased = Transaction::query()
            ->where('user_id', $user->id)
            ->whereIn('type', ['email_purchase', 'sms_purchase', 'credit_purchase'])
            ->where('status', 'completed')
            ->exists();
        $paygUsed = (int) ($user->emails_used ?? 0) > 0
            || (int) ($user->sms_used ?? 0) > 0
            || (int) ($user->ai_tokens_used ?? 0) > 0;
        $paygHasBalance = $payg['email']['balance'] > 0
            || $payg['sms']['balance'] > 0
            || $payg['ai']['balance'] > 0;

        $overlayConfigured = $this->overlayStudioConfigured($organization);
        $livestreamCount = $organization->livestreams()->count();
        $livestreamStarted = $organization->livestreams()->whereNotNull('started_at')->exists();
        $livestreamScheduled = $organization->livestreams()->whereNotNull('scheduled_at')->whereNull('started_at')->exists();

        $unityMeetCount = UserLivestream::query()->where('user_id', $user->id)->count();

        $aiChatUsed = AiChatConversation::query()->where('user_id', $user->id)->exists()
            || (int) ($user->ai_tokens_used ?? 0) > 0;

        $aiStudioUsed = AiVideo::query()->where('organization_id', $organization->id)->exists()
            || (float) ($user->ai_media_studio_credits ?? 0) > 0;

        $engagementStarted = Newsletter::query()->where('organization_id', $organization->id)->exists();
        $campaignStarted = Campaign::query()->where('organization_id', $organization->id)->exists();

        return [
            'integrations' => $this->status($integrationCount >= 2, $integrationCount === 1),
            'payout_settings' => $this->status($payoutReady, $payoutPreferenceSet && ! $payoutReady),
            'email_invites' => $this->status($emailConnectionCount > 0, $emailInvitesSent && $emailConnectionCount === 0),
            'social_media' => $this->status($facebookConnected, $facebookPartial),
            'youtube' => $this->status(filled($organization->youtube_access_token ?? null), $youtubePartial),
            'stripe_payouts' => $this->status($stripeReady, $stripeStarted && ! $stripeReady),
            'paypal_payouts' => $this->status($paypalReady, $paypalStarted && ! $paypalReady),
            'dropbox' => $this->status($dropboxConnected, false),
            'organization_verification' => $this->status($verificationComplete, $verificationPartial),

            'ai_chat' => $this->status($aiChatUsed, false),
            'pay_as_you_go' => $this->status($paygPurchased, ! $paygPurchased && ($paygUsed || $paygHasBalance)),
            'overlay_studio' => $this->status($overlayConfigured, false),
            'livestream' => $this->status($livestreamCount > 0, false),
            'unity_live' => $this->status($livestreamStarted, $livestreamScheduled),
            'unity_meet' => $this->status($unityMeetCount > 0, false),
            'ai_video_studio' => $this->status($aiStudioUsed, false),
            'engagement' => $this->status($engagementStarted, false),
            'auto_drip_campaign' => $this->status($campaignStarted, false),
        ];
    }

    private function connectedIntegrationCount(Organization $organization): int
    {
        $count = 0;

        if (filled($organization->stripe_connect_account_id)) {
            $count++;
        }
        if ((bool) $organization->paypal_payouts_enabled) {
            $count++;
        }
        if (filled($organization->dropbox_refresh_token ?? null)) {
            $count++;
        }
        if (filled($organization->youtube_access_token ?? null)) {
            $count++;
        }
        if (FacebookAccount::query()->where('organization_id', $organization->id)->where('is_connected', true)->exists()) {
            $count++;
        }
        if ($organization->emailConnections()->where('is_active', true)->exists()) {
            $count++;
        }

        return $count;
    }

    private function overlayStudioConfigured(Organization $organization): bool
    {
        $raw = $organization->livestream_overlay_settings;
        if (! is_array($raw) || $raw === []) {
            return false;
        }

        $config = LivestreamOverlayConfig::merge($raw);
        $defaults = LivestreamOverlayConfig::defaults();

        $fields = [
            'speaker_name',
            'banner_message',
            'banner_cta',
            'donation_message',
            'donation_cta',
            'sponsor_label',
            'scrolling_message',
            'qr_label',
        ];

        foreach ($fields as $field) {
            if (trim((string) ($config[$field] ?? '')) !== trim((string) ($defaults[$field] ?? ''))
                && trim((string) ($config[$field] ?? '')) !== '') {
                return true;
            }
        }

        if (! empty($config['logo_path']) && empty($config['logo_from_profile'])) {
            return true;
        }

        if (! empty($config['sponsor_image_path']) || ! empty($config['qr_code_path'])) {
            return true;
        }

        if (($config['accent_color'] ?? '') !== ($defaults['accent_color'] ?? '')) {
            return true;
        }

        return false;
    }

    /**
     * @return 'completed'|'in_progress'|'not_started'
     */
    private function status(bool $completed, bool $inProgress): string
    {
        if ($completed) {
            return 'completed';
        }

        if ($inProgress) {
            return 'in_progress';
        }

        return 'not_started';
    }

    private function actionLabel(string $status, string $defaultLabel): string
    {
        return match ($status) {
            'completed' => 'View',
            'in_progress' => 'Continue',
            default => $defaultLabel === 'View' ? 'Start' : $defaultLabel,
        };
    }
}
