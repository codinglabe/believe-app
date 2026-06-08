<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Cashier;
use Stripe\Checkout\Session as CheckoutSession;
use Stripe\PaymentMethod;

class UserStripePaymentMethodService
{
    public const SETUP_METADATA_TYPE = 'user_saved_payment_method_setup';

    /**
     * @return list<array{
     *     id: string,
     *     type: string,
     *     brand: string|null,
     *     last4: string|null,
     *     exp_month: int|null,
     *     exp_year: int|null,
     *     bank_name: string|null,
     *     is_default: bool
     * }>
     */
    public static function listForUser(User $user): array
    {
        if (! StripeEnvironmentSyncService::ensureUserStripeCustomer($user)) {
            return [];
        }

        $user->refresh();

        if (! $user->stripe_id) {
            return [];
        }

        $defaultId = self::getDefaultPaymentMethodId($user);
        $methods = [];

        foreach (['card', 'us_bank_account'] as $type) {
            $page = Cashier::stripe()->paymentMethods->all([
                'customer' => $user->stripe_id,
                'type' => $type,
                'limit' => 20,
            ]);

            foreach ($page->data as $paymentMethod) {
                $methods[] = self::formatPaymentMethod($paymentMethod, $defaultId);
            }
        }

        return $methods;
    }

