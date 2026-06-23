<?php

namespace App\Services;

use App\Models\BridgeIntegration;
use App\Models\Organization;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Aligns local wallet ledger with Bridge custodial wallet movements.
 *
 * @see https://apidocs.bridge.xyz/platform/wallets/move-money
 */
class BridgeWalletLedgerReconciliationService
{
    public function __construct(
        private readonly BridgeService $bridgeService,
    ) {}

    /**
     * @return array{
     *     refunded_outbound: int,
     *     reversed_inbound: int,
     *     completed_inbound: int,
     *     balance_synced: int
     * }
     */
    public function reconcile(BridgeIntegration $integration): array
    {
        $user = $this->resolveWalletUser($integration);
        if ($user === null) {
            return [
                'refunded_outbound' => 0,
                'reversed_inbound' => 0,
                'completed_inbound' => 0,
                'balance_synced' => 0,
            ];
        }

        $stats = [
            'refunded_outbound' => 0,
            'reversed_inbound' => 0,
            'completed_inbound' => 0,
            'balance_synced' => 0,
        ];

        $stats['refunded_outbound'] += $this->refundLocalOnlyOutboundTransfers($user);
        $stats['refunded_outbound'] += $this->refundFailedBridgeOutboundTransfers($user);
        $stats['reversed_inbound'] += $this->reverseLocalOnlyInboundCredits($user);
        $stats['completed_inbound'] += $this->completeMissedInboundTransfers($user);

        $bridgeBalance = $this->fetchCustodialWalletBalance($integration);
        if ($bridgeBalance !== null && $this->syncUserBalanceFromBridge($user, $bridgeBalance)) {
            $stats['balance_synced'] = 1;
            $user->refresh();
        }

        if (array_sum($stats) > 0) {
            Log::info('Bridge wallet ledger reconciliation applied', [
                'integration_id' => $integration->id,
                'user_id' => $user->id,
                'stats' => $stats,
                'bridge_balance' => $bridgeBalance,
            ]);
        }

        return $stats;
    }

