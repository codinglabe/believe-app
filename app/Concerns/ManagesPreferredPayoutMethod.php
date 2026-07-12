<?php

namespace App\Concerns;

use App\Enums\PreferredPayoutMethod;

trait ManagesPreferredPayoutMethod
{
    public function getPreferredPayoutMethod(): ?PreferredPayoutMethod
    {
        $value = $this->preferred_payout_method ?? null;
        if ($value === null || $value === '') {
            return null;
        }

        return PreferredPayoutMethod::tryFrom((string) $value);
    }

    public function isStripePayoutReady(): bool
    {
        if ($this->stripe_connect_account_id === null || $this->stripe_connect_account_id === '') {
            return false;
        }

        $type = strtolower(trim((string) ($this->stripe_connect_account_type ?? '')));
        if ($type === 'express' || $type === 'custom') {
            return false;
        }

        return (bool) $this->stripe_connect_charges_enabled && (bool) $this->stripe_connect_payouts_enabled;
    }

    public function isPayPalPayoutReady(): bool
    {
        return filled($this->paypal_payout_email) && (bool) $this->paypal_payouts_enabled;
    }

    public function isPayoutReady(): bool
    {
        $preferred = $this->getPreferredPayoutMethod();
        if ($preferred === null) {
            return false;
        }

        return match ($preferred) {
            PreferredPayoutMethod::Stripe => $this->isStripePayoutReady(),
            PreferredPayoutMethod::PayPal => $this->isPayPalPayoutReady(),
        };
    }

    public function payoutContactEmail(): ?string
    {
        return match ($this->getPreferredPayoutMethod()) {
            PreferredPayoutMethod::PayPal => $this->paypal_payout_email,
            PreferredPayoutMethod::Stripe => $this->payoutContactEmailForStripe(),
            default => null,
        };
    }

    abstract protected function payoutContactEmailForStripe(): ?string;
}
