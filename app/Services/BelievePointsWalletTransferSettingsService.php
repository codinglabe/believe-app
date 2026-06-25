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
            && ($this->prefundedWalletId() !== '' || $this->prefundedAccountId() !== '');
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

    public function prefundedAccountId(): string
    {
        $config = $this->bridgeAdditionalConfig();
        $isSandbox = app(BridgeService::class)->isSandbox();

        return trim((string) ($isSandbox
            ? ($config['sandbox_prefunded_account_id'] ?? '')
            : ($config['live_prefunded_account_id'] ?? '')));
    }

    public function prefundedAccountName(): string
    {
        $config = $this->bridgeAdditionalConfig();
        $isSandbox = app(BridgeService::class)->isSandbox();

        return trim((string) ($isSandbox
            ? ($config['sandbox_prefunded_account_name'] ?? '')
            : ($config['live_prefunded_account_name'] ?? '')));
    }

    /**
     * @return array{customer_id: string, wallet_id: string}|null
     */
    public function resolvedPrefundedWallet(): ?array
    {
        $service = app(BridgeService::class);
        $walletId = $this->prefundedWalletId();
        $customerId = $this->prefundedCustomerId();

        if ($walletId !== '') {
            $parsed = $service->parseBridgeWalletForTransfer($customerId, $walletId);
            if ($parsed !== null) {
                if ($customerId === '') {
                    $walletResult = $service->getBridgeWalletById($walletId);
                    if (($walletResult['success'] ?? false) && is_array($walletResult['data'] ?? null)) {
                        $customerId = $service->extractCustomerIdFromPayload($walletResult['data']);
                    }
                }

                return [
                    'customer_id' => $customerId,
                    'wallet_id' => $walletId,
                ];
            }
        }

        $resolved = $service->resolvePlatformPrefundedWallet(
            $customerId,
            $walletId,
            $this->prefundedAccountId() !== '' ? $this->prefundedAccountId() : null,
            null,
            $this->prefundedAccountName() !== '' ? $this->prefundedAccountName() : null,
        );

        if ($resolved === null) {
            return null;
        }

        return [
            'customer_id' => $resolved['customer_id'],
            'wallet_id' => $resolved['wallet_id'],
        ];
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
