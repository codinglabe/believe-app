<?php

namespace App\Services;

use App\Models\BridgeIntegration;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Read wallet balance and activity directly from Bridge (source of truth).
 *
 * @see https://apidocs.bridge.xyz/platform/wallets/move-money
 */
class BridgeWalletReadService
{
    public function __construct(
        private readonly BridgeService $bridgeService,
    ) {}

    /**
     * @return array{
     *     balance: float,
     *     currency: string,
     *     wallet_id: string,
     *     chain: string|null,
     *     balances: array<int, array<string, mixed>>
     * }|null
     */
    public function getWalletSnapshot(BridgeIntegration $integration): ?array
    {
        $customerId = $integration->bridge_customer_id;
        if (! $customerId) {
            return null;
        }

        $resolved = $this->bridgeService->resolveCustomerBridgeWallet($integration);
        if ($resolved === null) {
            return null;
        }

        $walletResult = $this->bridgeService->getWallet($customerId, $resolved['wallet_id']);
        if (! ($walletResult['success'] ?? false) || ! is_array($walletResult['data'] ?? null)) {
            return null;
        }

        $data = $walletResult['data'];
        $primary = $this->bridgeService->resolvePrimaryStablecoinBalance($data);

        return [
            'balance' => $primary['balance'],
            'currency' => strtoupper($primary['currency']),
            'wallet_id' => $resolved['wallet_id'],
            'chain' => $data['chain'] ?? $resolved['chain'] ?? null,
            'balances' => is_array($data['balances'] ?? null) ? $data['balances'] : [],
        ];
    }

    public function getBalance(BridgeIntegration $integration): ?float
    {
        return $this->getWalletSnapshot($integration)['balance'] ?? null;
    }

