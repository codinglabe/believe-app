<?php

namespace App\Enums;

enum PreferredPayoutMethod: string
{
    case Stripe = 'stripe';
    case PayPal = 'paypal';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return match ($this) {
            self::Stripe => 'Stripe Connect',
            self::PayPal => 'PayPal',
        };
    }
}
