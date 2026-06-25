<?php

namespace App\Services;

use App\Models\PaymentMethod;

class BridgePrefundedLiquidityService
{
    /**
     * Load prefunded accounts from Bridge for admin selection.
     *
     * Only prefunded accounts (platform liquidity) are listed — not member wallets from GET /wallets.
     *
     * @see https://apidocs.bridge.xyz/api-reference/prefunded-accounts/get-a-list-of-all-prefunded-account
     * @see https://apidocs.bridge.xyz/platform/wallets/prefunded_wallets
     *
     * @return array{
     *     environment: string,
     *     success: bool,
     *     error: string|null,
     *     accounts: array<int, array<string, mixed>>
     * }
     */
    public function listForEnvironment(string $environment): array
    {
        $environment = strtolower(trim($environment));
        if (! in_array($environment, ['sandbox', 'live'], true)) {
            return $this->errorPayload($environment, 'Invalid environment.');
        }

        $bridge = PaymentMethod::getConfig('bridge');
        $apiKey = $environment === 'sandbox'
            ? trim((string) ($bridge->sandbox_api_key ?? ''))
            : trim((string) ($bridge->live_api_key ?? ''));

        if ($apiKey === '') {
            return $this->errorPayload(
                $environment,
                'Add a '.ucfirst($environment).' Bridge API key and save before loading accounts.',
            );
        }

        $service = new BridgeService($apiKey, $environment);
        $accounts = [];

        $prefundedResult = $service->getPrefundedAccounts();
        if (! ($prefundedResult['success'] ?? false)) {
            return $this->errorPayload(
                $environment,
                $prefundedResult['error'] ?? 'Could not load prefunded accounts from Bridge.',
            );
        }

        foreach ($service->normalizeBridgeListData($prefundedResult) as $row) {
            $accountId = trim((string) ($row['id'] ?? ''));
            if ($accountId === '') {
                continue;
            }

            $detail = $service->getPrefundedAccount($accountId);
            $payload = ($detail['success'] ?? false) && is_array($detail['data'] ?? null)
                ? $detail['data']
                : $row;

            $walletId = $service->extractBridgeWalletIdFromPayload($payload);
            if ($walletId !== '' && $service->isMemberCustomerBridgeWallet($walletId)) {
                $walletId = '';
            }

            $customerId = $service->extractCustomerIdFromPayload($payload);
            $walletSummary = $walletId !== ''
                ? $this->fetchWalletSummary($service, $customerId, $walletId)
                : null;

            if ($customerId === '' && is_array($walletSummary)) {
                $customerId = (string) ($walletSummary['customer_id'] ?? '');
            }

            $availableBalance = (string) ($payload['available_balance'] ?? $row['available_balance'] ?? '0');
            if (is_array($walletSummary) && ($walletSummary['balance'] ?? '') !== '') {
                $availableBalance = (string) $walletSummary['balance'];
            }

            $accounts[] = [
                'id' => $accountId,
                'source' => 'prefunded_account',
                'name' => (string) ($payload['name'] ?? $row['name'] ?? 'Prefunded account'),
                'available_balance' => $availableBalance,
                'currency' => strtolower((string) ($payload['currency'] ?? $row['currency'] ?? 'usd')),
                'bridge_wallet_id' => $walletId,
                'customer_id' => $customerId,
                'chain' => is_array($walletSummary) ? (string) ($walletSummary['chain'] ?? '') : '',
                'address' => is_array($walletSummary) ? (string) ($walletSummary['address'] ?? '') : '',
                'is_recommended' => false,
                'is_member_wallet' => false,
            ];
        }

        if ($accounts === []) {
            return $this->errorPayload(
                $environment,
                'No prefunded accounts were returned. Create a Prefunded Account / Prefunded Wallet in the Bridge dashboard first.',
            );
        }

        $accounts = $this->markAndSortLiquidityAccounts($accounts);

        return [
            'environment' => $environment,
            'success' => true,
            'error' => null,
            'accounts' => $accounts,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $accounts
     * @return array<int, array<string, mixed>>
     */
    private function markAndSortLiquidityAccounts(array $accounts): array
    {
        $recommendedIndex = null;

        foreach ($accounts as $index => $account) {
            $walletId = trim((string) ($account['bridge_wallet_id'] ?? ''));
            if ($walletId === '') {
                continue;
            }

            if (($account['source'] ?? '') === 'prefunded_account') {
                $recommendedIndex = $index;
                break;
            }
        }

        if ($recommendedIndex === null) {
            foreach ($accounts as $index => $account) {
                if (trim((string) ($account['bridge_wallet_id'] ?? '')) !== '') {
                    $recommendedIndex = $index;
                    break;
                }
            }
        }

        foreach ($accounts as $index => $account) {
            $accounts[$index]['is_recommended'] = $index === $recommendedIndex;
        }

        usort($accounts, function (array $a, array $b): int {
            $aRecommended = (bool) ($a['is_recommended'] ?? false);
            $bRecommended = (bool) ($b['is_recommended'] ?? false);
            if ($aRecommended !== $bRecommended) {
                return $bRecommended <=> $aRecommended;
            }

            return strcasecmp((string) ($a['name'] ?? ''), (string) ($b['name'] ?? ''));
        });

        return array_values($accounts);
    }

    /**
     * @return array{environment: string, success: bool, error: string|null, accounts: array<int, array<string, mixed>>}
     */
    private function errorPayload(string $environment, string $message): array
    {
        return [
            'environment' => $environment,
            'success' => false,
            'error' => $message,
            'accounts' => [],
        ];
    }

    /**
     * @return array{balance: string, currency: string, chain: string, address: string, customer_id: string}|null
     */
    private function fetchWalletSummary(BridgeService $service, string $customerId, string $walletId): ?array
    {
        $parsed = $service->parseBridgeWalletForTransfer($customerId, $walletId);
        if ($parsed === null) {
            return null;
        }

        $walletResult = $service->getBridgeWalletById($walletId);
        $walletData = ($walletResult['success'] ?? false) && is_array($walletResult['data'] ?? null)
            ? $walletResult['data']
            : [];

        return [
            'balance' => number_format((float) ($parsed['balance'] ?? 0), 2, '.', ''),
            'currency' => (string) ($parsed['currency'] ?? 'usdc'),
            'chain' => (string) ($walletData['chain'] ?? $parsed['chain'] ?? ''),
            'address' => (string) ($walletData['address'] ?? ''),
            'customer_id' => $service->extractCustomerIdFromPayload($walletData),
        ];
    }
}
