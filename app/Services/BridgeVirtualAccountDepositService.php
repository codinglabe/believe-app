<?php

namespace App\Services;

use App\Models\BridgeIntegration;
use App\Models\BridgeWallet;
use App\Models\Organization;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Credits local wallet balance from Bridge virtual account on-ramp events.
 *
 * @see https://apidocs.bridge.xyz/platform/orchestration/virtual_accounts/virtual-account-events
 */
class BridgeVirtualAccountDepositService
{
    public function __construct(
        private readonly BridgeService $bridgeService,
        private readonly WalletTransactionNotifier $walletTransactionNotifier,
    ) {}

    /**
     * Poll Bridge virtual account history and apply any missed terminal deposits.
     *
     * @return int Number of deposits newly credited
     */
    public function syncFromBridge(BridgeIntegration $integration): int
    {
        return $this->syncVirtualAccountDeposits($integration)
            + $this->syncBridgeWalletDeposits($integration);
    }

    /**
     * @return int Number of deposits newly credited
     */
    private function syncVirtualAccountDeposits(BridgeIntegration $integration): int
    {
        $customerId = $integration->bridge_customer_id;
        if (! $customerId) {
            return 0;
        }

        $virtualAccountId = $this->resolveVirtualAccountId($integration);
        if (! $virtualAccountId) {
            return 0;
        }

        $historyResult = $this->bridgeService->getVirtualAccountHistory($customerId, $virtualAccountId);
        if (! ($historyResult['success'] ?? false)) {
            Log::warning('Bridge virtual account history sync failed', [
                'integration_id' => $integration->id,
                'customer_id' => $customerId,
                'virtual_account_id' => $virtualAccountId,
                'error' => $historyResult['error'] ?? null,
            ]);

            return 0;
        }

        $events = $this->bridgeService->normalizeBridgeListData($historyResult);
        $credited = 0;

        foreach ($events as $eventObject) {
            if (! is_array($eventObject)) {
                continue;
            }

            $activityType = $this->resolveActivityType($eventObject);
            if ($activityType === null) {
                continue;
            }

            if (in_array($activityType, ['funds_scheduled', 'funds_received', 'payment_submitted', 'in_review'], true)) {
                $this->recordPendingDeposit($integration, $eventObject, $activityType, 'history_sync');
                continue;
            }

            if ($activityType === 'payment_processed') {
                if ($this->creditCompletedDeposit($integration, $eventObject, 'history_sync')) {
                    $credited++;
                }
            }
        }

        if ($credited > 0) {
            Log::info('Bridge virtual account history sync credited deposits', [
                'integration_id' => $integration->id,
                'customer_id' => $customerId,
                'virtual_account_id' => $virtualAccountId,
                'credited_count' => $credited,
            ]);
        }

        return $credited;
    }

    /**
     * @return int Number of deposits newly credited
     */
    private function syncBridgeWalletDeposits(BridgeIntegration $integration): int
    {
        $customerId = $integration->bridge_customer_id;
        $walletId = $this->resolveBridgeWalletId($integration);

        if (! $customerId || ! $walletId) {
            return 0;
        }

        $historyResult = $this->bridgeService->getBridgeWalletHistory($customerId, $walletId);
        if (! ($historyResult['success'] ?? false)) {
            return 0;
        }

        $events = $this->bridgeService->normalizeBridgeListData($historyResult);
        $user = $this->resolveWalletUser($integration);
        if ($user === null) {
            return 0;
        }

        $credited = 0;
        foreach ($events as $eventObject) {
            if (! is_array($eventObject)) {
                continue;
            }

            $activityType = strtolower(trim((string) ($eventObject['type'] ?? '')));
            if (! in_array($activityType, ['deposit', 'direct_deposit'], true)) {
                continue;
            }

            $activityId = $eventObject['id'] ?? null;
            $depositAmount = round((float) ($eventObject['amount'] ?? 0), 2);
            if ($depositAmount <= 0 || $activityId === null) {
                continue;
            }

            if (Transaction::where('user_id', $user->id)
                ->whereJsonContains('meta->bridge_wallet_activity_id', $activityId)
                ->exists()) {
                continue;
            }

            $paymentRoute = is_array($eventObject['payment_route'] ?? null) ? $eventObject['payment_route'] : [];
            $depositId = $paymentRoute['deposit_id'] ?? null;
            if ($depositId && Transaction::where('user_id', $user->id)
                ->where('type', 'deposit')
                ->whereIn('status', ['completed', 'refunded'])
                ->whereJsonContains('meta->deposit_id', $depositId)
                ->exists()) {
                continue;
            }

            DB::transaction(function () use ($user, $depositAmount, $activityId, $depositId, $walletId, $paymentRoute, $eventObject, &$credited): void {
                $user->increment('balance', $depositAmount);

                $depositTransaction = $user->recordTransaction([
                    'type' => 'deposit',
                    'amount' => $depositAmount,
                    'status' => 'completed',
                    'payment_method' => 'bridge',
                    'meta' => [
                        'bridge_wallet_activity_id' => $activityId,
                        'bridge_wallet_id' => $walletId,
                        'deposit_id' => $depositId,
                        'bridge_transfer_id' => $paymentRoute['transfer_id'] ?? null,
                        'payment_route_type' => $paymentRoute['type'] ?? null,
                        'bridge_wallet_activity_type' => $eventObject['type'] ?? null,
                        'bridge_event_type' => 'history_sync',
                        'source' => $eventObject['source'] ?? null,
                    ],
                    'processed_at' => now(),
                ]);

                $this->walletTransactionNotifier->notify($user, $depositTransaction);
                $credited++;
            });
        }

        return $credited;
    }

