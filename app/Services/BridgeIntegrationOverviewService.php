<?php

namespace App\Services;

use App\Models\PaymentMethod;

class BridgeIntegrationOverviewService
{
    public function __construct(
        private BridgeService $bridgeService,
    ) {}

    /**
     * @return array{
     *     active_environment: string,
     *     sandbox: array<string, mixed>,
     *     live: array<string, mixed>
     * }
     */
    public function build(?PaymentMethod $bridge, array $additionalConfig): array
    {
        return [
            'active_environment' => $bridge->mode_environment ?? 'sandbox',
            'sandbox' => $this->forEnvironment('sandbox', $bridge, $additionalConfig),
            'live' => $this->forEnvironment('live', $bridge, $additionalConfig),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function forEnvironment(string $environment, ?PaymentMethod $bridge, array $additionalConfig): array
    {
        $isSandbox = $environment === 'sandbox';

        $apiKey = trim((string) ($isSandbox ? ($bridge->sandbox_api_key ?? '') : ($bridge->live_api_key ?? '')));
        $webhookId = trim((string) ($isSandbox ? ($bridge->sandbox_webhook_id ?? '') : ($bridge->live_webhook_id ?? '')));

        $issuing = $this->bridgeService->getStripeIssuingReadinessForEnvironment($environment);
        $stripeConfigured = $this->bridgeService->isStripeConfiguredForEnvironment($environment);

        $bpFlag = (bool) ($additionalConfig['believe_points_wallet_transfer_enabled'] ?? false);
        $prefundedCustomer = trim((string) ($isSandbox
            ? ($additionalConfig['sandbox_prefunded_customer_id'] ?? '')
            : ($additionalConfig['live_prefunded_customer_id'] ?? '')));
        $prefundedWallet = trim((string) ($isSandbox
            ? ($additionalConfig['sandbox_prefunded_wallet_id'] ?? '')
            : ($additionalConfig['live_prefunded_wallet_id'] ?? '')));

        $cardsEnabledAt = $additionalConfig['cards_enabled_at'] ?? null;

        $webhookOk = $webhookId !== '';
        $apiKeyOk = $apiKey !== '';

        if ($webhookOk) {
            $webhookDetail = 'ID …'.substr($webhookId, -8);
        } elseif ($apiKeyOk) {
            $webhookDetail = 'Save to register';
        } else {
            $webhookDetail = 'Add API key';
        }

        if ($issuing['issuing_enabled'] ?? false) {
            $issuingDetail = 'Active';
        } elseif ($stripeConfigured) {
            $issuingDetail = 'Install Bridge app';
        } else {
            $issuingDetail = 'Stripe keys needed';
        }

        if (! empty($cardsEnabledAt)) {
            $cardsDetail = 'Since '.(\is_string($cardsEnabledAt)
                ? date('M j, Y', strtotime($cardsEnabledAt))
                : now()->format('M j, Y'));
        } else {
            $cardsDetail = 'Not enabled';
        }

        if ($isSandbox) {
            $bpOk = false;
            $bpDetail = $bpFlag ? 'Production only' : 'Disabled';
        } elseif ($bpFlag && $prefundedWallet !== '') {
            $bpOk = true;
            $bpDetail = 'Live prefunded OK';
        } elseif ($bpFlag) {
            $bpOk = false;
            $bpDetail = 'Add prefunded IDs';
        } else {
            $bpOk = false;
            $bpDetail = 'Disabled';
        }

        return [
            'api_key_configured' => $apiKeyOk,
            'webhook_configured' => $webhookOk,
            'webhook_id' => $webhookId !== '' ? $webhookId : null,
            'stripe_configured' => $stripeConfigured,
            'issuing_enabled' => (bool) ($issuing['issuing_enabled'] ?? false),
            'cards_enabled' => ! empty($cardsEnabledAt),
            'bp_transfer_enabled' => $bpFlag,
            'bp_transfer_ready' => $bpOk,
            'webhook_detail' => $webhookDetail,
            'stripe_detail' => $stripeConfigured ? 'Keys configured' : 'Add Stripe keys',
            'issuing_detail' => $issuingDetail,
            'cards_detail' => $cardsDetail,
            'bp_transfer_detail' => $bpDetail,
        ];
    }
}
