<?php

namespace App\Services;

use App\Models\AdminSetting;
use App\Models\PaymentMethod;

class BelievePointsWalletTransferSettingsService
{
    public function isEnabled(): bool
    {
        if (! (bool) AdminSetting::get('believe_points_enabled', true)) {
            return false;
        }

        $config = $this->bridgeAdditionalConfig();

        return (bool) ($config['believe_points_wallet_transfer_enabled'] ?? false)
            && $this->prefundedWalletId() !== '';
    }

    public function minAmount(): float
    {
        $config = $this->bridgeAdditionalConfig();

        return max(1.0, (float) ($config['believe_points_wallet_transfer_min'] ?? AdminSetting::get('believe_points_wallet_transfer_min', 1.0)));
    }

    public function maxAmount(): float
    {
        $config = $this->bridgeAdditionalConfig();

        return max($this->minAmount(), (float) ($config['believe_points_wallet_transfer_max'] ?? AdminSetting::get('believe_points_wallet_transfer_max', 10000.0)));
    }

    public function prefundedCustomerId(): string
    {
        $config = $this->bridgeAdditionalConfig();
        $isSandbox = app(BridgeService::class)->isSandbox();

        return trim((string) ($isSandbox
            ? ($config['sandbox_prefunded_customer_id'] ?? '')
            : ($config['live_prefunded_customer_id'] ?? '')));
    }

    public function prefundedWalletId(): string
    {
        $config = $this->bridgeAdditionalConfig();
        $isSandbox = app(BridgeService::class)->isSandbox();

        return trim((string) ($isSandbox
            ? ($config['sandbox_prefunded_wallet_id'] ?? '')
            : ($config['live_prefunded_wallet_id'] ?? '')));
    }

    /**
     * @return array<string, mixed>
     */
    public function frontendPayload(): array
    {
        return [
            'enabled' => $this->isEnabled(),
            'min_amount' => $this->minAmount(),
            'max_amount' => $this->maxAmount(),
            'sandbox_unavailable' => app(BridgeService::class)->isSandbox(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function bridgeAdditionalConfig(): array
    {
        $bridge = PaymentMethod::getConfig('bridge');
        $config = is_array($bridge?->additional_config) ? $bridge->additional_config : [];

        return $config;
    }
}
