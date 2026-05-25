<?php

namespace App\Support;

use App\Models\Plan;
use App\Models\User;
use App\Models\WalletPlan;
use Illuminate\Support\Facades\DB;

final class SupporterSubscriptionService
{
    public const SLUG_FREE = 'free_supporter';

    public const SLUG_PRIME = 'prime_supporter';

    public const SUBSCRIPTION_TYPE = 'wallet_access';

    /** @return list<string> */
    public static function supporterSlugs(): array
    {
        return [self::SLUG_FREE, self::SLUG_PRIME];
    }

    public static function isSupporterPlan(?WalletPlan $plan): bool
    {
        return $plan !== null
            && is_string($plan->slug)
            && in_array($plan->slug, self::supporterSlugs(), true);
    }

    public static function isSupporterMirrorPlan(Plan $plan, ?User $user = null): bool
    {
        if (str_starts_with($plan->stripe_price_id ?? '', 'local_wallet_plan_')) {
            return true;
        }

        $slug = data_get($user?->current_plan_details, 'wallet_plan_slug');
        if (is_string($slug) && in_array($slug, self::supporterSlugs(), true)) {
            return true;
        }

        return false;
    }

    public static function organizationPricingCurrentPlan(?User $user): ?Plan
    {
        if (! $user || ! $user->current_plan_id) {
            return null;
        }

        if (($user->role ?? null) === 'user') {
            return null;
        }

        $plan = Plan::query()->find($user->current_plan_id);
        if (! $plan || self::isSupporterMirrorPlan($plan, $user)) {
            return null;
        }

        return $plan;
    }

    public static function activeWalletSubscription(User $user): ?\Laravel\Cashier\Subscription
    {
        return $user->subscriptions()
            ->where('type', self::SUBSCRIPTION_TYPE)
            ->whereIn('stripe_status', ['active', 'trialing'])
            ->where(function ($query) {
                $query->whereNull('ends_at')->orWhere('ends_at', '>', now());
            })
            ->latest('id')
            ->first();
    }

    public static function hasActiveWalletAccess(User $user): bool
    {
        if (self::activeWalletSubscription($user) !== null) {
            return true;
        }

        $slug = data_get($user->current_plan_details, 'wallet_plan_slug');

        return is_string($slug) && in_array($slug, self::supporterSlugs(), true);
    }

    public static function currentWalletPlan(User $user): ?WalletPlan
    {
        $slug = data_get($user->current_plan_details, 'wallet_plan_slug');
        if (is_string($slug) && $slug !== '') {
            $bySlug = WalletPlan::query()->where('slug', $slug)->first();
            if ($bySlug) {
                return $bySlug;
            }
        }

        $walletPlanId = data_get($user->current_plan_details, 'wallet_plan_id');
        if ($walletPlanId) {
            $byId = WalletPlan::query()->find($walletPlanId);
            if ($byId) {
                return $byId;
            }
        }

        if ($user->current_plan_id) {
            $mirror = Plan::query()->find($user->current_plan_id);
            if ($mirror?->stripe_price_id) {
                $byStripe = WalletPlan::query()->where('stripe_price_id', $mirror->stripe_price_id)->first();
                if ($byStripe) {
                    return $byStripe;
                }

                if (str_starts_with($mirror->stripe_price_id, 'local_wallet_plan_')) {
                    $slug = substr($mirror->stripe_price_id, strlen('local_wallet_plan_'));
                    if ($slug !== '') {
                        return WalletPlan::query()->where('slug', $slug)->first();
                    }
                }
            }
        }

        return null;
    }

    public static function currentTierSlug(User $user): ?string
    {
        $plan = self::currentWalletPlan($user);

        return $plan?->slug;
    }

    /** @return array{allowed: bool, message: string|null} */
    public static function canSubscribe(User $user, WalletPlan $walletPlan): array
    {
        if (in_array($user->role, ['organization', 'organization_pending'], true)) {
            return [
                'allowed' => false,
                'message' => 'Organization accounts subscribe through organization plans.',
            ];
        }

        $currentSlug = self::currentTierSlug($user);

        if ($currentSlug === $walletPlan->slug) {
            return [
                'allowed' => false,
                'message' => 'You already have this supporter plan active.',
            ];
        }

        if ($currentSlug === self::SLUG_PRIME && $walletPlan->slug === self::SLUG_FREE) {
            return [
                'allowed' => false,
                'message' => 'You already have Prime Supporter.',
            ];
        }

        return ['allowed' => true, 'message' => null];
    }