    private function resolveBridgeWalletId(BridgeIntegration $integration): ?string
    {
        $integration->loadMissing('primaryWallet', 'wallets');

        if ($integration->bridge_wallet_id) {
            return $integration->bridge_wallet_id;
        }

        if ($integration->primaryWallet?->bridge_wallet_id) {
            return $integration->primaryWallet->bridge_wallet_id;
        }

        $wallet = $integration->wallets->first(fn (BridgeWallet $w) => ! empty($w->bridge_wallet_id));

        if ($wallet?->bridge_wallet_id) {
            return $wallet->bridge_wallet_id;
        }

        $customerId = $integration->bridge_customer_id;
        if (! $customerId) {
            return null;
        }

        $wallets = $this->bridgeService->normalizeBridgeListData(
            $this->bridgeService->getWallets($customerId)
        );

        $walletId = (string) ($wallets[0]['id'] ?? '');
        if ($walletId === '') {
            return null;
        }

        $integration->update(['bridge_wallet_id' => $walletId]);

        return $walletId;
    }

    /**
     * Apply a virtual_account.activity webhook (or history row).
     */
    public function processVirtualAccountActivity(
        BridgeIntegration $integration,
        array $eventObject,
        string $bridgeEventType,
        ?string $eventObjectStatus = null,
    ): void {
        $activityType = $this->resolveActivityType($eventObject, $eventObjectStatus);
        if ($activityType === null) {
            Log::warning('Bridge virtual account activity missing type', [
                'integration_id' => $integration->id,
                'activity_id' => $eventObject['id'] ?? null,
                'bridge_event_type' => $bridgeEventType,
            ]);

            return;
        }

        if (in_array($activityType, ['funds_scheduled', 'funds_received', 'payment_submitted', 'in_review'], true)) {
            $this->recordPendingDeposit($integration, $eventObject, $activityType, $bridgeEventType);

            return;
        }

        if ($activityType === 'payment_processed') {
            $this->creditCompletedDeposit($integration, $eventObject, $bridgeEventType);
        }
    }

    public function resolveActivityType(array $eventObject, ?string $eventObjectStatus = null): ?string
    {
        $type = strtolower(trim((string) ($eventObject['type'] ?? '')));
        if ($type !== '') {
            return $type;
        }

        $state = strtolower(trim((string) ($eventObject['state'] ?? '')));
        if ($state !== '') {
            return $state;
        }

        $status = strtolower(trim((string) ($eventObjectStatus ?? '')));

        return $status !== '' ? $status : null;
    }

    /**
     * Terminal on-ramp amount (after fees) for payment_processed / payment_submitted.
     */
    public function resolveCreditAmount(array $eventObject, string $activityType): float
    {
        if (in_array($activityType, ['payment_processed', 'payment_submitted'], true)) {
            $receipt = is_array($eventObject['receipt'] ?? null) ? $eventObject['receipt'] : [];
            $finalAmount = $receipt['final_amount'] ?? null;
            if ($finalAmount !== null && $finalAmount !== '') {
                return round((float) $finalAmount, 2);
            }
        }

        return round((float) ($eventObject['amount'] ?? 0), 2);
    }

