<?php

namespace App\Services;

use App\Models\PaymentMethod;

class BridgePrefundedLiquidityService
{
    /**
     * Load prefunded accounts and Bridge wallets from Bridge for admin selection.
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
        $seenWalletIds = [];
        $prefundedLoaded = false;
        $walletsLoaded = false;

        $prefundedResult = $service->getPrefundedAccounts();
        if ($prefundedResult['success'] ?? false) {
            $prefundedLoaded = true;

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
                if ($walletId !== '' && $service->isRegisteredCustomerWalletId($walletId)) {
                    $walletId = '';
                }
                if ($walletId === '' && count($service->normalizeBridgeListData($prefundedResult)) === 1) {
                    $fallback = $service->findDeveloperPrefundedLiquidityWallet();
                    if ($fallback !== null) {
                        $walletId = $fallback['wallet_id'];
                    }
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
                ];

                if ($walletId !== '') {
                    $seenWalletIds[$walletId] = true;
                }
            }
        }

        $walletsResult = $service->listAllBridgeWallets();
        if ($walletsResult['success'] ?? false) {
            $walletsLoaded = true;
            $wallets = is_array($walletsResult['data'] ?? null) ? $walletsResult['data'] : [];

            foreach ($wallets as $wallet) {
                if (! is_array($wallet)) {
                    continue;
                }

                $walletId = trim((string) ($wallet['id'] ?? ''));
                if ($walletId === '' || isset($seenWalletIds[$walletId])) {
                    continue;
                }

                if ($service->isRegisteredCustomerWalletId($walletId)) {
                    continue;
                }

                $customerId = $service->extractCustomerIdFromPayload($wallet);
                $walletSummary = $this->fetchWalletSummary($service, $customerId, $walletId);

                if ($customerId === '' && is_array($walletSummary)) {
                    $customerId = (string) ($walletSummary['customer_id'] ?? '');
                }

                $accounts[] = [
                    'id' => $walletId,
                    'source' => 'bridge_wallet',
                    'name' => $this->walletDisplayName($wallet, $walletId),
                    'available_balance' => is_array($walletSummary) ? (string) ($walletSummary['balance'] ?? '0') : '0',
                    'currency' => is_array($walletSummary) ? (string) ($walletSummary['currency'] ?? 'usdc') : 'usdc',
                    'bridge_wallet_id' => $walletId,
                    'customer_id' => $customerId,
                    'chain' => (string) ($wallet['chain'] ?? ($walletSummary['chain'] ?? '')),
                    'address' => (string) ($wallet['address'] ?? ($walletSummary['address'] ?? '')),
                    'is_recommended' => false,
                ];
            }
        }

        if (! $prefundedLoaded && ! $walletsLoaded) {
            return $this->errorPayload(
                $environment,
                $prefundedResult['error'] ?? $walletsResult['error'] ?? 'Could not load prefunded liquidity from Bridge.',
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
        $recommendedScore = -1.0;

        foreach ($accounts as $index => $account) {
            $walletId = trim((string) ($account['bridge_wallet_id'] ?? ''));
            if ($walletId === '') {
                continue;
            }

            $balance = (float) ($account['available_balance'] ?? 0);
            $score = $balance;
            if (($account['source'] ?? '') === 'prefunded_account') {
                $score += 1_000_000;
            }

            if ($score > $recommendedScore) {
                $recommendedScore = $score;
                $recommendedIndex = $index;
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

            $aPrefunded = ($a['source'] ?? '') === 'prefunded_account';
            $bPrefunded = ($b['source'] ?? '') === 'prefunded_account';
            if ($aPrefunded !== $bPrefunded) {
                return $bPrefunded <=> $aPrefunded;
            }

            return ((float) ($b['available_balance'] ?? 0)) <=> ((float) ($a['available_balance'] ?? 0));
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
     * @param  array<string, mixed>  $wallet
     */
    private function walletDisplayName(array $wallet, string $walletId): string
    {
        $name = trim((string) ($wallet['name'] ?? ''));
        if ($name !== '') {
            return $name;
        }

        $chain = trim((string) ($wallet['chain'] ?? ''));
        $suffix = strlen($walletId) > 8 ? substr($walletId, -8) : $walletId;

        return $chain !== '' ? ucfirst($chain).' wallet …'.$suffix : 'Bridge wallet …'.$suffix;
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
