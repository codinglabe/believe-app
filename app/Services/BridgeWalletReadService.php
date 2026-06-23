<?php

namespace App\Services;

use App\Models\BridgeIntegration;
use App\Models\BridgeWallet;
use App\Models\Organization;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Read wallet balance and activity directly from Bridge (source of truth).
 *
 * @see https://apidocs.bridge.xyz/platform/wallets/move-money
 * @see https://apidocs.bridge.xyz/platform/orchestration/virtual_accounts/virtual-account-events
 */
class BridgeWalletReadService
{
    /** @var array<string, string> */
    private array $walletOwnerNames = [];

    /** @var array<string, string> */
    private array $walletAddressOwners = [];

    /** @var array<string, string> */
    private array $customerNames = [];

    private bool $platformWalletIndexBuilt = false;

    /**
     * @var array{
     *     virtual_account_id: string|null,
     *     by_event_id: array<string, array<string, mixed>>,
     *     best_by_deposit_id: array<string, array<string, mixed>>
     * }|null
     */
    private ?array $virtualAccountEventContext = null;

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

        $this->resetNameCaches();
        $this->ensurePlatformWalletOwnerIndex();

        $snapshot = $this->getWalletSnapshot($integration);
        $primaryWalletId = $snapshot['wallet_id'] ?? null;
        $walletIdsForTransfers = $this->resolveIntegrationWalletIds($integration, $primaryWalletId);
        $historyWalletIds = $this->resolveBridgeWalletIdsForHistory($integration, $primaryWalletId);
        $vaContext = $this->loadVirtualAccountEventContext($integration, $customerId);

        $activities = [];

        foreach ($historyWalletIds as $historyWalletId) {
            $activities = array_merge(
                $activities,
                $this->mapWalletHistoryActivities($customerId, $historyWalletId, $vaContext, max($limit, 100)),
            );
        }

        $activities = array_merge(
            $activities,
            $this->mapVirtualAccountActivities($vaContext),
        );

        if ($walletIdsForTransfers !== []) {
            $viewerWalletAddress = $this->resolveIntegrationWalletAddress($integration);
            $activities = array_merge(
                $activities,
                $this->mapTransferActivities(
                    $customerId,
                    $walletIdsForTransfers,
                    $this->collectOnRampTransferIds($activities),
                    $viewerWalletAddress,
                    max($limit, 100),
                ),
            );
        }

        usort($activities, fn (array $a, array $b) => strcmp($b['sort_date'] ?? '', $a['sort_date'] ?? ''));