    private function resolveVirtualAccountId(BridgeIntegration $integration): ?string
    {
        $integration->loadMissing('primaryWallet', 'wallets');

        $primary = $integration->primaryWallet;
        if ($primary?->virtual_account_id) {
            return $primary->virtual_account_id;
        }

        $wallet = $integration->wallets
            ->first(fn (BridgeWallet $w) => ! empty($w->virtual_account_id));

        if ($wallet?->virtual_account_id) {
            return $wallet->virtual_account_id;
        }

        $metadata = is_array($integration->bridge_metadata) ? $integration->bridge_metadata : [];
        $metadataVaId = $metadata['virtual_account']['id'] ?? $metadata['virtual_account_id'] ?? null;
        if (is_string($metadataVaId) && $metadataVaId !== '') {
            return $metadataVaId;
        }

        $customerId = $integration->bridge_customer_id;
        if (! $customerId) {
            return null;
        }

        $accounts = $this->bridgeService->normalizeBridgeListData(
            $this->bridgeService->getVirtualAccounts($customerId)
        );

        if ($accounts === []) {
            return null;
        }

        $virtualAccountId = (string) ($accounts[0]['id'] ?? '');
        if ($virtualAccountId === '') {
            return null;
        }

        $this->persistDiscoveredVirtualAccount($integration, $accounts[0]);

        return $virtualAccountId;
    }

    /**
     * @param  array<string, mixed>  $virtualAccountData
     */
    private function persistDiscoveredVirtualAccount(BridgeIntegration $integration, array $virtualAccountData): void
    {
        $virtualAccountId = (string) ($virtualAccountData['id'] ?? '');
        if ($virtualAccountId === '') {
            return;
        }

        $wallet = $integration->primaryWallet
            ?? $integration->wallets()->where('virtual_account_id', $virtualAccountId)->first()
            ?? $integration->wallets()->first();

        $destination = is_array($virtualAccountData['destination'] ?? null) ? $virtualAccountData['destination'] : [];

        if ($wallet) {
            $wallet->update([
                'virtual_account_id' => $virtualAccountId,
                'virtual_account_details' => $virtualAccountData,
                'wallet_address' => $wallet->wallet_address ?: ($destination['address'] ?? null),
                'chain' => $wallet->chain ?: ($destination['payment_rail'] ?? 'ethereum'),
            ]);

            return;
        }

        BridgeWallet::create([
            'bridge_integration_id' => $integration->id,
            'bridge_customer_id' => $integration->bridge_customer_id,
            'bridge_wallet_id' => $destination['bridge_wallet_id'] ?? null,
            'wallet_address' => $destination['address'] ?? null,
            'chain' => $destination['payment_rail'] ?? 'ethereum',
            'status' => 'active',
            'balance' => 0,
            'currency' => strtoupper((string) ($destination['currency'] ?? 'USD')),
            'virtual_account_id' => $virtualAccountId,
            'virtual_account_details' => $virtualAccountData,
            'is_primary' => true,
        ]);
    }

    private function resolveWalletUser(BridgeIntegration $integration): ?User
    {
        $integratable = $integration->integratable;
        if ($integratable === null) {
            return null;
        }

        if ($integration->integratable_type === Organization::class) {
            return $integratable->user ?? null;
        }

        return $integratable instanceof User ? $integratable : null;
    }

    private function recordPendingDeposit(
        BridgeIntegration $integration,
        array $eventObject,
        string $activityType,
        string $bridgeEventType,
    ): void {
        $user = $this->resolveWalletUser($integration);
        if ($user === null) {
            return;
        }

        $depositId = $eventObject['deposit_id'] ?? null;
        $activityId = $eventObject['id'] ?? null;
        $virtualAccountId = $eventObject['virtual_account_id'] ?? null;
        $amount = $this->resolveCreditAmount($eventObject, $activityType);

        if ($amount <= 0 || ($depositId === null && $activityId === null)) {
            return;
        }

        if ($depositId && Transaction::where('user_id', $user->id)
            ->whereIn('type', ['deposit'])
            ->whereIn('status', ['pending', 'completed'])
            ->whereJsonContains('meta->deposit_id', $depositId)
            ->exists()) {
            return;
        }

        if ($activityId && Transaction::where('user_id', $user->id)
            ->where('type', 'deposit')
            ->whereJsonContains('meta->activity_id', $activityId)
            ->exists()) {
            return;
        }

        $user->recordTransaction([
            'type' => 'deposit',
            'amount' => $amount,
            'status' => 'pending',
            'payment_method' => 'bridge',
            'meta' => [
                'virtual_account_id' => $virtualAccountId,
                'activity_id' => $activityId,
                'deposit_id' => $depositId,
                'customer_id' => $eventObject['customer_id'] ?? $integration->bridge_customer_id,
                'bridge_activity_type' => $activityType,
                'bridge_event_type' => $bridgeEventType,
                'source_payment_rail' => $eventObject['source']['payment_rail'] ?? null,
            ],
        ]);
    }

