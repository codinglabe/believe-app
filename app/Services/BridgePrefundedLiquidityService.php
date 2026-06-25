<?php

namespace App\Services;

use App\Models\PaymentMethod;

class BridgePrefundedLiquidityService
{
    /**
     * Load platform reserve options from Bridge for admin selection.
     *
     * The reserve is typically a Bridge customer account (cus_…) with a wallet — the account
     * your client configured as platform liquidity during onboarding. It may also appear in
     * GET /prefunded_accounts; filter by name in application logic.
     *
     * @see https://apidocs.bridge.xyz/api-reference/prefunded-accounts/get-a-list-of-all-prefunded-account
     *
     * @return array{
     *     environment: string,
     *     success: bool,
     *     error: string|null,
     *     accounts: array<int, array<string, mixed>>,
     *     preferred_account_name?: string|null
     * }
     */
    public function listForEnvironment(
        string $environment,
        ?string $preferredNameOverride = null,
        ?string $preferredCustomerIdOverride = null,
    ): array {
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

        $additionalConfig = is_array($bridge?->additional_config) ? $bridge->additional_config : [];
        $prefix = $environment === 'sandbox' ? 'sandbox' : 'live';
        $nameKey = "{$prefix}_prefunded_account_name";
        $accountIdKey = "{$prefix}_prefunded_account_id";
        $customerIdKey = "{$prefix}_prefunded_customer_id";
        $walletIdKey = "{$prefix}_prefunded_wallet_id";
        $preferredName = trim((string) ($preferredNameOverride ?? $additionalConfig[$nameKey] ?? ''));
        $preferredAccountId = trim((string) ($additionalConfig[$accountIdKey] ?? ''));
        $preferredCustomerId = trim((string) ($preferredCustomerIdOverride ?? $additionalConfig[$customerIdKey] ?? ''));
        $configuredReserveWalletId = trim((string) ($additionalConfig[$walletIdKey] ?? ''));

        $service = new BridgeService($apiKey, $environment);
        $accounts = [];
        $seenWalletIds = [];

        $prefundedResult = $service->getPrefundedAccounts();
        if ($prefundedResult['success'] ?? false) {
            foreach ($service->normalizeBridgeListData($prefundedResult) as $row) {
                $accountId = trim((string) ($row['id'] ?? ''));
                if ($accountId === '') {
                    continue;
                }

                $detail = $service->getPrefundedAccount($accountId);
                $payload = ($detail['success'] ?? false) && is_array($detail['data'] ?? null)
                    ? $detail['data']
                    : $row;

                $account = $this->buildPrefundedAccountRow(
                    $service,
                    $accountId,
                    $payload,
                    $row,
                    $preferredName,
                    $configuredReserveWalletId,
                );

                if ($account === null) {
                    continue;
                }

                $walletId = (string) ($account['bridge_wallet_id'] ?? '');
                if ($walletId !== '') {
                    $seenWalletIds[$walletId] = true;
                }

                $accounts[] = $account;
            }
        }

        if ($preferredCustomerId === '' && $preferredName !== '') {
            $preferredCustomerId = trim((string) ($service->resolveReserveCustomerIdByName($preferredName) ?? ''));
        }

        if ($preferredCustomerId !== '') {
            $customerResult = $service->getCustomer($preferredCustomerId);
            $customerPayload = ($customerResult['success'] ?? false) && is_array($customerResult['data'] ?? null)
                ? $customerResult['data']
                : [];

            $customerName = $service->extractCustomerDisplayName($customerPayload);
            $walletsResult = $service->getWallets($preferredCustomerId);

            if ($walletsResult['success'] ?? false) {
                foreach ($service->normalizeBridgeListData($walletsResult) as $walletRow) {
                    if (! is_array($walletRow)) {
                        continue;
                    }

                    $walletId = trim((string) ($walletRow['id'] ?? ''));
                    if ($walletId === '' || isset($seenWalletIds[$walletId])) {
                        continue;
                    }

                    if ($service->isMemberCustomerBridgeWallet($walletId)
                        && $walletId !== $configuredReserveWalletId) {
                        continue;
                    }

                    $walletSummary = $this->fetchWalletSummary($service, $preferredCustomerId, $walletId);
                    if ($walletSummary === null) {
                        continue;
                    }

                    $seenWalletIds[$walletId] = true;
                    $accounts[] = [
                        'id' => $walletId,
                        'source' => 'customer_reserve',
                        'name' => $customerName,
                        'available_balance' => (string) $walletSummary['balance'],
                        'currency' => strtolower((string) $walletSummary['currency']),
                        'bridge_wallet_id' => $walletId,
                        'customer_id' => $preferredCustomerId,
                        'chain' => (string) $walletSummary['chain'],
                        'address' => (string) $walletSummary['address'],
                        'is_recommended' => false,
                        'matches_name_filter' => $preferredName !== ''
                            && $service->prefundedAccountNameMatches($customerName, $preferredName),
                    ];
                }
            }
        }

        if ($accounts === []) {
            $prefundedError = is_array($prefundedResult ?? null) && ! ($prefundedResult['success'] ?? false)
                ? (string) ($prefundedResult['error'] ?? '')
                : '';

            return $this->errorPayload(
                $environment,
                $prefundedError !== ''
                    ? $prefundedError
                    : 'No platform reserve accounts were returned. Enter your reserve customer ID and name from Bridge onboarding, then load again.',
            );
        }

        $accounts = $this->markAndSortLiquidityAccounts(
            $accounts,
            $preferredAccountId,
            $preferredName,
            $configuredReserveWalletId,
        );

        return [
            'environment' => $environment,
            'success' => true,
            'error' => null,
            'preferred_account_name' => $preferredName !== '' ? $preferredName : null,
            'accounts' => $accounts,
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>|null
     */
    private function buildPrefundedAccountRow(
        BridgeService $service,
        string $accountId,
        array $payload,
        array $row,
        string $preferredName,
        string $configuredReserveWalletId,
    ): ?array {
        $accountName = (string) ($payload['name'] ?? $row['name'] ?? 'Prefunded account');
        $walletId = $service->extractBridgeWalletIdFromPayload($payload);
        if ($walletId !== ''
            && $service->isMemberCustomerBridgeWallet($walletId)
            && $walletId !== $configuredReserveWalletId) {
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

        return [
            'id' => $accountId,
            'source' => 'prefunded_account',
            'name' => $accountName,
            'available_balance' => $availableBalance,
            'currency' => strtolower((string) ($payload['currency'] ?? $row['currency'] ?? 'usd')),
            'bridge_wallet_id' => $walletId,
            'customer_id' => $customerId,
            'chain' => is_array($walletSummary) ? (string) ($walletSummary['chain'] ?? '') : '',
            'address' => is_array($walletSummary) ? (string) ($walletSummary['address'] ?? '') : '',
            'is_recommended' => false,
            'matches_name_filter' => $preferredName !== ''
                && $service->prefundedAccountNameMatches($accountName, $preferredName),
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $accounts
     * @return array<int, array<string, mixed>>
     */
    private function markAndSortLiquidityAccounts(
        array $accounts,
        string $preferredAccountId = '',
        string $preferredName = '',
        string $preferredWalletId = '',
    ): array {
        $recommendedIndex = null;

        if ($preferredWalletId !== '') {
            foreach ($accounts as $index => $account) {
                if ((string) ($account['bridge_wallet_id'] ?? '') === $preferredWalletId) {
                    $recommendedIndex = $index;
                    break;
                }
            }
        }

        if ($recommendedIndex === null && $preferredAccountId !== '') {
            foreach ($accounts as $index => $account) {
                if ((string) ($account['id'] ?? '') === $preferredAccountId
                    && ($account['source'] ?? '') === 'prefunded_account') {
                    $recommendedIndex = $index;
                    break;
                }
            }
        }

        if ($recommendedIndex === null && $preferredName !== '') {
            foreach ($accounts as $index => $account) {
                if (($account['matches_name_filter'] ?? false) === true) {
                    $recommendedIndex = $index;
                    break;
                }
            }
        }

        if ($recommendedIndex === null && count($accounts) === 1) {
            $recommendedIndex = 0;
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

            $aMatch = (bool) ($a['matches_name_filter'] ?? false);
            $bMatch = (bool) ($b['matches_name_filter'] ?? false);
            if ($aMatch !== $bMatch) {
                return $bMatch <=> $aMatch;
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
