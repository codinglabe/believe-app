<?php

namespace App\Services;

use App\Models\CareAlliance;
use App\Models\Organization;
use App\Models\User;

/**
 * Builds the human-readable strings that show in the Stripe Dashboard "Description" column,
 * on subscription rows, and (when a 22-char-clean version is needed) on bank-statement
 * descriptors. Centralised so Connect destination charges, classic platform charges, and
 * recurring subscriptions all read identically across surfaces.
 */
final class DonationStripeDescriptionBuilder
{
    /**
     * Stripe truncates PaymentIntent descriptions at 1000 chars but only the first ~80 are
     * visible in the dashboard list view. Keep ours below that.
     */
    private const PI_DESCRIPTION_MAX = 250;

    private const SUBSCRIPTION_DESCRIPTION_MAX = 500;

    /**
     * Statement descriptor suffix limits per Stripe (alphanumeric + spaces, 22 chars max).
     */
    private const STATEMENT_SUFFIX_MAX = 22;

    /**
     * Description for one-time PaymentIntents (Stripe → Payments tab → Description column).
     * Example: "$50.00 donation to Helping Hands from John Smith".
     */
    public static function forPaymentIntent(
        Organization $organization,
        ?CareAlliance $alliance,
        User $donor,
        float $giftAmountUsd,
        ?float $checkoutTotalUsd,
        bool $donorCoversFees,
        ?float $processingFeeUsd
    ): string {
        $recipient = self::recipientName($organization, $alliance);
        $donorLabel = self::donorLabel($donor);

        $line = sprintf(
            '$%s donation to %s from %s',
            self::formatUsd($giftAmountUsd),
            $recipient,
            $donorLabel
        );

        if ($donorCoversFees && $processingFeeUsd !== null && $processingFeeUsd > 0 && $checkoutTotalUsd !== null) {
            $line .= sprintf(' (donor covered $%s in payment provider fees)', self::formatUsd($processingFeeUsd));
        }

        return self::truncate($line, self::PI_DESCRIPTION_MAX);
    }

    /**
     * Description that lives on the Stripe Subscription record (and on each invoice line by default).
     * Example: "$25.00/month recurring donation to Helping Hands from John Smith".
     */
    public static function forSubscription(
        Organization $organization,
        ?CareAlliance $alliance,
        User $donor,
        float $giftAmountUsd,
        string $frequency
    ): string {
        $recipient = self::recipientName($organization, $alliance);
        $donorLabel = self::donorLabel($donor);
        $intervalLabel = self::intervalLabel($frequency);

        $line = sprintf(
            '$%s%s recurring donation to %s from %s',
            self::formatUsd($giftAmountUsd),
            $intervalLabel === '' ? '' : '/'.$intervalLabel,
            $recipient,
            $donorLabel
        );

        return self::truncate($line, self::SUBSCRIPTION_DESCRIPTION_MAX);
    }

    /**
     * Bank-statement-safe suffix for the Stripe statement descriptor.
     *
     * Stripe requires Latin alphanumerics + spaces only, at least one letter, and rejects
     * '<', '>', "'", '"', '\\', '*'. We strip everything else (including Unicode ellipsis) and
     * hard-clamp to 22 characters with no decoration.
     */
    public static function forStatementDescriptorSuffix(Organization $organization, ?CareAlliance $alliance): string
    {
        $base = self::recipientName($organization, $alliance);
        $clean = preg_replace('/[^A-Za-z0-9 ]+/', '', $base) ?? '';
        $clean = preg_replace('/\s+/', ' ', $clean) ?? '';
        $clean = trim((string) $clean);

        if ($clean === '' || ! preg_match('/[A-Za-z]/', $clean)) {
            return 'Donation';
        }

        if (mb_strlen($clean) > self::STATEMENT_SUFFIX_MAX) {
            $clean = rtrim(mb_substr($clean, 0, self::STATEMENT_SUFFIX_MAX));
        }

        return $clean;
    }

    private static function recipientName(Organization $organization, ?CareAlliance $alliance): string
    {
        if ($alliance !== null) {
            $name = trim((string) ($alliance->name ?? ''));
            if ($name !== '') {
                return $name;
            }
        }

        return trim((string) ($organization->name ?? '')) !== ''
            ? (string) $organization->name
            : 'organization';
    }

    private static function donorLabel(User $donor): string
    {
        $name = trim((string) ($donor->name ?? ''));
        if ($name !== '') {
            return $name;
        }
        $email = trim((string) ($donor->email ?? ''));

        return $email !== '' ? $email : 'donor';
    }

    private static function intervalLabel(string $frequency): string
    {
        return match ($frequency) {
            'weekly' => 'week',
            'monthly' => 'month',
            'yearly', 'annually' => 'year',
            default => '',
        };
    }

    private static function formatUsd(float $amount): string
    {
        return number_format($amount, 2, '.', '');
    }

    private static function truncate(string $value, int $max): string
    {
        if (mb_strlen($value) <= $max) {
            return $value;
        }

        return rtrim(mb_substr($value, 0, $max - 1)).'…';
    }
}