    private function creditCompletedDeposit(
        BridgeIntegration $integration,
        array $eventObject,
        string $bridgeEventType,
    ): bool {
        $user = $this->resolveWalletUser($integration);
        if ($user === null) {
            Log::warning('Bridge virtual account deposit: wallet user not found', [
                'integration_id' => $integration->id,
            ]);

            return false;
        }

        $activityType = $this->resolveActivityType($eventObject) ?? 'payment_processed';
        $depositAmount = $this->resolveCreditAmount($eventObject, $activityType);
        $depositId = $eventObject['deposit_id'] ?? null;
        $activityId = $eventObject['id'] ?? null;
        $virtualAccountId = $eventObject['virtual_account_id'] ?? null;
        $customerId = $eventObject['customer_id'] ?? $integration->bridge_customer_id;

        if ($depositAmount <= 0) {
            return false;
        }

        return (bool) DB::transaction(function () use (
            $user,
            $depositAmount,
            $depositId,
            $activityId,
            $virtualAccountId,
            $customerId,
            $bridgeEventType,
            $activityType,
            $eventObject,
        ) {
            $completedQuery = Transaction::where('user_id', $user->id)
                ->where('type', 'deposit')
                ->where('status', 'completed');

            if ($depositId) {
                $completedQuery->whereJsonContains('meta->deposit_id', $depositId);
            } elseif ($virtualAccountId && $activityId) {
                $completedQuery
                    ->whereJsonContains('meta->virtual_account_id', $virtualAccountId)
                    ->whereJsonContains('meta->activity_id', $activityId);
            } else {
                return false;
            }

            if ($completedQuery->lockForUpdate()->exists()) {
                return false;
            }

            $pendingTransaction = null;
            if ($depositId) {
                $pendingTransaction = Transaction::where('user_id', $user->id)
                    ->where('type', 'deposit')
                    ->where('status', 'pending')
                    ->whereJsonContains('meta->deposit_id', $depositId)
                    ->lockForUpdate()
                    ->first();
            }

            if ($pendingTransaction) {
                $user->increment('balance', $depositAmount);

                $pendingTransaction->update([
                    'amount' => $depositAmount,
                    'status' => 'completed',
                    'processed_at' => now(),
                    'meta' => array_merge(
                        is_array($pendingTransaction->meta) ? $pendingTransaction->meta : [],
                        [
                            'virtual_account_id' => $virtualAccountId,
                            'activity_id' => $activityId,
                            'deposit_id' => $depositId,
                            'customer_id' => $customerId,
                            'bridge_event_type' => $bridgeEventType,
                            'bridge_activity_type' => $activityType,
                            'destination_tx_hash' => $eventObject['destination_tx_hash'] ?? null,
                            'credited_via' => 'payment_processed',
                        ]
                    ),
                ]);

                $this->walletTransactionNotifier->notify($user, $pendingTransaction->fresh());

                return true;
            }

            $user->increment('balance', $depositAmount);

            $depositTransaction = $user->recordTransaction([
                'type' => 'deposit',
                'amount' => $depositAmount,
                'status' => 'completed',
                'payment_method' => 'bridge',
                'meta' => [
                    'virtual_account_id' => $virtualAccountId,
                    'activity_id' => $activityId,
                    'deposit_id' => $depositId,
                    'customer_id' => $customerId,
                    'bridge_event_type' => $bridgeEventType,
                    'bridge_activity_type' => $activityType,
                    'destination_tx_hash' => $eventObject['destination_tx_hash'] ?? null,
                    'credited_via' => 'payment_processed',
                ],
                'processed_at' => now(),
            ]);

            $this->walletTransactionNotifier->notify($user, $depositTransaction);

            Log::info('Bridge virtual account deposit credited', [
                'user_id' => $user->id,
                'amount' => $depositAmount,
                'deposit_id' => $depositId,
                'activity_id' => $activityId,
                'virtual_account_id' => $virtualAccountId,
            ]);

            return true;
        });
    }
}
