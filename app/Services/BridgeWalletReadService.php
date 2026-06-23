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
 */
class BridgeWalletReadService
{
    /** @var array<string, string> */
    private array $walletOwnerNames = [];

    /** @var array<string, string> */
    private array $customerNames = [];

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

        $snapshot = $this->getWalletSnapshot($integration);
        $walletId = $snapshot['wallet_id'] ?? null;
        $vaContext = $this->loadVirtualAccountEventContext($integration, $customerId);

        $activities = [];

        if ($walletId !== null) {
            $activities = array_merge($activities, $this->mapWalletHistoryActivities($customerId, $walletId, $vaContext));
        }

        $settledDepositIds = $this->collectSettledDepositIds($activities);

        $activities = array_merge(
            $activities,
            $this->mapVirtualAccountActivities($customerId, $settledDepositIds, $vaContext),
        );

        if ($walletId !== null) {
            $activities = array_merge(
                $activities,
                $this->mapTransferActivities($customerId, $walletId, $this->collectOnRampTransferIds($activities)),
            );
        }

        usort($activities, fn (array $a, array $b) => strcmp($b['sort_date'] ?? '', $a['sort_date'] ?? ''));

        return array_slice($this->dedupeActivities($activities), 0, max(1, $limit));
    }

    /**
     * @param  array<int, array<string, mixed>>  $activities
     * @return array<int, string>
     */
    private function collectSettledDepositIds(array $activities): array
    {
        $ids = [];
        foreach ($activities as $activity) {
            if (($activity['status'] ?? '') !== 'completed' || ($activity['type'] ?? '') !== 'deposit') {
                continue;
            }
            $depositId = $activity['deposit_id'] ?? null;
            if (is_string($depositId) && $depositId !== '') {
                $ids[] = $depositId;
            }
        }

        return array_values(array_unique($ids));
    }

    /**
     * @param  array<int, array<string, mixed>>  $activities
     * @return array<int, string>
     */
    private function collectOnRampTransferIds(array $activities): array
    {
        $ids = [];
        foreach ($activities as $activity) {
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

            if (! isset($bestByKey[$key])) {
                $bestByKey[$key] = $activity;

                continue;
            }

            if ($this->activitySourcePriority($activity) > $this->activitySourcePriority($bestByKey[$key])) {
                $bestByKey[$key] = $activity;
            }
        }

        $deduped = [];
        foreach ($bestByKey as $activity) {
            unset($activity['sort_date'], $activity['dedupe_key'], $activity['deposit_id'], $activity['bridge_transfer_id']);
            $deduped[] = $activity;
        }

        usort($deduped, fn (array $a, array $b) => strcmp($b['date'] ?? '', $a['date'] ?? ''));

        return $deduped;
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
    private function mapWalletHistoryActivities(string $customerId, string $walletId, array $vaContext): array
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

            $paymentRoute = is_array($event['payment_route'] ?? null) ? $event['payment_route'] : [];
            $routeType = strtolower((string) ($paymentRoute['type'] ?? ''));
            $depositId = isset($paymentRoute['deposit_id']) ? (string) $paymentRoute['deposit_id'] : null;
            $transferId = isset($paymentRoute['transfer_id']) ? (string) $paymentRoute['transfer_id'] : null;
            $dedupeKey = $depositId !== null && $depositId !== ''
                ? 'deposit:'.$depositId
                : ($transferId !== null && $transferId !== '' ? 'transfer:'.$transferId : 'wallet:'.$id);

            $counterpartyName = $this->resolveWalletHistoryCounterpartyName($event, $customerId, $isDeposit, $vaContext);

            if ($isDeposit) {
                $donorName = $counterpartyName
                    ?? ($this->isVirtualAccountOnRamp($paymentRoute) ? 'ACH / wire deposit' : 'Bank deposit');
                $depositMessage = $this->resolveVirtualAccountDepositMessage($event, $paymentRoute, $vaContext, $donorName);
            } else {
                $donorName = $counterpartyName ?? 'Bridge wallet';
                $depositMessage = ucfirst(str_replace('_', ' ', $type));
            }

            $activityType = $isDeposit ? 'deposit' : 'transfer_sent';
            $activityOutgoing = $isOutgoing;
            if ($isDeposit && $routeType === 'transfer') {
                $senderCustomerId = (string) ($paymentRoute['customer_id'] ?? '');
                if ($senderCustomerId !== '' && $senderCustomerId !== $customerId) {
                    $activityType = 'transfer_received';
                    $activityOutgoing = false;
                }
            }

            $activities[] = [
                'id' => 'bridge_wallet_'.$id,
                'dedupe_key' => $dedupeKey,
                'deposit_id' => $depositId,
                'bridge_transfer_id' => $transferId,
                'type' => $activityType,
                'amount' => $amount,
                'date' => $date,
                'status' => 'completed',
                'donor_name' => $donorName,
                'donor_email' => null,
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
     * @param  array<int, string>  $settledDepositIds
     * @param  array{
     *     virtual_account_id: string|null,
     *     by_event_id: array<string, array<string, mixed>>,
     *     best_by_deposit_id: array<string, array<string, mixed>>
     * }  $vaContext
     * @return array<int, array<string, mixed>>
     */
    private function mapVirtualAccountActivities(
        string $customerId,
        array $settledDepositIds,
        array $vaContext,
    ): array {
        $events = array_values($vaContext['by_event_id']);
        $bestByDeposit = [];

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

            if (! in_array($activityType, [
                'funds_scheduled',
                'funds_received',
                'payment_submitted',
                'in_review',
                'payment_processed',
            ], true)) {
                continue;
            }

            $depositId = isset($event['deposit_id']) ? (string) $event['deposit_id'] : '';
            $groupKey = $depositId !== '' ? 'deposit:'.$depositId : 'va:'.$id;

            if ($depositId !== '' && in_array($depositId, $settledDepositIds, true)) {
                continue;
            }

            $candidate = [
                'event' => $event,
                'activity_type' => $activityType,
                'amount' => $amount,
                'id' => $id,
                'deposit_id' => $depositId !== '' ? $depositId : null,
                'group_key' => $groupKey,
                'priority' => $this->virtualAccountActivityPriority($activityType),
            ];

            if (! isset($bestByDeposit[$groupKey])
                || $candidate['priority'] > $bestByDeposit[$groupKey]['priority']) {
                $bestByDeposit[$groupKey] = $candidate;
            }
        }

        $activities = [];
        foreach ($bestByDeposit as $candidate) {
            $event = $candidate['event'];
            $activityType = $candidate['activity_type'];
            $status = $activityType === 'payment_processed' ? 'completed' : 'pending';
            $date = $this->parseBridgeTimestamp($event['created_at'] ?? $event['updated_at'] ?? null);
            $depositId = $candidate['deposit_id'];
            $id = $candidate['id'];
            $vaSenderName = $this->formatVirtualAccountDepositLabel($event);
            $donorName = $vaSenderName ?? 'ACH / wire deposit';

            $activities[] = [
                'id' => 'bridge_va_'.$id,
                'dedupe_key' => $candidate['group_key'],
                'deposit_id' => $depositId,
                'bridge_transfer_id' => null,
                'type' => 'deposit',
                'amount' => $candidate['amount'],
                'date' => $date,
                'status' => $status,
                'donor_name' => $donorName,
                'donor_email' => null,
                'frequency' => 'one-time',
                'message' => $this->buildVirtualAccountDepositMessage($event, $donorName, $status),
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
    private function mapTransferActivities(string $customerId, string $walletId, array $onRampTransferIds = []): array
    {
        $result = $this->bridgeService->getCustomerTransfers($customerId);
        $transfers = $this->bridgeService->normalizeBridgeListData($result);

        $walletIds = [];
        foreach ($transfers as $transfer) {
            if (! is_array($transfer)) {
                continue;
            }
            $sourceWalletId = (string) ($transfer['source']['bridge_wallet_id'] ?? '');
            $destWalletId = (string) ($transfer['destination']['bridge_wallet_id'] ?? '');
            if ($sourceWalletId !== '') {
                $walletIds[] = $sourceWalletId;
            }
            if ($destWalletId !== '') {
                $walletIds[] = $destWalletId;
            }
        }
        $this->warmWalletOwnerNames($walletIds);

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
            $isOutgoing = $sourceWalletId === $walletId;
            $isIncoming = $destWalletId === $walletId;

            if (! $isOutgoing && ! $isIncoming) {
                continue;
            }

            if ($isIncoming && ! $isOutgoing && ($sourceWalletId === '' || $this->isOnRampTransfer($transfer))) {
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
            $counterparty = $this->resolveTransferCounterpartyName($transfer, $customerId, $isOutgoing);

            $activities[] = [
                'id' => 'bridge_transfer_'.$transferId,
                'dedupe_key' => 'transfer:'.$transferId,
                'deposit_id' => null,
                'bridge_transfer_id' => $transferId,
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

    /**
     * @param  array<string, mixed>  $paymentRoute
     */
    private function isVirtualAccountOnRamp(array $paymentRoute): bool
    {
        $routeType = strtolower((string) ($paymentRoute['type'] ?? ''));

        return in_array($routeType, ['virtual_account', 'ach', 'wire', 'ach_push', 'ach_pull'], true)
            || ! empty($paymentRoute['deposit_id']);
    }

    /**
     * Bridge VA history emits multiple in-flight events per deposit; prefer the terminal state.
     */
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

    private function resetNameCaches(): void
    {
        $this->walletOwnerNames = [];
        $this->customerNames = [];
        $this->virtualAccountEventContext = null;
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

        $virtualAccountId = $this->resolveVirtualAccountId($integration);
        if ($virtualAccountId === null) {
            return $this->virtualAccountEventContext = [
                'virtual_account_id' => null,
                'by_event_id' => [],
                'best_by_deposit_id' => [],
            ];
        }

        $result = $this->bridgeService->getVirtualAccountHistory($customerId, $virtualAccountId);
        $events = $this->bridgeService->normalizeBridgeListData($result);

        $byEventId = [];
        $bestByDepositId = [];

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

        return $this->virtualAccountEventContext = [
            'virtual_account_id' => $virtualAccountId,
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

            return $this->extractPartyNameFromEndpoint($destination) ?? 'Recipient';
        }

        $sourceWalletId = (string) ($source['bridge_wallet_id'] ?? '');
        $name = $this->resolveWalletOwnerName($sourceWalletId !== '' ? $sourceWalletId : null);
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
