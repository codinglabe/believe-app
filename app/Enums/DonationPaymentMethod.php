<?php

namespace App\Enums;

enum DonationPaymentMethod: string
{
    case StripeCard = 'stripe_card';
    case StripeAch = 'stripe_ach';
    case PayPal = 'paypal';
    case CashAppManual = 'cashapp';
    case Zelle = 'zelle';
    case VenmoManual = 'venmo_manual';
    case Venmo = 'venmo';
    case CashAppPay = 'cash_app_pay';
    case BelievePoints = 'believe_points';

    /** Legacy alias from existing donations. */
    case StripeLegacy = 'stripe';

    public function isManual(): bool
    {
        return in_array($this, [self::CashAppManual, self::Zelle, self::VenmoManual], true);
    }

    public function isStripeRail(): bool
    {
        return in_array($this, [
            self::StripeCard,
            self::StripeAch,
            self::Venmo,
            self::CashAppPay,
            self::StripeLegacy,
        ], true);
    }

    public function stripePaymentMethodTypes(): array
    {
        return match ($this) {
            self::StripeAch => ['us_bank_account'],
            self::Venmo => ['card', 'link'],
            self::CashAppPay => ['cashapp'],
            default => ['card'],
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::StripeCard, self::StripeLegacy => 'Card',
            self::StripeAch => 'ACH',
            self::PayPal => 'PayPal',
            self::CashAppManual => 'Cash App',
            self::Zelle => 'Zelle',
            self::VenmoManual => 'Venmo (Manual)',
            self::Venmo => 'Venmo (Stripe)',
            self::CashAppPay => 'Cash App Pay',
            self::BelievePoints => 'Believe Points',
        };
    }

    public static function tryFromInput(?string $value): ?self
    {
        if ($value === null || $value === '') {
            return null;
        }

        return self::tryFrom($value)
            ?? (in_array($value, ['card', 'us_bank_account'], true) ? self::StripeLegacy : null);
    }
}