    /**
     * Bridge-connected wallets use Bridge API only — never the local ledger (sandbox or production).
     */
    public function usesBridgeWalletAsSourceOfTruth(?BridgeIntegration $integration): bool
    {
        return $integration !== null && ! empty($integration->bridge_customer_id);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getActivity(BridgeIntegration $integration, int $limit = 50): array
    {
        $customerId = $integration->bridge_customer_id;
        if (! $customerId) {
            return [];
        }

        $snapshot = $this->getWalletSnapshot($integration);
        $walletId = $snapshot['wallet_id'] ?? null;

        $activities = [];

        if ($walletId !== null) {
            $activities = array_merge($activities, $this->mapWalletHistoryActivities($customerId, $walletId));
            $activities = array_merge($activities, $this->mapTransferActivities($customerId, $walletId));
        }

        $activities = array_merge($activities, $this->mapVirtualAccountActivities($integration, $customerId));

        usort($activities, fn (array $a, array $b) => strcmp($b['sort_date'] ?? '', $a['sort_date'] ?? ''));

        $deduped = [];
        $seen = [];
        foreach ($activities as $activity) {
            $key = (string) ($activity['id'] ?? '');
            if ($key === '' || isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            unset($activity['sort_date']);
            $deduped[] = $activity;
        }

        return array_slice($deduped, 0, max(1, $limit));
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function mapWalletHistoryActivities(string $customerId, string $walletId): array
    {
        $result = $this->bridgeService->getBridgeWalletHistory($customerId, $walletId);
        $events = $this->bridgeService->normalizeBridgeListData($result);
        $activities = [];

        foreach ($events as $event) {
            if (! is_array($event)) {
                continue;
            }

            $type = strtolower((string) ($event['type'] ?? ''));
            $amount = round((float) ($event['amount'] ?? 0), 2);
            if ($amount <= 0) {
                continue;
            }

            $id = (string) ($event['id'] ?? '');
            if ($id === '') {
                continue;
            }

            $date = $this->parseBridgeTimestamp($event['created_at'] ?? $event['updated_at'] ?? null);
            $isOutgoing = in_array($type, ['withdrawal', 'withdraw', 'return', 'undeliverable'], true);
            $isDeposit = in_array($type, ['deposit', 'direct_deposit'], true);

            if (! $isOutgoing && ! $isDeposit) {
                continue;
            }

            $activities[] = [
                'id' => 'bridge_wallet_'.$id,
                'type' => $isDeposit ? 'deposit' : 'transfer_sent',
                'amount' => $amount,
                'date' => $date,
                'status' => 'completed',
                'donor_name' => $isDeposit ? 'Bank deposit' : 'Bridge wallet',
                'donor_email' => null,
                'frequency' => 'one-time',
                'message' => $isDeposit ? 'Deposit to wallet' : ucfirst(str_replace('_', ' ', $type)),
                'transaction_id' => $id,
                'is_outgoing' => $isOutgoing,
                'recipient_type' => null,
                'source' => 'bridge_wallet_history',
                'sort_date' => $date,
            ];
        }

        return $activities;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function mapVirtualAccountActivities(BridgeIntegration $integration, string $customerId): array
    {
        $virtualAccountId = $this->resolveVirtualAccountId($integration);
        if (! $virtualAccountId) {
            return [];
        }

        $result = $this->bridgeService->getVirtualAccountHistory($customerId, $virtualAccountId);
        $events = $this->bridgeService->normalizeBridgeListData($result);
        $activities = [];

        foreach ($events as $event) {
            if (! is_array($event)) {
                continue;
            }

            $activityType = strtolower((string) ($event['type'] ?? $event['activity_type'] ?? ''));
            $amount = round((float) ($event['amount'] ?? $event['receipt']['final_amount'] ?? 0), 2);
            if ($amount <= 0) {
                continue;
            }

            $id = (string) ($event['id'] ?? $event['activity_id'] ?? '');
            if ($id === '') {
                continue;
            }

            $status = $activityType === 'payment_processed' ? 'completed' : 'pending';
            if (in_array($activityType, ['funds_scheduled', 'funds_received', 'payment_submitted', 'in_review'], true)) {
                $status = 'pending';
            } elseif (! in_array($activityType, ['payment_processed'], true)) {
                continue;
            }

            $date = $this->parseBridgeTimestamp($event['created_at'] ?? $event['updated_at'] ?? null);

            $activities[] = [
                'id' => 'bridge_va_'.$id,
                'type' => 'deposit',
                'amount' => $amount,
                'date' => $date,
                'status' => $status,
                'donor_name' => 'ACH / wire deposit',
                'donor_email' => null,
                'frequency' => 'one-time',
                'message' => $status === 'pending' ? 'Deposit processing' : 'Deposit to wallet',
                'transaction_id' => $id,
                'is_outgoing' => false,
                'recipient_type' => null,
                'source' => 'bridge_virtual_account',
                'sort_date' => $date,
            ];
        }

        return $activities;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function mapTransferActivities(string $customerId, string $walletId): array
    {
        $result = $this->bridgeService->getCustomerTransfers($customerId);
        $transfers = $this->bridgeService->normalizeBridgeListData($result);
        $activities = [];

        foreach ($transfers as $transfer) {
            if (! is_array($transfer)) {
                continue;
            }

            $transferId = (string) ($transfer['id'] ?? '');
            if ($transferId === '') {
                continue;
            }

            $amount = round((float) ($transfer['amount'] ?? 0), 2);
            if ($amount <= 0) {
                continue;
            }

            $sourceWalletId = (string) ($transfer['source']['bridge_wallet_id'] ?? '');
            $destWalletId = (string) ($transfer['destination']['bridge_wallet_id'] ?? '');
            $isOutgoing = $sourceWalletId === $walletId;
            $isIncoming = $destWalletId === $walletId;

            if (! $isOutgoing && ! $isIncoming) {
                continue;
            }

            $state = strtolower((string) ($transfer['state'] ?? $transfer['status'] ?? 'pending'));
            $status = match ($state) {
                'payment_processed', 'completed' => 'completed',
                'failed', 'returned', 'refunded', 'error' => 'failed',
                'canceled', 'cancelled' => 'cancelled',
                default => 'pending',
            };

            $date = $this->parseBridgeTimestamp($transfer['updated_at'] ?? $transfer['created_at'] ?? null);
            $counterparty = $isOutgoing ? 'Recipient' : 'Sender';

            $activities[] = [
                'id' => 'bridge_transfer_'.$transferId,
                'type' => $isOutgoing ? 'transfer_sent' : 'transfer_received',
                'amount' => $amount,
                'date' => $date,
                'status' => $status,
                'donor_name' => $counterparty,
                'donor_email' => null,
                'frequency' => 'one-time',
                'message' => ($isOutgoing ? 'Sent to ' : 'Received from ').$counterparty
                    .($status === 'pending' ? ' (Processing...)' : ''),
                'transaction_id' => $transferId,
                'is_outgoing' => $isOutgoing,
                'recipient_type' => null,
                'source' => 'bridge_transfer',
                'sort_date' => $date,
            ];
        }

        return $activities;
    }

    private function resolveVirtualAccountId(BridgeIntegration $integration): ?string
    {
        $integration->loadMissing('primaryWallet', 'wallets');

        $virtualAccountId = $integration->primaryWallet?->virtual_account_id
            ?? $integration->wallets->first(fn ($w) => ! empty($w->virtual_account_id))?->virtual_account_id;

        if ($virtualAccountId) {
            return $virtualAccountId;
        }

        $customerId = $integration->bridge_customer_id;
        if (! $customerId) {
            return null;
        }

        $accounts = $this->bridgeService->normalizeBridgeListData(
            $this->bridgeService->getVirtualAccounts($customerId)
        );

        return isset($accounts[0]['id']) ? (string) $accounts[0]['id'] : null;
    }

    private function parseBridgeTimestamp(mixed $value): string
    {
        if ($value === null || $value === '') {
            return now()->toIso8601String();
        }

        try {
            return Carbon::parse((string) $value)->toIso8601String();
        } catch (\Throwable $e) {
            Log::debug('Bridge timestamp parse failed', ['value' => $value, 'error' => $e->getMessage()]);

            return now()->toIso8601String();
        }
    }
}