    public static function mirrorStripePriceId(WalletPlan $walletPlan): string
    {
        if ($walletPlan->stripe_price_id) {
            return $walletPlan->stripe_price_id;
        }

        return 'local_wallet_plan_'.($walletPlan->slug ?: 'id_'.$walletPlan->id);
    }

    public static function mirrorStripeProductId(WalletPlan $walletPlan): string
    {
        if ($walletPlan->stripe_product_id) {
            return $walletPlan->stripe_product_id;
        }

        return 'local_wallet_product_'.($walletPlan->slug ?: 'id_'.$walletPlan->id);
    }

    public static function resolveMirrorPlan(WalletPlan $walletPlan): Plan
    {
        $mirrorStripePriceId = self::mirrorStripePriceId($walletPlan);
        $mirrorStripeProductId = self::mirrorStripeProductId($walletPlan);

        $existing = Plan::query()->where('stripe_price_id', $mirrorStripePriceId)->first();
        if ($existing) {
            return $existing;
        }

        $existingByName = Plan::query()
            ->where('name', $walletPlan->name)
            ->where('price', $walletPlan->price)
            ->first();

        if ($existingByName) {
            if (! $existingByName->stripe_price_id || ! $existingByName->stripe_product_id) {
                $existingByName->update([
                    'stripe_price_id' => $existingByName->stripe_price_id ?: $mirrorStripePriceId,
                    'stripe_product_id' => $existingByName->stripe_product_id ?: $mirrorStripeProductId,
                ]);
            }

            return $existingByName->fresh();
        }

        return Plan::query()->create([
            'name' => $walletPlan->name,
            'frequency' => $walletPlan->frequency,
            'price' => $walletPlan->price,
            'stripe_price_id' => $mirrorStripePriceId,
            'stripe_product_id' => $mirrorStripeProductId,
            'description' => $walletPlan->description,
            'trial_days' => $walletPlan->trial_days,
            'is_active' => true,
        ]);
    }

    public static function activate(User $user, WalletPlan $walletPlan): void
    {
        DB::transaction(function () use ($user, $walletPlan) {
            /** @var User $lockedUser */
            $lockedUser = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();

            self::endLocalSubscriptions($lockedUser);

            if ((float) $walletPlan->price <= 0) {
                $lockedUser->subscriptions()->updateOrCreate(
                    ['stripe_id' => 'local_wallet_'.$lockedUser->id],
                    [
                        'type' => self::SUBSCRIPTION_TYPE,
                        'stripe_status' => 'active',
                        'stripe_price' => self::mirrorStripePriceId($walletPlan),
                        'quantity' => 1,
                        'trial_ends_at' => null,
                        'ends_at' => null,
                    ]
                );
            }

            $mirror = self::resolveMirrorPlan($walletPlan);

            $lockedUser->update([
                'current_plan_id' => $mirror->id,
                'current_plan_details' => [
                    'name' => $walletPlan->name,
                    'price' => (float) $walletPlan->price,
                    'frequency' => $walletPlan->frequency,
                    'wallet_plan_id' => $walletPlan->id,
                    'wallet_plan_slug' => $walletPlan->slug,
                    'subscribed_at' => now()->toIso8601String(),
                ],
            ]);
        });
    }

    public static function endLocalSubscriptions(User $user): void
    {
        $user->subscriptions()
            ->where('type', self::SUBSCRIPTION_TYPE)
            ->where('stripe_id', 'like', 'local_wallet_%')
            ->update([
                'stripe_status' => 'canceled',
                'ends_at' => now(),
            ]);
    }

    /** @return array{id: int, slug: string|null, name: string, price: float, frequency: string, description: string|null} */
    public static function walletPlanToFrontend(WalletPlan $plan): array
    {
        return [
            'id' => $plan->id,
            'slug' => $plan->slug,
            'name' => $plan->name,
            'price' => (float) $plan->price,
            'frequency' => $plan->frequency,
            'description' => $plan->description,
        ];
    }

    /** @return array{tier: string, name: string, price: float}|null */
    public static function subscriptionStateForUser(?User $user): ?array
    {
        if (! $user) {
            return null;
        }

        $plan = self::currentWalletPlan($user);
        if (! $plan || ! self::isSupporterPlan($plan)) {
            return null;
        }

        return [
            'tier' => (string) $plan->slug,
            'name' => $plan->name,
            'price' => (float) $plan->price,
        ];
    }
}