    public function fetchCustodialWalletBalance(BridgeIntegration $integration): ?float
    {
        $customerId = $integration->bridge_customer_id;
        if (! $customerId || $this->bridgeService->isSandbox()) {
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

        return $this->bridgeService->parseBridgeWalletUsdBalance($walletResult['data']);
    }

    private function refundLocalOnlyOutboundTransfers(User $user): int
    {
        $transactions = Transaction::query()
            ->where('user_id', $user->id)
            ->where('type', 'transfer_out')
            ->where('payment_method', 'bridge')
            ->whereIn('status', ['completed', 'pending'])
            ->where($this->missingBridgeTransferIdConstraint())
            ->get();

        $refunded = 0;
        foreach ($transactions as $transaction) {
            if ($this->refundOutboundTransfer($user, $transaction, 'local_only_transfer')) {
                $refunded++;
            }
        }

        return $refunded;
    }

    private function refundFailedBridgeOutboundTransfers(User $user): int
    {
        $transactions = Transaction::query()
            ->where('user_id', $user->id)
            ->where('type', 'transfer_out')
            ->where('payment_method', 'bridge')
            ->whereIn('status', ['completed', 'pending'])
            ->whereNotNull('meta')
            ->whereRaw("JSON_EXTRACT(meta, '$.bridge_transfer_id') IS NOT NULL")
            ->whereRaw("JSON_EXTRACT(meta, '$.bridge_transfer_id') != ''")
            ->whereRaw("JSON_EXTRACT(meta, '$.ledger_reconciled_at') IS NULL")
            ->get();

        $refunded = 0;
        foreach ($transactions as $transaction) {
            $transferId = (string) ($transaction->meta['bridge_transfer_id'] ?? '');
            if ($transferId === '') {
                continue;
            }

            $bridgeLookup = $this->lookupBridgeTransfer($transferId);
            if ($bridgeLookup === null) {
                continue;
            }

            if ($bridgeLookup['state'] === 'not_found') {
                if ($this->refundOutboundTransfer($user, $transaction, 'bridge_transfer_not_found', 'not_found')) {
                    $refunded++;
                }

                continue;
            }

            $mapped = $this->mapBridgeTransferState($bridgeLookup['state']);
            if (! in_array($mapped, ['failed', 'cancelled'], true)) {
                if ($mapped === 'completed' && $transaction->status !== 'completed') {
                    $transaction->status = 'completed';
                    $transaction->processed_at = $transaction->processed_at ?? now();
                    $meta = $transaction->meta ?? [];
                    $meta['bridge_state'] = $bridgeLookup['state'];
                    $meta['ledger_reconciled_at'] = now()->toIso8601String();
                    $transaction->meta = $meta;
                    $transaction->save();
                }

                continue;
            }

            if ($this->refundOutboundTransfer($user, $transaction, 'bridge_transfer_'.$mapped, $bridgeLookup['state'])) {
                $refunded++;
            }
        }

        return $refunded;
    }

    private function reverseLocalOnlyInboundCredits(User $user): int
    {
        $transactions = Transaction::query()
            ->where('user_id', $user->id)
            ->where('type', 'transfer_in')
            ->where('payment_method', 'bridge')
            ->where('status', 'completed')
            ->where($this->missingBridgeTransferIdConstraint())
            ->get();

        $reversed = 0;
        foreach ($transactions as $transaction) {
            if ($this->reverseInboundCredit($user, $transaction, 'local_only_transfer')) {
                $reversed++;
            }
        }

        return $reversed;
    }

    private function completeMissedInboundTransfers(User $user): int
    {
        $transactions = Transaction::query()
            ->where('user_id', $user->id)
            ->where('type', 'transfer_in')
            ->where('payment_method', 'bridge')
            ->where('status', 'pending')
            ->whereNotNull('meta')
            ->whereRaw("JSON_EXTRACT(meta, '$.bridge_transfer_id') IS NOT NULL")
            ->whereRaw("JSON_EXTRACT(meta, '$.bridge_transfer_id') != ''")
            ->get();

        $completed = 0;
        foreach ($transactions as $transaction) {
            $transferId = (string) ($transaction->meta['bridge_transfer_id'] ?? '');
            if ($transferId === '') {
                continue;
            }

            $bridgeLookup = $this->lookupBridgeTransfer($transferId);
            if ($bridgeLookup === null || $bridgeLookup['state'] === 'not_found') {
                if ($bridgeLookup !== null && $bridgeLookup['state'] === 'not_found') {
                    $this->voidInboundTransfer($transaction, 'bridge_transfer_not_found');
                }

                continue;
            }

            if ($this->mapBridgeTransferState($bridgeLookup['state']) !== 'completed') {
                continue;
            }

            if ($transaction->processed_at !== null) {
                continue;
            }

            DB::transaction(function () use ($user, $transaction, $bridgeLookup, &$completed): void {
                $amount = (float) $transaction->amount;
                $user->increment('balance', $amount);

                $transaction->status = 'completed';
                $transaction->processed_at = now();
                $meta = $transaction->meta ?? [];
                $meta['bridge_state'] = $bridgeLookup['state'];
                $meta['ledger_reconciled_at'] = now()->toIso8601String();
                $transaction->meta = $meta;
                $transaction->save();

                $completed++;
            });
        }

        return $completed;
    }

    private function syncUserBalanceFromBridge(User $user, float $bridgeBalance): bool
    {
        $local = round((float) $user->balance, 2);
        $bridge = round($bridgeBalance, 2);

        if (abs($local - $bridge) < 0.01) {
            return false;
        }

        $previous = $local;
        $user->update(['balance' => $bridge]);

        Log::info('Bridge custodial wallet balance synced to local ledger', [
            'user_id' => $user->id,
            'previous_balance' => $previous,
            'bridge_balance' => $bridge,
            'adjustment' => round($bridge - $previous, 2),
        ]);

        return true;
    }

    private function refundOutboundTransfer(
        User $user,
        Transaction $transaction,
        string $reason,
        ?string $bridgeState = null,
    ): bool {
        $meta = $transaction->meta ?? [];
        if (! empty($meta['ledger_reconciled_at'])) {
            return false;
        }

        $amount = (float) $transaction->amount;
        $fee = (float) ($transaction->fee ?? 0);

        DB::transaction(function () use ($user, $transaction, $amount, $fee, $reason, $bridgeState): void {
            $user->increment('balance', $amount + $fee);

            $transaction->status = $reason === 'bridge_transfer_cancelled' ? 'cancelled' : 'failed';
            $transaction->processed_at = now();
            $meta = $transaction->meta ?? [];
            $meta['ledger_reconciled_at'] = now()->toIso8601String();
            $meta['ledger_reconcile_reason'] = $reason;
            $meta['removed_from_active_ledger'] = true;
            if ($bridgeState !== null) {
                $meta['bridge_state'] = $bridgeState;
            }
            $transaction->meta = $meta;
            $transaction->save();

            $this->cancelPairedInboundTransfer($transaction, $reason, $bridgeState);
        });

        Log::info('Bridge ledger reconciliation refunded outbound transfer', [
            'user_id' => $user->id,
            'transaction_id' => $transaction->id,
            'amount' => $amount,
            'fee' => $fee,
            'reason' => $reason,
        ]);

        return true;
    }

    private function reverseInboundCredit(User $user, Transaction $transaction, string $reason): bool
    {
        $meta = $transaction->meta ?? [];
        if (! empty($meta['ledger_reconciled_at']) || $transaction->processed_at === null) {
            return false;
        }

        $amount = (float) $transaction->amount;

        DB::transaction(function () use ($user, $transaction, $amount, $reason): void {
            $user->decrement('balance', $amount);

            $transaction->status = 'failed';
            $meta = $transaction->meta ?? [];
            $meta['ledger_reconciled_at'] = now()->toIso8601String();
            $meta['ledger_reconcile_reason'] = $reason;
            $meta['removed_from_active_ledger'] = true;
            $transaction->meta = $meta;
            $transaction->save();
        });

        Log::info('Bridge ledger reconciliation reversed inbound credit', [
            'user_id' => $user->id,
            'transaction_id' => $transaction->id,
            'amount' => $amount,
            'reason' => $reason,
        ]);

        return true;
    }

    private function voidInboundTransfer(Transaction $transaction, string $reason): void
    {
        $meta = $transaction->meta ?? [];
        if (! empty($meta['ledger_reconciled_at'])) {
            return;
        }

        $transaction->status = 'failed';
        $meta['ledger_reconciled_at'] = now()->toIso8601String();
        $meta['ledger_reconcile_reason'] = $reason;
        $meta['removed_from_active_ledger'] = true;
        $transaction->meta = $meta;
        $transaction->save();
    }

    private function cancelPairedInboundTransfer(Transaction $outbound, string $reason, ?string $bridgeState): void
    {
        $transferId = $outbound->meta['bridge_transfer_id'] ?? null;
        $amount = (float) $outbound->amount;

        $inboundQuery = Transaction::query()
            ->where('type', 'transfer_in')
            ->where('payment_method', 'bridge')
            ->where('amount', $amount)
            ->whereIn('status', ['pending', 'completed']);

        if ($transferId) {
            $inboundQuery->whereJsonContains('meta->bridge_transfer_id', $transferId);
        } else {
            $createdAt = $outbound->created_at ?? now();
            $inboundQuery
                ->where($this->missingBridgeTransferIdConstraint())
                ->whereBetween('created_at', [
                    $createdAt->copy()->subMinutes(5),
                    $createdAt->copy()->addMinutes(5),
                ]);
        }

        $inbound = $inboundQuery->first();
        if ($inbound === null) {
            return;
        }

        if ($inbound->status === 'completed' && $inbound->processed_at !== null && $inbound->user) {
            $inbound->user->decrement('balance', $amount);
        }

        $inboundMeta = $inbound->meta ?? [];
        $inboundMeta['ledger_reconciled_at'] = now()->toIso8601String();
        $inboundMeta['ledger_reconcile_reason'] = 'paired_'.$reason;
        $inboundMeta['removed_from_active_ledger'] = true;
        if ($bridgeState !== null) {
            $inboundMeta['bridge_state'] = $bridgeState;
        }

        $inbound->status = 'failed';
        $inbound->meta = $inboundMeta;
        $inbound->save();
    }

    private function missingBridgeTransferIdConstraint(): \Closure
    {
        return function ($query): void {
            $query->whereNull('meta')
                ->orWhereRaw("JSON_EXTRACT(meta, '$.bridge_transfer_id') IS NULL")
                ->orWhereRaw("JSON_EXTRACT(meta, '$.bridge_transfer_id') = ''");
        };
    }

    /**
     * @return array{state: string}|null
     */
    private function lookupBridgeTransfer(string $transferId): ?array
    {
        $result = $this->bridgeService->getTransfer($transferId);
        if ($result['success'] ?? false) {
            $data = $result['data'] ?? [];

            return [
                'state' => (string) ($data['state'] ?? $data['status'] ?? 'pending'),
            ];
        }

        if (($result['status'] ?? null) === 404) {
            return ['state' => 'not_found'];
        }

        return null;
    }

    private function mapBridgeTransferState(?string $state): string
    {
        if ($state === null || trim($state) === '' || $state === 'not_found') {
            return $state === 'not_found' ? 'failed' : 'pending';
        }

        $state = strtolower(trim($state));

        return match ($state) {
            'payment_processed', 'completed' => 'completed',
            'failed', 'returned', 'refunded', 'error' => 'failed',
            'canceled', 'cancelled' => 'cancelled',
            default => 'pending',
        };
    }

    private function resolveWalletUser(BridgeIntegration $integration): ?User
    {
        if ($integration->integratable_type === User::class) {
            return User::find($integration->integratable_id);
        }

        if ($integration->integratable_type === Organization::class) {
            return Organization::find($integration->integratable_id)?->user;
        }

        return null;
    }
}
