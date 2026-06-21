<?php

namespace App\Services;

use App\Enums\GiftCardStatus;
use App\Exceptions\GiftCardRedemptionCapacityReachedException;
use App\Jobs\FulfillGiftCardRedemptionJob;
use App\Mail\GiftCardPurchaseReceipt;
use App\Models\GiftCard;
use App\Models\Transaction;
use App\Models\User;
use App\Notifications\GiftCardRedemptionReadyNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class GiftCardRedemptionService
{
    public function __construct(
        private readonly PhazeBalanceService $phazeBalanceService,
        private readonly GiftCardService $giftCardService,
    ) {}

    public function fulfillmentDelayHours(): int
    {
        return max(1, (int) config('services.gift_cards.fulfillment_delay_hours', 72));
    }

    /**
     * Submit a Believe Points gift card redemption for delayed fulfillment.
     *
     * @param  array<string, mixed>  $validated
     * @param  array<string, mixed>|null  $selectedBrand
     *
     * @throws GiftCardRedemptionCapacityReachedException
     */
    public function submit(
        User $user,
        array $validated,
        ?array $selectedBrand,
        float $purchaseAmount,
        string $currency,
    ): GiftCard {
        $this->assertPhazeCapacity($purchaseAmount);

        $pointsRequired = round($purchaseAmount, 2);
        $orderId = Str::uuid()->toString();
        $delayHours = $this->fulfillmentDelayHours();
        $requestedAt = now();
        $scheduledAt = $requestedAt->copy()->addHours($delayHours);

        $finalBrandName = $selectedBrand['productName'] ?? $validated['brand_name'];
        if (empty($finalBrandName)) {
            $finalBrandName = 'Gift Card #'.($validated['productId'] ?? 'Unknown');
        }

        $giftCard = DB::transaction(function () use (
            $user,
            $validated,
            $selectedBrand,
            $purchaseAmount,
            $currency,
            $pointsRequired,
            $orderId,
            $requestedAt,
            $scheduledAt,
            $finalBrandName,
        ) {
            $lockedUser = User::query()->lockForUpdate()->findOrFail($user->id);

            if (! $lockedUser->deductAvailableBelievePointsForGiftCard($pointsRequired)) {
                throw new \RuntimeException('Insufficient Available Believe Points.');
            }

            $brandMeta = $selectedBrand ? [
                'productId' => $selectedBrand['productId'] ?? null,
                'productImage' => $selectedBrand['productImage'] ?? null,
                'denominations' => $selectedBrand['denominations'] ?? [],
                'valueRestrictions' => $selectedBrand['valueRestrictions'] ?? [],
                'productDescription' => $selectedBrand['productDescription'] ?? null,
                'termsAndConditions' => $selectedBrand['termsAndConditions'] ?? null,
                'howToUse' => $selectedBrand['howToUse'] ?? null,
                'expiryAndValidity' => $selectedBrand['expiryAndValidity'] ?? null,
                'discount' => $selectedBrand['discount'] ?? 0,
            ] : [];

            $giftCard = GiftCard::create([
                'user_id' => $lockedUser->id,
                'organization_id' => $validated['organization_id'],
                'card_number' => GiftCard::generateUniqueCardNumber(),
                'amount' => $purchaseAmount,
                'brand' => $finalBrandName,
                'brand_name' => $finalBrandName,
                'country' => $validated['country'] ?? null,
                'currency' => $currency,
                'status' => GiftCardStatus::PendingFulfillment->value,
                'payment_method' => 'believe_points',
                'purchased_at' => $requestedAt,
                'requested_at' => $requestedAt,
                'scheduled_fulfillment_at' => $scheduledAt,
                'expires_at' => $requestedAt->copy()->addYear(),
                'meta' => array_merge($brandMeta, [
                    'orderId' => $orderId,
                    'productId' => (int) $validated['productId'],
                    'believe_points_used' => $pointsRequired,
                    'believe_points_from_gifted' => 0.0,
                    'believe_points_from_purchased' => $pointsRequired,
                    'allowed_for_gifted_points' => false,
                    'redemption_submitted_at' => $requestedAt->toIso8601String(),
                    'scheduled_fulfillment_at' => $scheduledAt->toIso8601String(),
                    'fulfillment_audit' => [[
                        'event' => 'submitted',
                        'at' => $requestedAt->toIso8601String(),
                        'amount' => $purchaseAmount,
                        'order_id' => $orderId,
                    ]],
                ]),
            ]);

            Transaction::record([
                'user_id' => $lockedUser->id,
                'related_id' => $giftCard->id,
                'related_type' => GiftCard::class,
                'type' => 'purchase',
                'status' => Transaction::STATUS_PENDING,
                'amount' => $purchaseAmount,
                'fee' => 0,
                'currency' => $currency,
                'payment_method' => 'believe_points',
                'transaction_id' => 'believe_points_gift_card_pending_'.$giftCard->id,
                'meta' => [
                    'gift_card_id' => $giftCard->id,
                    'believe_points_used' => $pointsRequired,
                    'believe_points_from_gifted' => 0.0,
                    'believe_points_from_purchased' => $pointsRequired,
                    'phaze_order_id' => $orderId,
                    'brand' => $validated['brand_name'],
                    'fulfillment_status' => GiftCardStatus::PendingFulfillment->value,
                ],
            ]);

            $this->appendAudit($giftCard, 'bp_deducted', [
                'amount' => $pointsRequired,
                'from_purchased' => $pointsRequired,
            ]);

            return $giftCard;
        });

        Log::info('Gift card BP redemption submitted for delayed fulfillment', [
            'gift_card_id' => $giftCard->id,
            'user_id' => $user->id,
            'amount' => $purchaseAmount,
            'scheduled_fulfillment_at' => $giftCard->scheduled_fulfillment_at?->toIso8601String(),
            'order_id' => $orderId,
        ]);

        return $giftCard->fresh(['user', 'organization']);
    }

    public function scheduleFulfillmentJob(GiftCard $giftCard): void
    {
        if ($giftCard->scheduled_fulfillment_at) {
            FulfillGiftCardRedemptionJob::dispatch($giftCard->id)
                ->delay($giftCard->scheduled_fulfillment_at);
        }
    }

    /**
     * Fulfill a pending gift card redemption via Phaze.
     */
    public function fulfill(int $giftCardId, bool $adminRetry = false): void
    {
        DB::transaction(function () use ($giftCardId, $adminRetry) {
            /** @var GiftCard|null $giftCard */
            $giftCard = GiftCard::query()->lockForUpdate()->find($giftCardId);

            if (! $giftCard) {
                return;
            }

            if ($giftCard->payment_method !== 'believe_points') {
                return;
            }

            if (GiftCardStatus::isFulfilled($giftCard->status)) {
                return;
            }

            if ($this->hasCompletedPhazeFulfillment($giftCard)) {
                $this->markCompletedFromExistingPhazeData($giftCard);

                return;
            }

            $allowedStatuses = [
                GiftCardStatus::PendingFulfillment->value,
                GiftCardStatus::Failed->value,
                GiftCardStatus::CapacityReached->value,
            ];

            if ($adminRetry && GiftCardStatus::isRetryEligible($giftCard->status)) {
                // Admin retry is allowed.
            } elseif (! in_array($giftCard->status, $allowedStatuses, true)) {
                return;
            }

            if (
                ! $adminRetry
                && $giftCard->status === GiftCardStatus::PendingFulfillment->value
                && $giftCard->scheduled_fulfillment_at
                && $giftCard->scheduled_fulfillment_at->isFuture()
            ) {
                return;
            }

            if (
                $giftCard->status === GiftCardStatus::Processing->value
                && $giftCard->fulfillment_locked_at
                && $giftCard->fulfillment_locked_at->gt(now()->subMinutes(30))
            ) {
                return;
            }

            $giftCard->update([
                'status' => GiftCardStatus::Processing->value,
                'fulfillment_locked_at' => now(),
                'last_fulfillment_attempt_at' => now(),
                'fulfillment_attempt_count' => (int) $giftCard->fulfillment_attempt_count + 1,
            ]);

            $this->appendAudit($giftCard, 'fulfillment_started', [
                'attempt' => (int) $giftCard->fresh()->fulfillment_attempt_count,
                'admin_retry' => $adminRetry,
            ]);

            $purchaseAmount = (float) $giftCard->amount;

            if (! $this->phazeBalanceService->canAfford($purchaseAmount)) {
                $wallet = $this->phazeBalanceService->getWallet();
                $available = round((float) $wallet->available_balance, 2);
                $reason = "Insufficient internal Phaze prefund balance at fulfillment. Required {$purchaseAmount}, available {$available}.";

                $giftCard->update([
                    'status' => GiftCardStatus::CapacityReached->value,
                    'failure_reason' => $reason,
                    'fulfillment_locked_at' => null,
                ]);

                $this->appendAudit($giftCard, 'capacity_reached', [
                    'required' => $purchaseAmount,
                    'available' => $available,
                ]);

                Log::warning('Gift card fulfillment blocked — Phaze capacity reached', [
                    'gift_card_id' => $giftCard->id,
                    'required' => $purchaseAmount,
                    'available' => $available,
                ]);

                return;
            }

            $meta = $giftCard->meta ?? [];
            $orderId = $meta['orderId'] ?? null;
            $productId = (int) ($meta['productId'] ?? 0);

            if (! $orderId || $productId <= 0) {
                $giftCard->update([
                    'status' => GiftCardStatus::Failed->value,
                    'failure_reason' => 'Missing product or order metadata for Phaze fulfillment.',
                    'fulfillment_locked_at' => null,
                ]);

                return;
            }

            $phazePurchaseData = [
                'productId' => $productId,
                'amount' => $purchaseAmount,
                'currency' => $giftCard->currency ?? 'USD',
                'orderId' => $orderId,
                'externalUserId' => (string) $giftCard->user_id,
            ];

            $phazePurchaseResult = $this->giftCardService->purchaseGiftCard($phazePurchaseData);

            if (! $phazePurchaseResult || ! $this->giftCardService->isPurchaseSuccessful($phazePurchaseResult)) {
                $phazeError = is_array($phazePurchaseResult)
                    ? ($phazePurchaseResult['error'] ?? json_encode($phazePurchaseResult))
                    : 'No response from Phaze purchase API';

                $giftCard->update([
                    'status' => GiftCardStatus::Failed->value,
                    'failure_reason' => (string) $phazeError,
                    'fulfillment_locked_at' => null,
                    'meta' => array_merge($meta, [
                        'phaze_fulfillment_failure' => [
                            'at' => now()->toIso8601String(),
                            'error' => $phazeError,
                            'response' => $phazePurchaseResult,
                        ],
                    ]),
                ]);

                $this->appendAudit($giftCard, 'phaze_api_failed', [
                    'error' => $phazeError,
                ]);

                Log::error('Gift card Phaze fulfillment failed', [
                    'gift_card_id' => $giftCard->id,
                    'error' => $phazeError,
                    'response' => $phazePurchaseResult,
                ]);

                return;
            }

            $this->applySuccessfulPhazeFulfillment($giftCard, $phazePurchaseResult, $orderId);
        });
    }

    public function queueAdminRetry(GiftCard $giftCard, User $admin): GiftCard
    {
        if (! GiftCardStatus::isRetryEligible($giftCard->status)) {
            throw new \InvalidArgumentException('Only failed or capacity reached redemptions can be retried.');
        }

        if ($giftCard->payment_method !== 'believe_points') {
            throw new \InvalidArgumentException('Only Believe Points redemptions support delayed fulfillment retry.');
        }

        $giftCard->update([
            'status' => GiftCardStatus::PendingFulfillment->value,
            'scheduled_fulfillment_at' => now(),
            'fulfillment_locked_at' => null,
            'failure_reason' => null,
        ]);

        $this->appendAudit($giftCard, 'admin_retry_queued', [
            'admin_id' => $admin->id,
            'admin_email' => $admin->email,
        ]);

        FulfillGiftCardRedemptionJob::dispatch($giftCard->id, adminRetry: true);

        return $giftCard->fresh(['user', 'organization']);
    }

    /**
     * @throws GiftCardRedemptionCapacityReachedException
     */
    private function assertPhazeCapacity(float $amount): void
    {
        if ($this->phazeBalanceService->canAfford($amount)) {
            return;
        }

        $wallet = $this->phazeBalanceService->getWallet();
        $available = round((float) $wallet->available_balance, 2);

        throw new GiftCardRedemptionCapacityReachedException(
            required: round($amount, 2),
            available: $available,
        );
    }

    private function hasCompletedPhazeFulfillment(GiftCard $giftCard): bool
    {
        $meta = $giftCard->meta ?? [];

        return ! empty($giftCard->external_id)
            && (! empty($meta['phaze_purchase']) || ! empty($meta['phaze_fulfillment_completed']));
    }

    private function markCompletedFromExistingPhazeData(GiftCard $giftCard): void
    {
        if (GiftCardStatus::isFulfilled($giftCard->status)) {
            return;
        }

        $giftCard->update([
            'status' => GiftCardStatus::Completed->value,
            'fulfilled_at' => $giftCard->fulfilled_at ?? now(),
            'fulfillment_locked_at' => null,
        ]);

        $this->finalizeTransaction($giftCard);
        $this->sendFulfillmentNotifications($giftCard->fresh(['user', 'organization']));
    }

    /**
     * @param  array<string, mixed>  $phazePurchaseResult
     */
    private function applySuccessfulPhazeFulfillment(GiftCard $giftCard, array $phazePurchaseResult, string $orderId): void
    {
        $purchaseAmount = (float) $giftCard->amount;
        $revenueSplit = GiftCardRevenueShareService::calculateFromPhazeResponse($phazePurchaseResult, $purchaseAmount);

        $existingMeta = $giftCard->meta ?? [];
        $updateData = [
            'external_id' => $phazePurchaseResult['id'] ?? $giftCard->external_id,
            'voucher' => $phazePurchaseResult['voucher'] ?? $giftCard->voucher,
            'phaze_disbursement_id' => $phazePurchaseResult['id'] ?? null,
            'status' => GiftCardStatus::Completed->value,
            'fulfilled_at' => now(),
            'fulfillment_locked_at' => null,
            'failure_reason' => null,
            'commission_percentage' => $revenueSplit['commission_percentage'],
            'total_commission' => $revenueSplit['total_commission'],
            'platform_commission' => $revenueSplit['platform_commission'],
            'nonprofit_commission' => $revenueSplit['nonprofit_commission'],
            'merchant_revenue' => $revenueSplit['merchant_revenue'],
            'meta' => array_merge($existingMeta, [
                'phaze_purchase' => $phazePurchaseResult,
                'phaze_purchase_id' => $phazePurchaseResult['id'] ?? null,
                'phaze_status' => $phazePurchaseResult['status'] ?? 'pending',
                'phaze_initial_response' => $phazePurchaseResult,
                'phaze_fulfillment_completed' => [
                    'at' => now()->toIso8601String(),
                    'provider_transaction_id' => $phazePurchaseResult['id'] ?? null,
                    'order_id' => $orderId,
                ],
                'commission_calculation' => $revenueSplit['commission_calculation'],
            ]),
        ];

        if (! empty($phazePurchaseResult['cardNumber'])) {
            $updateData['card_number'] = $phazePurchaseResult['cardNumber'];
        } elseif (! empty($phazePurchaseResult['card_number'])) {
            $updateData['card_number'] = $phazePurchaseResult['card_number'];
        }

        $giftCard->update($updateData);

        try {
            $this->phazeBalanceService->deductForPurchase($purchaseAmount, $giftCard, $orderId);
        } catch (\Throwable $e) {
            Log::critical('Phaze purchase succeeded but internal balance deduction failed during delayed fulfillment', [
                'gift_card_id' => $giftCard->id,
                'order_id' => $orderId,
                'message' => $e->getMessage(),
            ]);
        }

        $this->appendAudit($giftCard, 'phaze_api_succeeded', [
            'provider_transaction_id' => $phazePurchaseResult['id'] ?? null,
        ]);

        $this->finalizeTransaction($giftCard->fresh());
        $this->sendFulfillmentNotifications($giftCard->fresh(['user', 'organization']));
    }

    private function finalizeTransaction(GiftCard $giftCard): void
    {
        $transaction = Transaction::query()
            ->where('related_id', $giftCard->id)
            ->where('related_type', GiftCard::class)
            ->first();

        if (! $transaction) {
            return;
        }

        $ledgerSlice = GiftCardRevenueShareService::ledgerMetaSlice(
            (float) $giftCard->amount,
            $giftCard->total_commission !== null ? (float) $giftCard->total_commission : null,
            $giftCard->platform_commission !== null ? (float) $giftCard->platform_commission : null,
            $giftCard->nonprofit_commission !== null ? (float) $giftCard->nonprofit_commission : null,
            (float) ($giftCard->merchant_revenue ?? 0),
        );

        $meta = $giftCard->meta ?? [];

        $transaction->update([
            'status' => Transaction::STATUS_COMPLETED,
            'transaction_id' => 'believe_points_gift_card_'.$giftCard->id,
            'processed_at' => now(),
            'meta' => array_merge($transaction->meta ?? [], $ledgerSlice, [
                'phaze_purchase_id' => $giftCard->external_id,
                'phaze_status' => $meta['phaze_status'] ?? null,
                'fulfillment_status' => GiftCardStatus::Completed->value,
                'fulfilled_at' => $giftCard->fulfilled_at?->toIso8601String(),
            ]),
        ]);
    }

    private function sendFulfillmentNotifications(GiftCard $giftCard): void
    {
        $user = $giftCard->user;
        if (! $user) {
            return;
        }

        try {
            $user->notify(new GiftCardRedemptionReadyNotification($giftCard));
        } catch (\Throwable $e) {
            Log::error('Failed to send gift card ready in-app notification', [
                'gift_card_id' => $giftCard->id,
                'message' => $e->getMessage(),
            ]);
        }

        if ($user->email && $giftCard->status !== GiftCardStatus::Failed->value) {
            try {
                Mail::to($user->email)->send(new GiftCardPurchaseReceipt($giftCard, null, readyNotification: true));
                $giftCard->update(['is_sent' => true]);
            } catch (\Throwable $e) {
                Log::error('Failed to send gift card ready email', [
                    'gift_card_id' => $giftCard->id,
                    'message' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private function appendAudit(GiftCard $giftCard, string $event, array $context = []): void
    {
        $giftCard->refresh();
        $meta = $giftCard->meta ?? [];
        $audit = $meta['fulfillment_audit'] ?? [];
        $audit[] = array_merge([
            'event' => $event,
            'at' => now()->toIso8601String(),
        ], $context);

        $giftCard->update([
            'meta' => array_merge($meta, ['fulfillment_audit' => $audit]),
        ]);
    }
}
