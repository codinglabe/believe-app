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
    private const LIQUIDITY_RETRY_HOURS = 24;

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
            return $this->responseFromTransferRecord($existing, $user);
        }

        if ($this->settings->resolvedPrefundedWallet() === null) {
            return [
                'success' => false,
                'message' => 'Moving Believe Points to your wallet is not available right now.',
                'error_code' => 'PREFUNDED_WALLET_NOT_CONFIGURED',
            ];
        }

        /** @var BelievePointWalletTransfer|null $transfer */
        $transfer = null;

        try {
            $transfer = DB::transaction(function () use ($user, $integration, $amount, $idempotencyKey, $recipientWallet) {
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
                        'recipient_wallet_id' => $recipientWallet['wallet_id'],
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

        return $this->submitBridgeTransfer($transfer, $user, $integration);
    }

    /**
     * @return array{processed: int, expired: int}
     */
    public function processDuePendingTransfers(): array
    {
        $processed = 0;

        BelievePointWalletTransfer::query()
            ->where('status', BelievePointWalletTransfer::STATUS_PENDING)
            ->whereNull('bridge_transfer_id')
            ->where(function ($query) {
                $query->whereNull('retry_until')
                    ->orWhere('retry_until', '>', now());
            })
            ->orderBy('created_at')
            ->chunkById(50, function ($transfers) use (&$processed) {
                foreach ($transfers as $transfer) {
                    $this->processPendingTransfer($transfer);
                    $processed++;
                }
            });

        $expired = 0;

        BelievePointWalletTransfer::query()
            ->where('status', BelievePointWalletTransfer::STATUS_PENDING)
            ->whereNull('bridge_transfer_id')
            ->whereNotNull('retry_until')
            ->where('retry_until', '<=', now())
            ->orderBy('id')
            ->chunkById(50, function ($transfers) use (&$expired) {
                foreach ($transfers as $transfer) {
                    $this->refundFailedTransfer(
                        $transfer,
                        'Transfer could not be completed within 24 hours.',
                    );
                    $expired++;
                }
            });

        return [
            'processed' => $processed,
            'expired' => $expired,
        ];
    }

    public function processPendingTransfer(BelievePointWalletTransfer $transfer): void
    {
        if ($transfer->status !== BelievePointWalletTransfer::STATUS_PENDING || $transfer->bridge_transfer_id) {
            return;
        }

        if ($transfer->retry_until !== null && now()->greaterThan($transfer->retry_until)) {
            $this->refundFailedTransfer(
                $transfer,
                'Transfer could not be completed within 24 hours.',
            );

            return;
        }

        $integration = $transfer->bridgeIntegration;
        $user = $transfer->user;

        if ($integration === null || $user === null) {
            return;
        }

        $this->submitBridgeTransfer($transfer, $user, $integration);
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

    /**
     * @return array{success: bool, message?: string, data?: array<string, mixed>, error_code?: string}
     */
    private function submitBridgeTransfer(
        BelievePointWalletTransfer $transfer,
        User $user,
        BridgeIntegration $integration,
    ): array {
        $recipientWallet = $this->bridgeService->resolveCustomerBridgeWallet($integration);
        if ($recipientWallet === null) {
            if ($transfer->retry_until === null) {
                return $this->queueTransferForLiquidity($transfer, $user);
            }

            return $this->pendingUserResponse($transfer, $user);
        }

        $prefundedAccountId = $this->settings->prefundedAccountId();

        $bridgeResult = $this->bridgeService->createPrefundedWalletTransfer(
            $this->settings->prefundedCustomerId(),
            $this->settings->prefundedWalletId(),
            (string) $integration->bridge_customer_id,
            $recipientWallet['wallet_id'],
            (float) $transfer->amount,
            $transfer->idempotency_key,
            $prefundedAccountId !== '' ? $prefundedAccountId : null,
        );

        if (! ($bridgeResult['success'] ?? false)) {
            $errorCode = (string) ($bridgeResult['error_code'] ?? '');

            if ($errorCode === 'INSUFFICIENT_PREFUNDED_BALANCE') {
                Log::info('Believe Points wallet transfer awaiting reserve liquidity', [
                    'transfer_id' => $transfer->id,
                    'amount' => $transfer->amount,
                ]);

                return $this->queueTransferForLiquidity($transfer, $user);
            }

            $this->refundFailedTransfer(
                $transfer,
                (string) ($bridgeResult['error'] ?? $bridgeResult['message'] ?? 'Bridge transfer failed'),
            );

            return [
                'success' => false,
                'message' => 'We could not complete your transfer right now. Your Believe Points were restored.',
                'error_code' => $errorCode !== '' ? $errorCode : 'BRIDGE_TRANSFER_FAILED',
            ];
        }

        $bridgeTransferId = (string) ($bridgeResult['data']['id'] ?? $bridgeResult['data']['transfer_id'] ?? '');
        $bridgeState = (string) ($bridgeResult['data']['state'] ?? $bridgeResult['data']['status'] ?? 'pending');

        $transfer->update([
            'status' => BelievePointWalletTransfer::STATUS_SUBMITTED,
            'bridge_transfer_id' => $bridgeTransferId !== '' ? $bridgeTransferId : null,
            'bridge_transfer_state' => $bridgeState,
            'retry_until' => null,
            'metadata' => array_merge($transfer->metadata ?? [], [
                'bridge_response' => $bridgeResult['data'] ?? [],
                'awaiting_liquidity' => false,
            ]),
        ]);

        if ($bridgeTransferId !== '') {
            $this->bridgeWalletNotifier->notifyTransferWebhook(
                is_array($bridgeResult['data'] ?? null) ? $bridgeResult['data'] : ['id' => $bridgeTransferId, 'amount' => $transfer->amount],
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
                'amount' => (float) $transfer->amount,
                'believe_points_balance' => round((float) $user->fresh()->believe_points, 2),
                'wallet_balance' => $snapshot['balance'] ?? null,
            ],
        ];
    }

    /**
     * @return array{success: bool, message?: string, data?: array<string, mixed>}
     */
    private function queueTransferForLiquidity(BelievePointWalletTransfer $transfer, User $user): array
    {
        $retryUntil = $transfer->retry_until ?? now()->addHours(self::LIQUIDITY_RETRY_HOURS);

        $transfer->update([
            'status' => BelievePointWalletTransfer::STATUS_PENDING,
            'retry_until' => $retryUntil,
            'metadata' => array_merge($transfer->metadata ?? [], [
                'awaiting_liquidity' => true,
                'queued_at' => $transfer->metadata['queued_at'] ?? now()->toIso8601String(),
            ]),
        ]);

        return $this->pendingUserResponse($transfer->fresh(), $user);
    }

    /**
     * @return array{success: bool, message?: string, data?: array<string, mixed>}
     */
    private function pendingUserResponse(BelievePointWalletTransfer $transfer, User $user): array
    {
        return [
            'success' => true,
            'message' => 'Your transfer is pending. Funds will be added to your wallet within 24 hours.',
            'data' => [
                'transfer_id' => $transfer->id,
                'status' => $transfer->status,
                'amount' => (float) $transfer->amount,
                'retry_until' => $transfer->retry_until?->toIso8601String(),
                'believe_points_balance' => round((float) $user->fresh()->believe_points, 2),
            ],
        ];
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
                'retry_until' => null,
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
    private function responseFromTransferRecord(BelievePointWalletTransfer $transfer, ?User $user = null): array
    {
        $user ??= $transfer->user;

        return [
            'success' => ! in_array($transfer->status, [
                BelievePointWalletTransfer::STATUS_FAILED,
                BelievePointWalletTransfer::STATUS_REFUNDED,
            ], true),
            'message' => match ($transfer->status) {
                BelievePointWalletTransfer::STATUS_COMPLETED => 'Transfer already completed.',
                BelievePointWalletTransfer::STATUS_SUBMITTED => 'Transfer already submitted.',
                BelievePointWalletTransfer::STATUS_PENDING => 'Your transfer is pending. Funds will be added to your wallet within 24 hours.',
                BelievePointWalletTransfer::STATUS_REFUNDED => 'Your transfer could not be completed. Your Believe Points were restored.',
                default => 'Transfer is being processed.',
            },
            'data' => [
                'transfer_id' => $transfer->id,
                'bridge_transfer_id' => $transfer->bridge_transfer_id,
                'status' => $transfer->status,
                'bridge_state' => $transfer->bridge_transfer_state,
                'amount' => (float) $transfer->amount,
                'retry_until' => $transfer->retry_until?->toIso8601String(),
                'believe_points_balance' => $user ? round((float) $user->fresh()->believe_points, 2) : null,
            ],
        ];
    }
}
