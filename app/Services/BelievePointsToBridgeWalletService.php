<?php

namespace App\Services;

use App\Models\BelievePointWalletTransfer;
use App\Models\BelievePointsLedgerEntry;
use App\Models\BridgeIntegration;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class BelievePointsToBridgeWalletService
{
    public function __construct(
        private readonly BridgeService $bridgeService,
        private readonly BelievePointsWalletTransferSettingsService $settings,
        private readonly BridgeWalletNotifier $bridgeWalletNotifier,
        private readonly BridgeWalletReadService $bridgeWalletReadService,
    ) {}

    /**
     * @return array{success: bool, message?: string, data?: array<string, mixed>, error_code?: string}
     */
    public function transfer(User $user, float $amount, ?string $idempotencyKey = null): array
    {
        $amount = round(max(0, (float) $amount), 2);

        if (! $this->settings->isEnabled()) {
            return [
                'success' => false,
                'message' => 'Moving Believe Points to your wallet is not available right now.',
                'error_code' => 'BP_WALLET_TRANSFER_DISABLED',
            ];
        }

        if ($this->bridgeService->isSandbox()) {
            return [
                'success' => false,
                'message' => 'Moving Believe Points to your Bridge wallet is only available in production.',
                'error_code' => 'SANDBOX_BP_WALLET_TRANSFER_UNAVAILABLE',
            ];
        }

        if ($amount < $this->settings->minAmount() || $amount > $this->settings->maxAmount()) {
            return [
                'success' => false,
                'message' => sprintf(
                    'Amount must be between $%s and $%s.',
                    number_format($this->settings->minAmount(), 2),
                    number_format($this->settings->maxAmount(), 2),
                ),
                'error_code' => 'INVALID_AMOUNT',
            ];
        }

        $integration = BridgeIntegration::resolveForAuthUser($user);
        if ($integration === null || empty($integration->bridge_customer_id)) {
            return [
                'success' => false,
                'message' => 'Connect and verify your Believe wallet before moving Believe Points.',
                'error_code' => 'BRIDGE_WALLET_REQUIRED',
            ];
        }

        $recipientWallet = $this->bridgeService->resolveCustomerBridgeWallet($integration);
        if ($recipientWallet === null) {
            return [
                'success' => false,
                'message' => 'Your Bridge wallet is not ready yet. Complete wallet setup first.',
                'error_code' => 'BRIDGE_WALLET_REQUIRED',
            ];
        }

        if ($recipientWallet['initiation_required'] ?? false) {
            return [
                'success' => false,
                'message' => 'Your Bridge wallet needs to be activated before you can receive funds.',
                'error_code' => 'BRIDGE_WALLET_INITIATION_REQUIRED',
            ];
        }

        $idempotencyKey = trim((string) ($idempotencyKey ?? ''));
        if ($idempotencyKey === '') {
            $idempotencyKey = (string) Str::uuid();
        }

        $existing = BelievePointWalletTransfer::query()
            ->where('idempotency_key', $idempotencyKey)
            ->first();

        if ($existing !== null) {
            return $this->responseFromTransferRecord($existing);
        }

        $prefundedCustomerId = $this->settings->prefundedCustomerId();
        $prefundedWalletId = $this->settings->prefundedWalletId();

        /** @var BelievePointWalletTransfer|null $transfer */
        $transfer = null;

        try {
            $transfer = DB::transaction(function () use ($user, $integration, $amount, $idempotencyKey) {
                $lockedUser = User::query()->lockForUpdate()->findOrFail($user->id);
                $availablePurchased = round((float) ($lockedUser->believe_points ?? 0), 2);

                if ($availablePurchased + 0.000001 < $amount) {
                    throw new \RuntimeException('INSUFFICIENT_BELIEVE_POINTS');
                }

                $lockedUser->decrement('believe_points', $amount);

                $record = BelievePointWalletTransfer::query()->create([
                    'user_id' => $lockedUser->id,
                    'bridge_integration_id' => $integration->id,
                    'amount' => $amount,
                    'status' => BelievePointWalletTransfer::STATUS_PENDING,
                    'idempotency_key' => $idempotencyKey,
                    'metadata' => [
                        'recipient_customer_id' => $integration->bridge_customer_id,
                        'recipient_wallet_id' => $integration->bridge_wallet_id
                            ?? $integration->primaryWallet?->bridge_wallet_id,
                    ],
                ]);

                BelievePointsLedgerEntry::query()->create([
                    'user_id' => $lockedUser->id,
                    'amount' => -$amount,
                    'entry_type' => BelievePointsLedgerEntry::TYPE_WALLET_TRANSFER,
                    'description' => 'Moved Believe Points to Believe wallet',
                    'metadata' => [
                        'believe_point_wallet_transfer_id' => $record->id,
                    ],
                ]);

                return $record;
            });
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'INSUFFICIENT_BELIEVE_POINTS') {
                return [
                    'success' => false,
                    'message' => 'Insufficient purchased Believe Points. Gifted points cannot be moved to your wallet.',
                    'error_code' => 'INSUFFICIENT_BELIEVE_POINTS',
                ];
            }

            throw $e;
        }

        $bridgeResult = $this->bridgeService->createPrefundedWalletTransfer(
            $prefundedCustomerId,
            $prefundedWalletId,
            (string) $integration->bridge_customer_id,
            $recipientWallet['wallet_id'],
            $amount,
            $idempotencyKey,
        );

        if (! ($bridgeResult['success'] ?? false)) {
            $this->refundFailedTransfer(
                $transfer,
                (string) ($bridgeResult['error'] ?? $bridgeResult['message'] ?? 'Bridge transfer failed'),
            );

            return [
                'success' => false,
                'message' => (string) ($bridgeResult['error'] ?? $bridgeResult['message'] ?? 'Failed to fund your wallet. Your Believe Points were restored.'),
                'error_code' => (string) ($bridgeResult['error_code'] ?? 'BRIDGE_TRANSFER_FAILED'),
            ];
        }

        $bridgeTransferId = (string) ($bridgeResult['data']['id'] ?? $bridgeResult['data']['transfer_id'] ?? '');
        $bridgeState = (string) ($bridgeResult['data']['state'] ?? $bridgeResult['data']['status'] ?? 'pending');

        $transfer->update([
            'status' => BelievePointWalletTransfer::STATUS_SUBMITTED,
            'bridge_transfer_id' => $bridgeTransferId !== '' ? $bridgeTransferId : null,
            'bridge_transfer_state' => $bridgeState,
            'metadata' => array_merge($transfer->metadata ?? [], [
                'bridge_response' => $bridgeResult['data'] ?? [],
            ]),
        ]);

        if ($bridgeTransferId !== '') {
            $this->bridgeWalletNotifier->notifyTransferWebhook(
                is_array($bridgeResult['data'] ?? null) ? $bridgeResult['data'] : ['id' => $bridgeTransferId, 'amount' => $amount],
                $bridgeState,
                'transfer.created',
            );
        }

        $snapshot = $this->bridgeWalletReadService->getWalletSnapshot($integration);

        return [
            'success' => true,
            'message' => 'Your wallet is being funded. Funds will appear when Bridge confirms the transfer.',
            'data' => [
                'transfer_id' => $transfer->id,
                'bridge_transfer_id' => $bridgeTransferId,
                'status' => $transfer->fresh()->status,
                'bridge_state' => $bridgeState,
                'amount' => $amount,
                'believe_points_balance' => round((float) $user->fresh()->believe_points, 2),
                'wallet_balance' => $snapshot['balance'] ?? null,
            ],
        ];
    }

    public function syncFromBridgeTransfer(string $bridgeTransferId, string $bridgeState): void
    {
        $transfer = BelievePointWalletTransfer::query()
            ->where('bridge_transfer_id', $bridgeTransferId)
            ->whereNotIn('status', [
                BelievePointWalletTransfer::STATUS_COMPLETED,
                BelievePointWalletTransfer::STATUS_REFUNDED,
            ])
            ->first();

        if ($transfer === null) {
            return;
        }

        $normalized = strtolower(trim($bridgeState));
        $transfer->bridge_transfer_state = $normalized;

        if (in_array($normalized, ['payment_processed', 'completed', 'settled'], true)) {
            $transfer->status = BelievePointWalletTransfer::STATUS_COMPLETED;
            $transfer->completed_at = $transfer->completed_at ?? now();
            $transfer->save();

            return;
        }

        if (in_array($normalized, ['failed', 'cancelled', 'canceled', 'returned', 'refunded'], true)) {
            $this->refundFailedTransfer($transfer, 'Bridge transfer '.$normalized);
        } else {
            $transfer->save();
        }
    }

    private function refundFailedTransfer(BelievePointWalletTransfer $transfer, string $reason): void
    {
        if ($transfer->status === BelievePointWalletTransfer::STATUS_REFUNDED) {
            return;
        }

        DB::transaction(function () use ($transfer, $reason) {
            $locked = BelievePointWalletTransfer::query()->lockForUpdate()->find($transfer->id);
            if ($locked === null || $locked->status === BelievePointWalletTransfer::STATUS_REFUNDED) {
                return;
            }

            $user = User::query()->lockForUpdate()->find($locked->user_id);
            if ($user !== null) {
                $user->increment('believe_points', (float) $locked->amount);

                BelievePointsLedgerEntry::query()->create([
                    'user_id' => $user->id,
                    'amount' => (float) $locked->amount,
                    'entry_type' => BelievePointsLedgerEntry::TYPE_WALLET_TRANSFER_REFUND,
                    'description' => 'Refund: Believe Points wallet transfer failed',
                    'metadata' => [
                        'believe_point_wallet_transfer_id' => $locked->id,
                        'reason' => $reason,
                    ],
                ]);
            }

            $locked->update([
                'status' => BelievePointWalletTransfer::STATUS_REFUNDED,
                'failure_message' => $reason,
            ]);
        });

        Log::warning('Believe Points wallet transfer refunded', [
            'transfer_id' => $transfer->id,
            'reason' => $reason,
        ]);
    }

    /**
     * @return array{success: bool, message?: string, data?: array<string, mixed>}
     */
    private function responseFromTransferRecord(BelievePointWalletTransfer $transfer): array
    {
        return [
            'success' => ! in_array($transfer->status, [
                BelievePointWalletTransfer::STATUS_FAILED,
                BelievePointWalletTransfer::STATUS_REFUNDED,
            ], true),
            'message' => match ($transfer->status) {
                BelievePointWalletTransfer::STATUS_COMPLETED => 'Transfer already completed.',
                BelievePointWalletTransfer::STATUS_SUBMITTED => 'Transfer already submitted.',
                BelievePointWalletTransfer::STATUS_REFUNDED => $transfer->failure_message ?? 'Transfer was refunded.',
                default => 'Transfer is being processed.',
            },
            'data' => [
                'transfer_id' => $transfer->id,
                'bridge_transfer_id' => $transfer->bridge_transfer_id,
                'status' => $transfer->status,
                'bridge_state' => $transfer->bridge_transfer_state,
                'amount' => (float) $transfer->amount,
            ],
        ];
    }
}
