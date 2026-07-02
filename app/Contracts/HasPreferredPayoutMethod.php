<?php

namespace App\Contracts;

use App\Enums\PreferredPayoutMethod;

interface HasPreferredPayoutMethod
{
    public function getPreferredPayoutMethod(): ?PreferredPayoutMethod;

    public function isStripePayoutReady(): bool;

    public function isPayPalPayoutReady(): bool;

    public function isPayoutReady(): bool;

    public function payoutDisplayName(): string;

    public function payoutContactEmail(): ?string;
}
