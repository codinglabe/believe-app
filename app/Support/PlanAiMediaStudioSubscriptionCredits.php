<?php

namespace App\Support;

/**
 * Credits added to a user's AI Media Studio balance when they subscribe or renew a pricing plan.
 */
class PlanAiMediaStudioSubscriptionCredits
{
    public static function baseGrantAmount(): float
    {
        return (float) max(0, (int) config('services.ai_media_studio.plan_subscription_ai_media_studio_credits', 5));
    }

    /**
     * Credits to grant on plan checkout success: at least {@see baseGrantAmount()}, or higher if the plan defines
     * custom field `ai_media_studio_credits`.
     */
    public static function grantAmountForSubscribe(?int $parsedCustomAiMediaStudioCredits): float
    {
        $custom = $parsedCustomAiMediaStudioCredits !== null ? max(0, $parsedCustomAiMediaStudioCredits) : 0;
        $base = self::baseGrantAmount();

        return (float) max($base, $custom);
    }

    /**
     * Credits to grant on each subscription renewal (Stripe invoice), always the configured base amount.
     */
    public static function renewalGrantAmount(): float
    {
        return self::baseGrantAmount();
    }
}