    public static function getDefaultPaymentMethodId(User $user): ?string
    {
        if (! $user->stripe_id) {
            return null;
        }

        try {
            $customer = Cashier::stripe()->customers->retrieve($user->stripe_id, [
                'expand' => ['invoice_settings.default_payment_method'],
            ]);

            $default = $customer->invoice_settings->default_payment_method ?? null;

            if (is_string($default) && $default !== '') {
                return $default;
            }

            if (is_object($default) && isset($default->id)) {
                return (string) $default->id;
            }
        } catch (\Throwable $e) {
            Log::warning('Could not load default payment method', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }

        return null;
    }

    /**
     * @return array{
     *     id: string,
     *     type: string,
     *     brand: string|null,
     *     last4: string|null,
     *     exp_month: int|null,
     *     exp_year: int|null,
     *     bank_name: string|null,
     *     is_default: bool
     * }
     */
    public static function formatPaymentMethod(PaymentMethod $paymentMethod, ?string $defaultId): array
    {
        $card = $paymentMethod->card ?? null;
        $bank = $paymentMethod->us_bank_account ?? null;

        return [
            'id' => (string) $paymentMethod->id,
            'type' => (string) $paymentMethod->type,
            'brand' => $card?->brand ?? $bank?->bank_name ?? null,
            'last4' => $card?->last4 ?? $bank?->last4 ?? null,
            'exp_month' => $card?->exp_month ?? null,
            'exp_year' => $card?->exp_year ?? null,
            'bank_name' => $bank?->bank_name ?? null,
            'is_default' => $defaultId !== null && $defaultId === (string) $paymentMethod->id,
        ];
    }

    public static function paymentMethodBelongsToUser(User $user, string $paymentMethodId): bool
    {
        if (! $user->stripe_id) {
            return false;
        }

        try {
            $paymentMethod = Cashier::stripe()->paymentMethods->retrieve($paymentMethodId);
            $customerId = self::normalizeStripeCustomerId($paymentMethod->customer);

            return $customerId === (string) $user->stripe_id;
        } catch (\Throwable) {
            return false;
        }
    }

    public static function setDefault(User $user, string $paymentMethodId): void
    {
        BelievePointsPaymentMethodSyncService::ensurePaymentMethodBelongsToCustomer($user, $paymentMethodId);
        $user->refresh();
        $user->updateDefaultPaymentMethod($paymentMethodId);
    }

    public static function detach(User $user, string $paymentMethodId): void
    {
        if (! self::paymentMethodBelongsToUser($user, $paymentMethodId)) {
            throw new \RuntimeException('Payment method does not belong to this account.');
        }

        try {
            Cashier::stripe()->paymentMethods->detach($paymentMethodId);
        } catch (\Throwable $e) {
            Log::warning('Could not detach payment method', [
                'user_id' => $user->id,
                'payment_method' => $paymentMethodId,
                'error' => $e->getMessage(),
            ]);
        }

        $defaultId = self::getDefaultPaymentMethodId($user);
        if ($defaultId === $paymentMethodId) {
            Cashier::stripe()->customers->update($user->stripe_id, [
                'invoice_settings' => ['default_payment_method' => ''],
            ]);
            $user->forceFill([
                'pm_type' => null,
                'pm_last_four' => null,
            ])->save();
        }

        if ($user->believe_points_auto_replenish_pm_id === $paymentMethodId) {
            $user->forceFill([
                'believe_points_auto_replenish_pm_id' => null,
                'believe_points_auto_replenish_card_brand' => null,
                'believe_points_auto_replenish_card_last4' => null,
            ])->save();
        }

        if ($user->sms_auto_recharge_pm_id === $paymentMethodId) {
            $user->forceFill([
                'sms_auto_recharge_pm_id' => null,
                'sms_auto_recharge_card_brand' => null,
                'sms_auto_recharge_card_last4' => null,
            ])->save();
        }
    }

    public static function createSetupCheckoutSession(
        User $user,
        string $instrument,
        string $successUrl,
        string $cancelUrl,
    ): CheckoutSession {
        if (! StripeEnvironmentSyncService::ensureUserStripeCustomer($user)) {
            throw new \RuntimeException('Could not create Stripe customer.');
        }

        $user->refresh();

        $paymentMethodTypes = $instrument === 'bank' ? ['us_bank_account'] : ['card'];
        $currency = strtolower((string) config('cashier.currency', 'usd'));

        return Cashier::stripe()->checkout->sessions->create([
            'customer' => $user->stripe_id,
            'mode' => 'setup',
            'currency' => $currency,
            'payment_method_types' => $paymentMethodTypes,
            'success_url' => $successUrl,
            'cancel_url' => $cancelUrl,
            'metadata' => [
                'user_id' => (string) $user->id,
                'type' => self::SETUP_METADATA_TYPE,
                'instrument' => $instrument,
            ],
        ]);
    }

    public static function completeSetupFromCheckoutSession(User $user, string $sessionId): string
    {
        $session = Cashier::stripe()->checkout->sessions->retrieve($sessionId);

        if (($session->metadata->type ?? '') !== self::SETUP_METADATA_TYPE
            || (int) ($session->metadata->user_id ?? 0) !== (int) $user->id) {
            throw new \RuntimeException('This setup session does not match your account.');
        }

        $setupIntentId = $session->setup_intent;
        if (! $setupIntentId) {
            throw new \RuntimeException('Could not confirm your payment method.');
        }

        $setupIntent = Cashier::stripe()->setupIntents->retrieve(
            is_string($setupIntentId) ? $setupIntentId : $setupIntentId->id
        );

        $paymentMethodId = is_string($setupIntent->payment_method)
            ? $setupIntent->payment_method
            : ($setupIntent->payment_method->id ?? null);

        if (! $paymentMethodId) {
            throw new \RuntimeException('No payment method was saved.');
        }

        BelievePointsPaymentMethodSyncService::ensurePaymentMethodBelongsToCustomer($user, $paymentMethodId);

        if (! self::getDefaultPaymentMethodId($user)) {
            $user->updateDefaultPaymentMethod($paymentMethodId);
        }

        return $paymentMethodId;
    }

    /**
     * @return list<array{
     *     id: string,
     *     type: string,
     *     brand: string|null,
     *     last4: string|null,
     *     exp_month: int|null,
     *     exp_year: int|null,
     *     bank_name: string|null,
     *     is_default: bool
     * }>
     */
    public static function listCardsForUser(User $user): array
    {
        return array_values(array_filter(
            self::listForUser($user),
            static fn (array $method): bool => $method['type'] === 'card',
        ));
    }

    public static function resolveSavedCardId(User $user, ?string $preferredId = null): ?string
    {
        if ($preferredId && self::paymentMethodBelongsToUser($user, $preferredId)) {
            if (self::railForPaymentMethod($preferredId) === 'card') {
                return $preferredId;
            }
        }

        $defaultId = self::getDefaultPaymentMethodId($user);
        if ($defaultId && self::railForPaymentMethod($defaultId) === 'card') {
            return $defaultId;
        }

        $cards = self::listCardsForUser($user);

        return $cards[0]['id'] ?? null;
    }

    public static function syncAutoReplenishCard(User $user, string $paymentMethodId): void
    {
        if (self::railForPaymentMethod($paymentMethodId) !== 'card') {
            throw new \RuntimeException('Auto top-up requires a saved card.');
        }

        BelievePointsPaymentMethodSyncService::ensurePaymentMethodBelongsToCustomer($user, $paymentMethodId);
        $paymentMethod = Cashier::stripe()->paymentMethods->retrieve($paymentMethodId);
        $card = $paymentMethod->card ?? null;

        $user->forceFill([
            'believe_points_auto_replenish_pm_id' => $paymentMethodId,
            'believe_points_auto_replenish_card_brand' => $card?->brand,
            'believe_points_auto_replenish_card_last4' => $card?->last4,
        ])->save();
    }

    public static function railForPaymentMethod(string $paymentMethodId): ?string
    {
        try {
            $paymentMethod = Cashier::stripe()->paymentMethods->retrieve($paymentMethodId);

            return match ($paymentMethod->type) {
                'card' => 'card',
                'us_bank_account' => 'bank',
                default => null,
            };
        } catch (\Throwable) {
            return null;
        }
    }

    private static function normalizeStripeCustomerId(mixed $customer): string
    {
        if ($customer === null) {
            return '';
        }
        if (is_string($customer)) {
            return $customer;
        }
        if (is_object($customer) && isset($customer->id)) {
            return (string) $customer->id;
        }

        return '';
    }
}
