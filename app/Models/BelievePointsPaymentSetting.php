<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BelievePointsPaymentSetting extends Model
{
    protected $fillable = [
        'stripe_card_enabled',
        'stripe_ach_enabled',
        'stripe_venmo_enabled',
        'venmo_manual_enabled',
        'venmo_username',
        'stripe_cash_app_pay_enabled',
        'paypal_enabled',
        'cashapp_manual_enabled',
        'zelle_enabled',
        'cashapp_qr_image',
        'cashapp_cashtag',
        'zelle_email',
        'zelle_phone',
        'payment_instructions',
    ];

    protected $casts = [
        'stripe_card_enabled' => 'boolean',
        'stripe_ach_enabled' => 'boolean',
        'stripe_venmo_enabled' => 'boolean',
        'venmo_manual_enabled' => 'boolean',
        'stripe_cash_app_pay_enabled' => 'boolean',
        'paypal_enabled' => 'boolean',
        'cashapp_manual_enabled' => 'boolean',
        'zelle_enabled' => 'boolean',
    ];

    public static function instance(): self
    {
        return static::firstOrCreate(
            ['id' => 1],
            [
                'stripe_card_enabled' => true,
                'stripe_ach_enabled' => true,
            ]
        );
    }

    /**
     * @return array<string, bool>
     */
    public function enabledMethodsMap(): array
    {
        return [
            'stripe_card' => (bool) $this->stripe_card_enabled,
            'stripe_ach' => (bool) $this->stripe_ach_enabled,
            'venmo' => (bool) $this->stripe_venmo_enabled,
            'venmo_manual' => (bool) $this->venmo_manual_enabled,
            'cash_app_pay' => (bool) $this->stripe_cash_app_pay_enabled,
            'paypal' => (bool) $this->paypal_enabled,
            'cashapp' => (bool) $this->cashapp_manual_enabled,
            'zelle' => (bool) $this->zelle_enabled,
        ];
    }

    public function isMethodEnabled(string $method): bool
    {
        return ($this->enabledMethodsMap()[$method] ?? false) === true;
    }
}