        return array_slice($this->dedupeActivities($activities), 0, max(1, $limit));
    }

    /**
     * @param  array<int, array<string, mixed>>  $activities
     * @return array<int, string>
     */
    private function collectOnRampTransferIds(array $activities): array
    {
        $ids = [];
        foreach ($activities as $activity) {
            $source = (string) ($activity['source'] ?? '');
            if ($source !== 'bridge_virtual_account') {
                continue;
            }

            $transferId = $activity['bridge_transfer_id'] ?? null;
            if (is_string($transferId) && $transferId !== '') {
                $ids[] = $transferId;
            }
        }

        return array_values(array_unique($ids));
    }

    /**
     * Collapse activities that describe the same Bridge deposit/transfer.
     *
     * @param  array<int, array<string, mixed>>  $activities
     * @return array<int, array<string, mixed>>
     */
    private function dedupeActivities(array $activities): array
    {
        $bestByKey = [];

        foreach ($activities as $activity) {
            $key = (string) ($activity['dedupe_key'] ?? $activity['id'] ?? '');
            if ($key === '') {
                continue;
            }

            if (! isset($bestByKey[$key])
                || $this->activityRank($activity) > $this->activityRank($bestByKey[$key])) {
                $bestByKey[$key] = $activity;
            }
        }

        $byDepositId = [];
        $standalone = [];

        foreach ($bestByKey as $activity) {
            $depositId = $activity['deposit_id'] ?? null;
            if (is_string($depositId) && $depositId !== '') {
                if (! isset($byDepositId[$depositId])
                    || $this->activityRank($activity) > $this->activityRank($byDepositId[$depositId])) {
                    $byDepositId[$depositId] = $activity;
                }

                continue;
            }

            $standalone[(string) ($activity['id'] ?? uniqid('activity_', true))] = $activity;
        }

        $deduped = [];
        $emittedDepositIds = [];

        foreach (array_values($byDepositId) as $activity) {
            $depositId = (string) ($activity['deposit_id'] ?? '');
            if ($depositId !== '') {
                $emittedDepositIds[$depositId] = true;
            }
            unset(
                $activity['sort_date'],
                $activity['dedupe_key'],
                $activity['deposit_id'],
                $activity['bridge_transfer_id'],
                $activity['virtual_account_event_id'],
            );
            $deduped[] = $activity;
        }

        foreach (array_values($standalone) as $activity) {
            $depositId = (string) ($activity['deposit_id'] ?? '');
            if ($depositId !== '' && isset($emittedDepositIds[$depositId])) {
                continue;
            }

            unset(
                $activity['sort_date'],
                $activity['dedupe_key'],
                $activity['deposit_id'],
                $activity['bridge_transfer_id'],
                $activity['virtual_account_event_id'],
            );
            $deduped[] = $activity;
        }

        usort($deduped, fn (array $a, array $b) => strcmp($b['date'] ?? '', $a['date'] ?? ''));

        return $deduped;
    }

    /**
     * @param  array<string, mixed>  $activity
     */
    private function activityRank(array $activity): int
    {
        $statusRank = match ($activity['status'] ?? '') {
            'completed' => 300,
            'pending' => 100,
            'failed', 'cancelled' => 50,
            default => 0,
        };

        return $statusRank + ($this->activitySourcePriority($activity) * 10);
    }

    /**
     * @param  array<string, mixed>  $activity
     */
    private function activitySourcePriority(array $activity): int
    {
        return match ($activity['source'] ?? '') {
            'bridge_wallet_history' => 3,
            'bridge_virtual_account' => 2,
            'bridge_transfer' => 1,
            default => 0,
        };
    }

    /**
     * @param  array{
     *     virtual_account_id: string|null,
     *     by_event_id: array<string, array<string, mixed>>,
     *     best_by_deposit_id: array<string, array<string, mixed>>
     * }  $vaContext
     * @return array<int, array<string, mixed>>
     */
    private function mapWalletHistoryActivities(
        string $customerId,
        string $walletId,
        array $vaContext,
        int $maxEvents = 100,
    ): array {
        $events = $this->fetchPaginatedBridgeList(
            fn (array $query) => $this->bridgeService->getBridgeWalletHistory($customerId, $walletId, $query),
            $maxEvents,
        );
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
            $isOutgoing = in_array($type, ['withdrawal', 'withdraw', 'card_spend'], true);
            $isFailedReturn = in_array($type, ['return', 'undeliverable'], true);
            $isDeposit = in_array($type, ['deposit', 'direct_deposit', 'card_refund'], true);

            if (! $isOutgoing && ! $isDeposit && ! $isFailedReturn) {
                continue;
            }

            $paymentRoute = is_array($event['payment_route'] ?? null) ? $event['payment_route'] : [];

            // ACH/VA on-ramp lifecycle is owned by mapVirtualAccountActivities (one row per deposit_id).
            if ($isDeposit && $this->isVirtualAccountOnRamp($paymentRoute)) {
                continue;
            }

            $routeType = strtolower((string) ($paymentRoute['type'] ?? ''));
            $depositId = isset($paymentRoute['deposit_id']) ? (string) $paymentRoute['deposit_id'] : null;
            $transferId = isset($paymentRoute['transfer_id']) ? (string) $paymentRoute['transfer_id'] : null;
            $vaEventId = isset($paymentRoute['virtual_account_event_id'])
                ? (string) $paymentRoute['virtual_account_event_id']
                : null;

            if ($isDeposit && $this->isVirtualAccountOnRamp($paymentRoute)) {
                $vaEvent = $this->resolveVirtualAccountEventForPaymentRoute($paymentRoute, $vaContext);
                if ($vaEvent !== null) {
                    if (($depositId === null || $depositId === '') && ! empty($vaEvent['deposit_id'])) {
                        $depositId = (string) $vaEvent['deposit_id'];
                    }
                    if (($vaEventId === null || $vaEventId === '') && ! empty($vaEvent['id'])) {
                        $vaEventId = (string) $vaEvent['id'];
                    }
                }
            }

            $dedupeKey = $this->buildDepositDedupeKey($depositId, $vaEventId, $transferId, $id);

            $counterpartyName = $this->resolveWalletHistoryCounterpartyName($event, $customerId, $isDeposit, $vaContext);

            if ($isDeposit) {
                $donorName = $counterpartyName
                    ?? ($this->isVirtualAccountOnRamp($paymentRoute) ? 'ACH / wire deposit' : 'Bank deposit');
                $depositMessage = $this->resolveVirtualAccountDepositMessage($event, $paymentRoute, $vaContext, $donorName);
            } elseif ($isFailedReturn) {
                $donorName = $counterpartyName ?? 'Bank';
                $depositMessage = 'Returned — '.$donorName;
            } elseif ($type === 'card_spend') {
                $donorName = $counterpartyName ?? 'Card merchant';
                $depositMessage = 'Card spend';
            } else {
                $donorName = $counterpartyName ?? 'Bank account';
                $depositMessage = $routeType === 'transfer'
                    ? 'Sent to '.$donorName
                    : ucfirst(str_replace('_', ' ', $type));
            }

            $activityType = $isDeposit ? 'deposit' : ($type === 'card_spend' ? 'card_spend' : 'transfer_sent');
            $activityOutgoing = $isOutgoing || $isFailedReturn;
            if ($isDeposit && $routeType === 'transfer') {
                // Bridge wallet history: deposit + payment_route.type=transfer is an incoming transfer.
                // @see https://apidocs.bridge.xyz/api-reference/bridge-wallets/get-transaction-history-for-a-bridge-wallet
                $activityType = 'transfer_received';
                $activityOutgoing = false;
                $donorName = $counterpartyName ?? 'Sender';
                $depositMessage = 'Received from '.$donorName;
            } elseif ($type === 'card_refund') {
                $activityType = 'deposit';
                $activityOutgoing = false;
                $donorName = $counterpartyName ?? 'Card refund';
                $depositMessage = 'Card refund';
            }

            $historyStatus = $isFailedReturn ? 'failed' : 'completed';
            $paymentMethod = $isDeposit ? $this->resolveDepositPaymentMethod($event) : null;

            $activities[] = [
                'id' => 'bridge_wallet_'.$id,
                'dedupe_key' => $dedupeKey,
                'deposit_id' => ($depositId !== null && $depositId !== '') ? $depositId : null,
                'virtual_account_event_id' => ($vaEventId !== null && $vaEventId !== '') ? $vaEventId : null,
                'bridge_transfer_id' => $transferId,
                'type' => $activityType,
                'amount' => $amount,
                'date' => $date,
                'status' => $historyStatus,
                'bridge_state' => $type,
                'donor_name' => $donorName,
                'donor_email' => null,
                'payment_method' => $paymentMethod['method'] ?? null,
                'payment_method_label' => $paymentMethod['label'] ?? null,
                'frequency' => 'one-time',
                'message' => $isDeposit ? $depositMessage : ucfirst(str_replace('_', ' ', $type)),
                'transaction_id' => $id,
                'is_outgoing' => $activityOutgoing,
                'recipient_type' => null,
                'source' => 'bridge_wallet_history',
                'sort_date' => $date,
            ];
        }

        return $activities;
    }

    /**
     * One UI row per VA deposit_id — latest lifecycle event only (funds_scheduled → payment_processed).
     *
     * @param  array{
     *     virtual_account_id: string|null,
     *     by_event_id: array<string, array<string, mixed>>,
     *     best_by_deposit_id: array<string, array<string, mixed>>
     * }  $vaContext
     * @return array<int, array<string, mixed>>
     */
    private function mapVirtualAccountActivities(array $vaContext): array
    {
        $activities = [];

        foreach ($vaContext['best_by_deposit_id'] as $depositId => $event) {
            if (! is_array($event) || $depositId === '') {
                continue;
            }

            $activityType = strtolower((string) ($event['type'] ?? $event['activity_type'] ?? ''));
            if (! in_array($activityType, [
                'funds_scheduled',
                'funds_received',
                'payment_submitted',
                'in_review',
                'payment_processed',
            ], true)) {
                continue;
            }

            $amount = round((float) ($event['amount'] ?? $event['receipt']['final_amount'] ?? 0), 2);
            if ($amount <= 0) {
                continue;
            }

            $id = (string) ($event['id'] ?? $event['activity_id'] ?? '');
            if ($id === '') {
                continue;
            }

            $status = $activityType === 'payment_processed' ? 'completed' : 'pending';
            $date = $this->parseBridgeTimestamp($event['created_at'] ?? $event['updated_at'] ?? null);
            $vaSenderName = $this->formatVirtualAccountDepositLabel($event);
            $paymentMethod = $this->resolveDepositPaymentMethod($event);
            $donorName = $vaSenderName ?? 'Bank deposit';
            $stateLabel = $this->formatBridgeStateLabel($activityType);

            $activities[] = [
                'id' => 'bridge_va_'.$depositId,
                'dedupe_key' => 'deposit:'.$depositId,
                'deposit_id' => $depositId,
                'virtual_account_event_id' => $id,
                'bridge_transfer_id' => null,
                'type' => 'deposit',
                'amount' => $amount,
                'date' => $date,
                'status' => $status,
                'bridge_state' => $activityType,
                'donor_name' => $donorName,
                'donor_email' => null,
                'payment_method' => $paymentMethod['method'] ?? null,
                'payment_method_label' => $paymentMethod['label'] ?? null,
                'frequency' => 'one-time',
                'message' => $status === 'pending'
                    ? $stateLabel.' — '.$donorName
                    : $this->buildVirtualAccountDepositMessage($event, $donorName, $status),
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
     * @param  array<int, string>  $onRampTransferIds
     * @return array<int, array<string, mixed>>
     */
    private function mapTransferActivities(
        string $customerId,
        array $viewerWalletIds,
        array $onRampTransferIds = [],
        ?string $viewerWalletAddress = null,
        int $maxTransfers = 100,
    ): array {
        $transfers = $this->fetchTransfersInvolvingWallet(
            $customerId,
            $viewerWalletIds,
            $viewerWalletAddress,
            $maxTransfers,
        );

        $counterpartyWalletIds = [];
        foreach ($transfers as $transfer) {
            if (! is_array($transfer)) {
                continue;
            }
            $sourceWalletId = (string) ($transfer['source']['bridge_wallet_id'] ?? '');
            $destWalletId = (string) ($transfer['destination']['bridge_wallet_id'] ?? '');
            if ($sourceWalletId !== '') {
                $counterpartyWalletIds[] = $sourceWalletId;
            }
            if ($destWalletId !== '') {
                $counterpartyWalletIds[] = $destWalletId;
            }
        }
        $this->warmWalletOwnerNames($counterpartyWalletIds);

        $viewerWalletIdSet = array_fill_keys($viewerWalletIds, true);
        $activities = [];

        foreach ($transfers as $transfer) {
            if (! is_array($transfer)) {
                continue;
            }

            $transferId = (string) ($transfer['id'] ?? '');
            if ($transferId === '') {
                continue;
            }

            if (in_array($transferId, $onRampTransferIds, true)) {
                continue;
            }

            $amount = round((float) ($transfer['amount'] ?? 0), 2);
            if ($amount <= 0) {
                continue;
            }

            $sourceWalletId = (string) ($transfer['source']['bridge_wallet_id'] ?? '');
            $destWalletId = (string) ($transfer['destination']['bridge_wallet_id'] ?? '');
            $destToAddress = strtolower((string) ($transfer['destination']['to_address'] ?? ''));
            $viewerAddress = strtolower((string) ($viewerWalletAddress ?? ''));
            $isOutgoing = $sourceWalletId !== '' && isset($viewerWalletIdSet[$sourceWalletId]);
            $isIncoming = ($destWalletId !== '' && isset($viewerWalletIdSet[$destWalletId]))
                || ($destToAddress !== '' && $viewerAddress !== '' && $destToAddress === $viewerAddress);

            // When both ends match known wallets, on_behalf_of is the sender's customer id.
            if ($isOutgoing && $isIncoming) {
                $onBehalf = (string) ($transfer['on_behalf_of'] ?? $transfer['customer_id'] ?? '');
                if ($onBehalf === $customerId) {
                    $isIncoming = false;
                } else {
                    $isOutgoing = false;
                }
            }

            if (! $isOutgoing && ! $isIncoming) {
                continue;
            }

            // VA/bank on-ramps appear as deposits in wallet history — skip duplicate rows here.
            if ($isIncoming && ! $isOutgoing && $this->isOnRampTransfer($transfer)) {
                continue;
            }

            $state = strtolower((string) ($transfer['state'] ?? $transfer['status'] ?? 'pending'));
            $status = $this->mapBridgeStateToUiStatus($state);
            $stateLabel = $this->formatBridgeStateLabel($state);

            $date = $this->parseBridgeTimestamp($transfer['updated_at'] ?? $transfer['created_at'] ?? null);
            $counterparty = $this->resolveTransferCounterpartyName($transfer, $customerId, $isOutgoing);
            if (($isOutgoing && $counterparty === 'Recipient') || (! $isOutgoing && $counterparty === 'Sender')) {
                $detailedTransfer = $this->fetchTransferDetails($transferId);
                if ($detailedTransfer !== null) {
                    $counterparty = $this->resolveTransferCounterpartyName($detailedTransfer, $customerId, $isOutgoing);
                }
            }

            $statusSuffix = $status === 'pending' ? ' ('.$stateLabel.')' : '';

            $activities[] = [
                'id' => 'bridge_transfer_'.$transferId,
                'dedupe_key' => 'transfer:'.$transferId,
                'deposit_id' => null,
                'bridge_transfer_id' => $transferId,
                'type' => $isOutgoing ? 'transfer_sent' : 'transfer_received',
                'amount' => $amount,
                'date' => $date,
                'status' => $status,
                'bridge_state' => $state,
                'donor_name' => $counterparty,
                'donor_email' => null,
                'frequency' => 'one-time',
                'message' => ($isOutgoing ? 'Sent to ' : 'Received from ').$counterparty.$statusSuffix,
                'transaction_id' => $transferId,
                'is_outgoing' => $isOutgoing,
                'recipient_type' => null,
                'source' => 'bridge_transfer',
                'sort_date' => $date,
            ];
        }

        return $activities;
    }

    /**
     * @param  array<string, mixed>  $paymentRoute
     */
    private function isVirtualAccountOnRamp(array $paymentRoute): bool
    {
        $routeType = strtolower((string) ($paymentRoute['type'] ?? ''));

        return $routeType === 'virtual_account'
            || ! empty($paymentRoute['virtual_account_event_id'])
            || ! empty($paymentRoute['virtual_account_id']);
    }

    private function virtualAccountActivityPriority(string $activityType): int
    {
        return match ($activityType) {
            'payment_processed' => 100,
            'in_review' => 40,
            'payment_submitted' => 30,
            'funds_received' => 20,
            'funds_scheduled' => 10,
            default => 0,
        };
    }

    /**
     * @param  array<string, mixed>  $transfer
     */
    private function isOnRampTransfer(array $transfer): bool
    {
        $source = is_array($transfer['source'] ?? null) ? $transfer['source'] : [];
        $paymentRail = strtolower((string) ($source['payment_rail'] ?? ''));
        $sourceType = strtolower((string) ($source['type'] ?? ''));

        return in_array($paymentRail, ['ach', 'wire', 'ach_push', 'ach_pull', 'sepa'], true)
            || in_array($sourceType, ['virtual_account', 'prefunded_account', 'external_bank_account'], true)
            || ! empty($source['virtual_account_id']);
    }

    private function resolveVirtualAccountId(BridgeIntegration $integration): ?string
    {
        $ids = $this->resolveAllVirtualAccountIds($integration);

        return $ids[0] ?? null;
    }

    /**
     * @return array<int, string>
     */
    private function resolveAllVirtualAccountIds(BridgeIntegration $integration): array
    {
        $integration->loadMissing('primaryWallet', 'wallets');
        $ids = [];

        if ($integration->primaryWallet?->virtual_account_id) {
            $ids[] = (string) $integration->primaryWallet->virtual_account_id;
        }

        foreach ($integration->wallets as $wallet) {
            if (! empty($wallet->virtual_account_id)) {
                $ids[] = (string) $wallet->virtual_account_id;
            }
        }

        $customerId = $integration->bridge_customer_id;
        if ($customerId) {
            $accounts = $this->bridgeService->normalizeBridgeListData(
                $this->bridgeService->getVirtualAccounts($customerId)
            );

            foreach ($accounts as $account) {
                if (! empty($account['id'])) {
                    $ids[] = (string) $account['id'];
                }
            }
        }

        return array_values(array_unique(array_filter($ids)));
    }

    /**
     * Bridge wallet IDs for history API (excludes virtual account IDs).
     *
     * @return array<int, string>
     */
    private function resolveBridgeWalletIdsForHistory(BridgeIntegration $integration, ?string $primaryWalletId): array
    {
        $integration->loadMissing('primaryWallet', 'wallets');
        $ids = [];

        if ($primaryWalletId !== null && $primaryWalletId !== '') {
            $ids[] = $primaryWalletId;
        }

        if (! empty($integration->bridge_wallet_id)) {
            $ids[] = (string) $integration->bridge_wallet_id;
        }

        foreach ($integration->wallets as $wallet) {
            if (! empty($wallet->bridge_wallet_id)) {
                $ids[] = (string) $wallet->bridge_wallet_id;
            }
        }

        if ($integration->primaryWallet?->bridge_wallet_id) {
            $ids[] = (string) $integration->primaryWallet->bridge_wallet_id;
        }

        $customerId = $integration->bridge_customer_id;
        if ($customerId) {
            $wallets = $this->bridgeService->normalizeBridgeListData(
                $this->bridgeService->getWallets($customerId)
            );

            foreach ($wallets as $wallet) {
                if (! empty($wallet['id'])) {
                    $ids[] = (string) $wallet['id'];
                }
            }
        }

        return array_values(array_unique(array_filter($ids)));
    }

    private function resetNameCaches(): void
    {
        $this->walletOwnerNames = [];
        $this->walletAddressOwners = [];
        $this->customerNames = [];
        $this->platformWalletIndexBuilt = false;
        $this->virtualAccountEventContext = null;
    }

    private function ensurePlatformWalletOwnerIndex(): void
    {
        if ($this->platformWalletIndexBuilt) {
            return;
        }

        $this->platformWalletIndexBuilt = true;

        $integrations = BridgeIntegration::query()
            ->whereNotNull('bridge_customer_id')
            ->with(['integratable', 'wallets', 'primaryWallet'])
            ->get();

        foreach ($integrations as $integration) {
            $name = $this->integratableDisplayName($integration);
            if ($name === '') {
                continue;
            }

            if (! empty($integration->bridge_wallet_id)) {
                $this->walletOwnerNames[(string) $integration->bridge_wallet_id] = $name;
            }

            foreach ($integration->wallets as $wallet) {
                $this->indexPlatformWallet($wallet, $name);
            }

            if ($integration->primaryWallet) {
                $this->indexPlatformWallet($integration->primaryWallet, $name);
            }
        }
    }

    /**
     * @param  \App\Models\BridgeWallet  $wallet
     */
    private function indexPlatformWallet(BridgeWallet $wallet, string $name): void
    {
        if (! empty($wallet->bridge_wallet_id)) {
            $this->walletOwnerNames[(string) $wallet->bridge_wallet_id] = $name;
        }

        if (! empty($wallet->virtual_account_id)) {
            $this->walletOwnerNames[(string) $wallet->virtual_account_id] = $name;
        }

        if (! empty($wallet->wallet_address)) {
            $this->walletAddressOwners[strtolower((string) $wallet->wallet_address)] = $name;
        }

        $vaDetails = $wallet->virtual_account_details;
        if (is_array($vaDetails)) {
            $address = $vaDetails['destination']['address'] ?? null;
            if (is_string($address) && $address !== '') {
                $this->walletAddressOwners[strtolower($address)] = $name;
            }
        }
    }

    private function buildDepositDedupeKey(
        ?string $depositId,
        ?string $vaEventId,
        ?string $transferId,
        string $fallbackId,
    ): string {
        if ($depositId !== null && $depositId !== '') {
            return 'deposit:'.$depositId;
        }

        if ($vaEventId !== null && $vaEventId !== '') {
            return 'deposit:va:'.$vaEventId;
        }

        if ($transferId !== null && $transferId !== '') {
            return 'transfer:'.$transferId;
        }

        return 'wallet:'.$fallbackId;
    }

    private function resolveWalletOwnerByAddress(?string $address): ?string
    {
        if ($address === null || $address === '') {
            return null;
        }

        $this->ensurePlatformWalletOwnerIndex();

        $name = $this->walletAddressOwners[strtolower($address)] ?? '';

        return $name !== '' ? $name : null;
    }

    /**
     * @return array{
     *     virtual_account_id: string|null,
     *     by_event_id: array<string, array<string, mixed>>,
     *     best_by_deposit_id: array<string, array<string, mixed>>
     * }
     */
    private function loadVirtualAccountEventContext(BridgeIntegration $integration, string $customerId): array
    {
        if ($this->virtualAccountEventContext !== null) {
            return $this->virtualAccountEventContext;
        }

        $virtualAccountIds = $this->resolveAllVirtualAccountIds($integration);
        if ($virtualAccountIds === []) {
            return $this->virtualAccountEventContext = [
                'virtual_account_id' => null,
                'by_event_id' => [],
                'best_by_deposit_id' => [],
            ];
        }

        $byEventId = [];
        $bestByDepositId = [];

        foreach ($virtualAccountIds as $virtualAccountId) {
            $events = $this->fetchPaginatedBridgeList(
                fn (array $query) => $this->bridgeService->getVirtualAccountHistory($customerId, $virtualAccountId, $query),
                200,
            );

            foreach ($events as $event) {
                if (! is_array($event)) {
                    continue;
                }

                $eventId = (string) ($event['id'] ?? $event['activity_id'] ?? '');
                if ($eventId !== '') {
                    $byEventId[$eventId] = $event;
                }

                $depositId = isset($event['deposit_id']) ? (string) $event['deposit_id'] : '';
                if ($depositId === '') {
                    continue;
                }

                $activityType = strtolower((string) ($event['type'] ?? $event['activity_type'] ?? ''));
                $priority = $this->virtualAccountActivityPriority($activityType);

                if (! isset($bestByDepositId[$depositId])
                    || $priority > $this->virtualAccountActivityPriority(
                        strtolower((string) ($bestByDepositId[$depositId]['type'] ?? $bestByDepositId[$depositId]['activity_type'] ?? '')),
                    )) {
                    $bestByDepositId[$depositId] = $event;
                }
            }
        }

        return $this->virtualAccountEventContext = [
            'virtual_account_id' => $virtualAccountIds[0],
            'by_event_id' => $byEventId,
            'best_by_deposit_id' => $bestByDepositId,
        ];
    }

    /**
     * @param  array<string, mixed>  $paymentRoute
     * @param  array{
     *     virtual_account_id: string|null,
     *     by_event_id: array<string, array<string, mixed>>,
     *     best_by_deposit_id: array<string, array<string, mixed>>
     * }  $vaContext
     * @return array<string, mixed>|null
     */
    private function resolveVirtualAccountEventForPaymentRoute(array $paymentRoute, array $vaContext): ?array
    {
        $eventId = (string) ($paymentRoute['virtual_account_event_id'] ?? '');
        if ($eventId !== '' && isset($vaContext['by_event_id'][$eventId])) {
            return $vaContext['by_event_id'][$eventId];
        }

        $depositId = (string) ($paymentRoute['deposit_id'] ?? '');
        if ($depositId !== '' && isset($vaContext['best_by_deposit_id'][$depositId])) {
            return $vaContext['best_by_deposit_id'][$depositId];
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function formatVirtualAccountDepositLabel(array $event): ?string
    {
        $source = is_array($event['source'] ?? null) ? $event['source'] : [];
        $details = $this->extractVirtualAccountSourceDetails($source);

        $primary = $details['originator_name'] ?? $details['sender_name'];
        $bankName = $details['bank_name'];

        if ($primary !== null && $bankName !== null && strcasecmp($primary, $bankName) !== 0) {
            return "{$primary} · {$bankName}";
        }

        return $primary ?? $bankName;
    }

    /**
     * @param  array<string, mixed>  $event
     * @return array{method: string, label: string}|null
     */
    private function resolveDepositPaymentMethod(array $event): ?array
    {
        $source = is_array($event['source'] ?? null) ? $event['source'] : [];
        $rail = strtolower(trim((string) ($source['payment_rail'] ?? $event['payment_rail'] ?? '')));

        if ($rail !== '') {
            return [
                'method' => $this->normalizeDepositPaymentMethod($rail),
                'label' => $this->formatDepositPaymentMethodLabel($rail),
            ];
        }

        $details = $this->extractVirtualAccountSourceDetails($source);
        if ($details['originator_name'] !== null || $details['bank_name'] !== null) {
            return ['method' => 'wire', 'label' => 'Wire'];
        }

        if ($details['sender_name'] !== null) {
            return ['method' => 'ach', 'label' => 'ACH'];
        }

        return null;
    }

    private function normalizeDepositPaymentMethod(string $rail): string
    {
        return match ($rail) {
            'ach_push', 'ach_pull', 'ach_same_day' => 'ach',
            'swift' => 'wire',
            default => $rail,
        };
    }

    private function formatDepositPaymentMethodLabel(string $rail): string
    {
        return match (strtolower($rail)) {
            'ach', 'ach_push', 'ach_pull', 'ach_same_day' => 'ACH',
            'wire', 'swift' => 'Wire',
            'fednow' => 'FedNow',
            'sepa' => 'SEPA',
            'pix' => 'PIX',
            'spei' => 'SPEI',
            default => strtoupper(str_replace('_', ' ', $rail)),
        };
    }

    /**
     * @param  array<string, mixed>  $source
     * @return array{sender_name: ?string, bank_name: ?string, originator_name: ?string}
     */
    private function extractVirtualAccountSourceDetails(array $source): array
    {
        return [
            'sender_name' => $this->trimName($source['sender_name'] ?? null),
            'bank_name' => $this->trimName($source['bank_name'] ?? null),
            'originator_name' => $this->trimName($source['originator_name'] ?? null),
        ];
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function buildVirtualAccountDepositMessage(array $event, string $donorName, string $status): string
    {
        if ($status === 'pending') {
            return 'Deposit processing';
        }

        $source = is_array($event['source'] ?? null) ? $event['source'] : [];
        $details = $this->extractVirtualAccountSourceDetails($source);
        $paymentRail = strtolower((string) ($source['payment_rail'] ?? $event['payment_rail'] ?? ''));

        if ($details['bank_name'] !== null && $donorName !== $details['bank_name']) {
            return 'Deposit from '.$donorName;
        }

        if (in_array($paymentRail, ['wire', 'swift'], true) && $details['bank_name'] !== null) {
            return 'Wire deposit from '.$details['bank_name'];
        }

        return 'Deposit to wallet';
    }

    /**
     * @param  array<string, mixed>  $event
     * @param  array<string, mixed>  $paymentRoute
     * @param  array{
     *     virtual_account_id: string|null,
     *     by_event_id: array<string, array<string, mixed>>,
     *     best_by_deposit_id: array<string, array<string, mixed>>
     * }  $vaContext
     */
    private function resolveVirtualAccountDepositMessage(
        array $event,
        array $paymentRoute,
        array $vaContext,
        string $donorName,
    ): string {
        $vaEvent = $this->resolveVirtualAccountEventForPaymentRoute($paymentRoute, $vaContext) ?? $event;
        $source = is_array($vaEvent['source'] ?? null) ? $vaEvent['source'] : [];

        if ($source !== []) {
            return $this->buildVirtualAccountDepositMessage($vaEvent, $donorName, 'completed');
        }

        return 'Deposit to wallet';
    }

    /**
     * @param  array<int, string>  $walletIds
     */
    private function warmWalletOwnerNames(array $walletIds): void
    {
        $this->ensurePlatformWalletOwnerIndex();

        $missing = array_values(array_unique(array_filter(
            $walletIds,
            fn (string $id) => $id !== '' && ! array_key_exists($id, $this->walletOwnerNames),
        )));

        if ($missing === []) {
            return;
        }

        foreach ($missing as $walletId) {
            $this->walletOwnerNames[$walletId] = '';
        }

        $wallets = BridgeWallet::query()
            ->whereIn('bridge_wallet_id', $missing)
            ->with(['bridgeIntegration.integratable'])
            ->get();

        foreach ($wallets as $wallet) {
            $bridgeWalletId = (string) $wallet->bridge_wallet_id;
            $name = $this->integratableDisplayName($wallet->bridgeIntegration);
            if ($name !== '') {
                $this->walletOwnerNames[$bridgeWalletId] = $name;
            }
        }
    }

    private function resolveWalletOwnerName(?string $walletId): ?string
    {
        if ($walletId === null || $walletId === '') {
            return null;
        }

        if (! array_key_exists($walletId, $this->walletOwnerNames)) {
            $this->warmWalletOwnerNames([$walletId]);
        }

        $name = $this->walletOwnerNames[$walletId] ?? '';

        return $name !== '' ? $name : null;
    }

    private function resolveCustomerDisplayName(?string $customerId): ?string
    {
        if ($customerId === null || $customerId === '') {
            return null;
        }

        if (array_key_exists($customerId, $this->customerNames)) {
            $cached = $this->customerNames[$customerId];

            return $cached !== '' ? $cached : null;
        }

        $integration = BridgeIntegration::query()
            ->where('bridge_customer_id', $customerId)
            ->with('integratable')
            ->first();

        if ($integration !== null) {
            $name = $this->integratableDisplayName($integration);
            if ($name !== '') {
                $this->customerNames[$customerId] = $name;

                return $name;
            }
        }

        $result = $this->bridgeService->getCustomer($customerId);
        $name = '';
        if (($result['success'] ?? false) && is_array($result['data'] ?? null)) {
            $name = $this->formatBridgeCustomerRecordName($result['data']);
        }

        $this->customerNames[$customerId] = $name;

        return $name !== '' ? $name : null;
    }

    private function integratableDisplayName(?BridgeIntegration $integration): string
    {
        if ($integration === null) {
            return '';
        }

        $entity = $integration->integratable;
        if ($entity instanceof User || $entity instanceof Organization) {
            return trim((string) $entity->name);
        }

        return '';
    }

    /**
     * @param  array<string, mixed>  $customer
     */
    private function formatBridgeCustomerRecordName(array $customer): string
    {
        $type = strtolower((string) ($customer['type'] ?? ''));
        if ($type === 'business') {
            foreach (['business_legal_name', 'business_name'] as $key) {
                $name = trim((string) ($customer[$key] ?? ''));
                if ($name !== '') {
                    return $name;
                }
            }
        }

        $firstName = trim((string) ($customer['first_name'] ?? ''));
        $lastName = trim((string) ($customer['last_name'] ?? ''));
        $fullName = trim("{$firstName} {$lastName}");
        if ($fullName !== '') {
            return $fullName;
        }

        return trim((string) ($customer['email'] ?? ''));
    }

    /**
     * @param  array<string, mixed>  $event
     * @param  array{
     *     virtual_account_id: string|null,
     *     by_event_id: array<string, array<string, mixed>>,
     *     best_by_deposit_id: array<string, array<string, mixed>>
     * }  $vaContext
     */
    private function resolveWalletHistoryCounterpartyName(
        array $event,
        string $viewerCustomerId,
        bool $isDeposit,
        array $vaContext,
    ): ?string {
        $paymentRoute = is_array($event['payment_route'] ?? null) ? $event['payment_route'] : [];
        $routeType = strtolower((string) ($paymentRoute['type'] ?? ''));
        $source = is_array($event['source'] ?? null) ? $event['source'] : [];
        $destination = is_array($event['destination'] ?? null) ? $event['destination'] : [];

        if ($isDeposit) {
            if ($routeType === 'transfer') {
                $transferId = (string) ($paymentRoute['transfer_id'] ?? '');
                if ($transferId !== '') {
                    $transfer = $this->fetchTransferDetails($transferId);
                    if ($transfer !== null) {
                        $senderName = $this->resolveTransferCounterpartyName($transfer, $viewerCustomerId, false);
                        if ($senderName !== 'Sender') {
                            return $senderName;
                        }

                        $onBehalfOf = (string) ($transfer['on_behalf_of'] ?? '');
                        if ($onBehalfOf !== '' && $onBehalfOf !== $viewerCustomerId) {
                            $name = $this->resolveCustomerDisplayName($onBehalfOf);
                            if ($name !== null) {
                                return $name;
                            }
                        }
                    }
                }

                $senderCustomerId = (string) ($paymentRoute['customer_id'] ?? '');
                if ($senderCustomerId !== '' && $senderCustomerId !== $viewerCustomerId) {
                    $name = $this->resolveCustomerDisplayName($senderCustomerId);
                    if ($name !== null) {
                        return $name;
                    }
                }
            }

            if ($this->isVirtualAccountOnRamp($paymentRoute)) {
                $vaEvent = $this->resolveVirtualAccountEventForPaymentRoute($paymentRoute, $vaContext);
                if ($vaEvent !== null) {
                    $label = $this->formatVirtualAccountDepositLabel($vaEvent);
                    if ($label !== null) {
                        return $label;
                    }
                }
            }

            return $this->extractPartyNameFromEndpoint($source);
        }

        $recipientWalletId = (string) ($destination['bridge_wallet_id'] ?? '');
        $name = $this->resolveWalletOwnerName($recipientWalletId !== '' ? $recipientWalletId : null);
        if ($name !== null) {
            return $name;
        }

        $toAddress = (string) ($destination['to_address'] ?? '');
        $name = $this->resolveWalletOwnerByAddress($toAddress !== '' ? $toAddress : null);
        if ($name !== null) {
            return $name;
        }

        return $this->extractPartyNameFromEndpoint($destination);
    }

    /**
     * @param  array<string, mixed>  $transfer
     */
    private function resolveTransferCounterpartyName(
        array $transfer,
        string $viewerCustomerId,
        bool $isOutgoing,
    ): string {
        $source = is_array($transfer['source'] ?? null) ? $transfer['source'] : [];
        $destination = is_array($transfer['destination'] ?? null) ? $transfer['destination'] : [];

        if ($isOutgoing) {
            $destWalletId = (string) ($destination['bridge_wallet_id'] ?? '');
            $name = $this->resolveWalletOwnerName($destWalletId !== '' ? $destWalletId : null);
            if ($name !== null) {
                return $name;
            }

            $toAddress = (string) ($destination['to_address'] ?? '');
            $name = $this->resolveWalletOwnerByAddress($toAddress !== '' ? $toAddress : null);
            if ($name !== null) {
                return $name;
            }

            return $this->extractPartyNameFromEndpoint($destination) ?? 'Recipient';
        }

        $sourceWalletId = (string) ($source['bridge_wallet_id'] ?? '');
        $name = $this->resolveWalletOwnerName($sourceWalletId !== '' ? $sourceWalletId : null);
        if ($name !== null) {
            return $name;
        }

        $fromAddress = (string) ($source['from_address'] ?? '');
        $name = $this->resolveWalletOwnerByAddress($fromAddress !== '' ? $fromAddress : null);
        if ($name !== null) {
            return $name;
        }

        $senderName = $this->extractPartyNameFromEndpoint($source);
        if ($senderName !== null) {
            return $senderName;
        }

        $onBehalfOf = (string) ($transfer['on_behalf_of'] ?? '');
        if ($onBehalfOf !== '' && $onBehalfOf !== $viewerCustomerId) {
            $customerName = $this->resolveCustomerDisplayName($onBehalfOf);
            if ($customerName !== null) {
                return $customerName;
            }
        }

        return 'Sender';
    }

    /**
     * @return array<string, mixed>|null
     */
    private function fetchTransferDetails(string $transferId): ?array
    {
        $result = $this->bridgeService->getTransfer($transferId);
        if (! ($result['success'] ?? false) || ! is_array($result['data'] ?? null)) {
            return null;
        }

        return $result['data'];
    }

    /**
     * @param  array<string, mixed>  $endpoint
     */
    private function extractPartyNameFromEndpoint(array $endpoint): ?string
    {
        foreach (['sender_name', 'bank_beneficiary_name', 'originator_name', 'account_holder_name'] as $key) {
            $name = $this->trimName($endpoint[$key] ?? null);
            if ($name !== null) {
                return $name;
            }
        }

        return null;
    }

    private function trimName(mixed $value): ?string
    {
        $name = trim((string) $value);

        return $name !== '' ? $name : null;
    }

    /**
     * Merge on_behalf_of transfers with platform-wide transfers involving this wallet.
     * Incoming pending transfers use on_behalf_of of the sender, so we must scan platform list.
     *
     * @return array<int, array<string, mixed>>
     */
    private function fetchTransfersInvolvingWallet(
        string $customerId,
        array $walletIds,
        ?string $viewerWalletAddress,
        int $maxTransfers,
    ): array {
        $onBehalf = $this->fetchPaginatedBridgeList(
            fn (array $query) => $this->bridgeService->getCustomerTransfers($customerId, $query),
            $maxTransfers,
        );

        $platform = $this->fetchPaginatedBridgeList(
            fn (array $query) => $this->bridgeService->getTransfers($query),
            min($maxTransfers * 3, 300),
        );

        $byId = [];
        foreach (array_merge($onBehalf, $platform) as $transfer) {
            if (! is_array($transfer)) {
                continue;
            }

            $transferId = (string) ($transfer['id'] ?? '');
            if ($transferId === '') {
                continue;
            }

            if (! $this->transferInvolvesWallet($transfer, $walletIds, $viewerWalletAddress, $customerId)) {
                continue;
            }

            $byId[$transferId] = $transfer;
        }

        return array_values($byId);
    }

    /**
     * @param  array<string, mixed>  $transfer
     * @param  array<int, string>  $walletIds
     */
    private function transferInvolvesWallet(
        array $transfer,
        array $walletIds,
        ?string $viewerWalletAddress,
        ?string $customerId = null,
    ): bool {
        $source = is_array($transfer['source'] ?? null) ? $transfer['source'] : [];
        $destination = is_array($transfer['destination'] ?? null) ? $transfer['destination'] : [];
        $sourceWalletId = (string) ($source['bridge_wallet_id'] ?? '');
        $destWalletId = (string) ($destination['bridge_wallet_id'] ?? '');
        $destToAddress = strtolower((string) ($destination['to_address'] ?? ''));
        $sourceFromAddress = strtolower((string) ($source['from_address'] ?? ''));
        $viewerAddress = strtolower((string) ($viewerWalletAddress ?? ''));
        $walletIdSet = array_fill_keys($walletIds, true);

        if ($sourceWalletId !== '' && isset($walletIdSet[$sourceWalletId])) {
            return true;
        }

        if ($destWalletId !== '' && isset($walletIdSet[$destWalletId])) {
            return true;
        }

        if ($viewerAddress !== '') {
            if ($destToAddress === $viewerAddress || $sourceFromAddress === $viewerAddress) {
                return true;
            }
        }

        if ($customerId !== null && $customerId !== '') {
            $onBehalf = (string) ($transfer['on_behalf_of'] ?? $transfer['customer_id'] ?? '');
            if ($onBehalf === $customerId) {
                return true;
            }

            foreach ([$source, $destination] as $endpoint) {
                $endpointCustomer = (string) ($endpoint['customer_id'] ?? '');
                if ($endpointCustomer === $customerId) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * All Bridge wallet / VA identifiers for this integration (sandbox may use VA id on transfers).
     *
     * @return array<int, string>
     */
    private function resolveIntegrationWalletIds(BridgeIntegration $integration, ?string $primaryWalletId): array
    {
        $integration->loadMissing('primaryWallet', 'wallets');
        $ids = [];

        if ($primaryWalletId !== null && $primaryWalletId !== '') {
            $ids[] = $primaryWalletId;
        }

        if (! empty($integration->bridge_wallet_id)) {
            $ids[] = (string) $integration->bridge_wallet_id;
        }

        foreach ($integration->wallets as $wallet) {
            if (! empty($wallet->bridge_wallet_id)) {
                $ids[] = (string) $wallet->bridge_wallet_id;
            }
            if (! empty($wallet->virtual_account_id)) {
                $ids[] = (string) $wallet->virtual_account_id;
            }
        }

        if ($integration->primaryWallet) {
            $pw = $integration->primaryWallet;
            if (! empty($pw->bridge_wallet_id)) {
                $ids[] = (string) $pw->bridge_wallet_id;
            }
            if (! empty($pw->virtual_account_id)) {
                $ids[] = (string) $pw->virtual_account_id;
            }
        }

        return array_values(array_unique(array_filter($ids)));
    }

    private function mapBridgeStateToUiStatus(string $state): string
    {
        return match (strtolower(trim($state))) {
            'payment_processed', 'completed' => 'completed',
            'failed', 'returned', 'refunded', 'error', 'undeliverable' => 'failed',
            'canceled', 'cancelled' => 'cancelled',
            default => 'pending',
        };
    }

    private function formatBridgeStateLabel(string $state): string
    {
        return match (strtolower(trim($state))) {
            'awaiting_funds' => 'Awaiting funds',
            'funds_received' => 'Funds received',
            'funds_scheduled' => 'Scheduled',
            'payment_submitted' => 'Submitted',
            'in_review' => 'In review',
            'payment_processed' => 'Completed',
            'processing' => 'Processing',
            'returned' => 'Returned',
            'refunded' => 'Refunded',
            'failed' => 'Failed',
            default => ucfirst(str_replace('_', ' ', $state)),
        };
    }

    private function resolveIntegrationWalletAddress(BridgeIntegration $integration): ?string
    {
        $integration->loadMissing('primaryWallet', 'wallets');

        $candidates = [];
        if ($integration->primaryWallet?->wallet_address) {
            $candidates[] = (string) $integration->primaryWallet->wallet_address;
        }

        foreach ($integration->wallets as $wallet) {
            if (! empty($wallet->wallet_address)) {
                $candidates[] = (string) $wallet->wallet_address;
            }

            $vaDetails = $wallet->virtual_account_details;
            if (is_array($vaDetails)) {
                $address = $vaDetails['destination']['address'] ?? null;
                if (is_string($address) && $address !== '') {
                    $candidates[] = $address;
                }
            }
        }

        foreach ($candidates as $address) {
            if ($address !== '') {
                return $address;
            }
        }

        return null;
    }

    /**
     * @param  callable(array<string, mixed>): array<string, mixed>  $fetchPage
     * @return array<int, array<string, mixed>>
     */
    private function fetchPaginatedBridgeList(callable $fetchPage, int $maxItems = 100): array
    {
        $maxItems = max(1, min($maxItems, 500));
        $pageLimit = min(100, $maxItems);
        $collected = [];
        $startingAfter = null;

        while (count($collected) < $maxItems) {
            $query = ['limit' => $pageLimit];
            if ($startingAfter !== null) {
                $query['starting_after'] = $startingAfter;
            }

            $result = $fetchPage($query);
            $page = $this->bridgeService->normalizeBridgeListData(
                is_array($result) && array_key_exists('success', $result) ? $result : ['success' => true, 'data' => $result]
            );

            if ($page === []) {
                break;
            }

            foreach ($page as $item) {
                if (! is_array($item)) {
                    continue;
                }

                $collected[] = $item;
                if (count($collected) >= $maxItems) {
                    break 2;
                }
            }

            $last = $page[count($page) - 1];
            $lastId = (string) ($last['id'] ?? '');
            if ($lastId === '' || count($page) < $pageLimit) {
                break;
            }

            $startingAfter = $lastId;
        }

        return $collected;
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
