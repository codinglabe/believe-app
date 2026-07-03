<?php

namespace App\Data;

/**
 * Organization setup checklist — System + Tools sections.
 */
class OrganizationSetupChecklistItems
{
    public const SECTION_SYSTEM = 'system';

    public const SECTION_TOOLS = 'tools';

    /** Temporarily hidden from the setup checklist UI (re-enable by removing ids here). */
    private const HIDDEN_ITEM_IDS = [
        'social_media',
        'youtube',
    ];

    /**
     * @return list<array{
     *     id: string,
     *     section: string,
     *     label: string,
     *     description: string,
     *     route: string,
     *     route_label: string
     * }>
     */
    public static function all(): array
    {
        return array_values(array_filter(
            self::definitions(),
            static fn (array $item): bool => ! in_array($item['id'], self::HIDDEN_ITEM_IDS, true)
        ));
    }

    /**
     * @return list<array{
     *     id: string,
     *     section: string,
     *     label: string,
     *     description: string,
     *     route: string,
     *     route_label: string
     * }>
     */
    private static function definitions(): array
    {
        return [
            // —— System ——
            [
                'id' => 'payout_settings',
                'section' => self::SECTION_SYSTEM,
                'label' => 'Payout settings',
                'description' => 'Choose Stripe Connect or PayPal for Marketplace, Merchant Hub, Courses, and Events payouts.',
                'route' => 'integrations.payout-settings',
                'route_label' => 'Configure',
            ],
            [
                'id' => 'integrations',
                'section' => self::SECTION_SYSTEM,
                'label' => 'Integrations',
                'description' => 'Connect and manage your third-party integrations.',
                'route' => 'integrations.payout-settings',
                'route_label' => 'Manage',
            ],
            [
                'id' => 'email_invites',
                'section' => self::SECTION_SYSTEM,
                'label' => 'Email invites',
                'description' => 'Send email invites to your team and supporters.',
                'route' => 'email-invite.index',
                'route_label' => 'Open',
            ],
            [
                'id' => 'social_media',
                'section' => self::SECTION_SYSTEM,
                'label' => 'Social media',
                'description' => 'Connect your social media accounts.',
                'route' => 'social-media.index',
                'route_label' => 'Connect',
            ],
            [
                'id' => 'youtube',
                'section' => self::SECTION_SYSTEM,
                'label' => 'YouTube',
                'description' => 'Connect your YouTube channel.',
                'route' => 'integrations.youtube',
                'route_label' => 'Connect',
            ],
            [
                'id' => 'paypal_payouts',
                'section' => self::SECTION_SYSTEM,
                'label' => 'PayPal payouts',
                'description' => 'Connect PayPal Business to receive payouts for selling modules.',
                'route' => 'integrations.paypal-payouts',
                'route_label' => 'Connect',
            ],
            [
                'id' => 'stripe_payouts',
                'section' => self::SECTION_SYSTEM,
                'label' => 'Stripe payouts (donations)',
                'description' => 'Set up Stripe to receive donations and payouts.',
                'route' => 'integrations.stripe-connect',
                'route_label' => 'Continue',
            ],
            [
                'id' => 'dropbox',
                'section' => self::SECTION_SYSTEM,
                'label' => 'Dropbox (recordings)',
                'description' => 'Connect Dropbox to store and manage recordings.',
                'route' => 'integrations.dropbox',
                'route_label' => 'Connect',
            ],
            [
                'id' => 'organization_verification',
                'section' => self::SECTION_SYSTEM,
                'label' => 'Organization verification',
                'description' => 'Verify your organization details and documents.',
                'route' => 'governance.onboarding.index',
                'route_label' => 'Start',
            ],

            // —— Tools (9) ——
            [
                'id' => 'ai_chat',
                'section' => self::SECTION_TOOLS,
                'label' => 'AI (ChatGPT assistant)',
                'description' => 'Access AI assistance to help with content and tasks.',
                'route' => 'ai-chat.index',
                'route_label' => 'Open',
            ],
            [
                'id' => 'pay_as_you_go',
                'section' => self::SECTION_TOOLS,
                'label' => 'Pay-As-You-Go services',
                'description' => 'Re-up email, SMS, and AI token balances as you grow.',
                'route' => 'pay-as-you-go.index',
                'route_label' => 'Re-Up',
            ],
            [
                'id' => 'overlay_studio',
                'section' => self::SECTION_TOOLS,
                'label' => 'Unity Live Overlay Studio',
                'description' => 'Create and manage your live overlays.',
                'route' => 'organization.livestreams.overlay-studio',
                'route_label' => 'Open',
            ],
            [
                'id' => 'livestream',
                'section' => self::SECTION_TOOLS,
                'label' => 'Livestream',
                'description' => 'Set up your livestream events and preferences.',
                'route' => 'organization.livestreams.index',
                'route_label' => 'Continue',
            ],
            [
                'id' => 'unity_live',
                'section' => self::SECTION_TOOLS,
                'label' => 'Unity Live',
                'description' => 'Go live directly on Unity Live.',
                'route' => 'livestreams.supporter.live',
                'route_label' => 'Start',
            ],
            [
                'id' => 'unity_meet',
                'section' => self::SECTION_TOOLS,
                'label' => 'Unity Meet',
                'description' => 'Host and manage virtual meetings.',
                'route' => 'livestreams.supporter.index',
                'route_label' => 'Start',
            ],
            [
                'id' => 'ai_video_studio',
                'section' => self::SECTION_TOOLS,
                'label' => 'AI Video Studio',
                'description' => 'Generate short-form video with AI credits.',
                'route' => 'ai-media-studio.index',
                'route_label' => 'Open',
            ],
            [
                'id' => 'engagement',
                'section' => self::SECTION_TOOLS,
                'label' => 'Engagement (email & SMS)',
                'description' => 'Create newsletters and reach supporters by email or text.',
                'route' => 'newsletter.index',
                'route_label' => 'Open',
            ],
            [
                'id' => 'auto_drip_campaign',
                'section' => self::SECTION_TOOLS,
                'label' => 'Auto Drip Campaign',
                'description' => 'Automate recurring email and social campaigns.',
                'route' => 'campaigns.index',
                'route_label' => 'Create',
            ],
        ];
    }

    public static function find(string $id): ?array
    {
        foreach (self::all() as $item) {
            if ($item['id'] === $id) {
                return $item;
            }
        }

        return null;
    }
}
