<?php

namespace App\Services;

use App\Exceptions\InsufficientPhazeBalanceException;
use App\Models\GiftCard;
use App\Models\PhazeBalanceLedgerEntry;
use App\Models\PhazeBalanceWallet;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PhazeBalanceService
{
    public function __construct(
        private readonly GiftCardService $giftCardService,
    ) {}

    public function getWallet(): PhazeBalanceWallet
    {
        return PhazeBalanceWallet::firstOrCreate(
            ['slug' => PhazeBalanceWallet::DEFAULT_SLUG],
            [
                'available_balance' => 0,
                'total_funded' => 0,
                'total_consumed' => 0,
                'currency' => 'USD',
            ]
        );
    }

    /**
     * @return array{
     *     available_balance: float,
     *     total_funded: float,
     *     total_consumed: float,
     *     remaining_balance: float,
     *     currency: string,
     *     phaze_live: array<string, mixed>
     * }
     */
    public function getSummary(bool $fetchLivePhazeBalance = true): array
    {
        $wallet = $this->getWallet();
        $available = round((float) $wallet->available_balance, 2);

        return [
            'available_balance' => $available,
            'total_funded' => round((float) $wallet->total_funded, 2),
            'total_consumed' => round((float) $wallet->total_consumed, 2),
            'remaining_balance' => $available,
            'currency' => $wallet->currency,
            'phaze_live' => $fetchLivePhazeBalance
                ? $this->giftCardService->getLivePrefundedBalance($available)
                : [
                    'available' => null,
                    'currency' => $wallet->currency,
                    'fetched_at' => null,
                    'error' => 'Live balance not fetched',
                ],
        ];
    }

    public function canAfford(float $amount): bool
    {
        $wallet = $this->getWallet();

        return round((float) $wallet->available_balance, 2) >= round($amount, 2);
    }

    public function assertCanAfford(float $amount): void
    {
        $wallet = $this->getWallet();
        $available = round((float) $wallet->available_balance, 2);
        $required = round($amount, 2);

        if ($available < $required) {
            throw new InsufficientPhazeBalanceException($required, $available);
        }
    }

    public function topUp(float $amount, string $notes, User $admin): PhazeBalanceLedgerEntry
    {
        $amount = round($amount, 2);

        if ($amount <= 0) {
            throw new \InvalidArgumentException('Top-up amount must be greater than zero.');
        }

        return DB::transaction(function () use ($amount, $notes, $admin) {
            $wallet = PhazeBalanceWallet::lockForUpdate()
                ->where('slug', PhazeBalanceWallet::DEFAULT_SLUG)
                ->firstOrFail();

            $balanceBefore = round((float) $wallet->available_balance, 2);
            $balanceAfter = round($balanceBefore + $amount, 2);

            $wallet->update([
                'available_balance' => $balanceAfter,
                'total_funded' => round((float) $wallet->total_funded + $amount, 2),
            ]);

            $entry = PhazeBalanceLedgerEntry::create([
                'phaze_balance_wallet_id' => $wallet->id,
                'type' => PhazeBalanceLedgerEntry::TYPE_TOP_UP,
                'amount' => $amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'notes' => $notes,
                'created_by' => $admin->id,
                'metadata' => [
                    'admin_name' => $admin->name,
                    'admin_email' => $admin->email,
                ],
            ]);

            Log::info('Phaze balance top-up recorded', [
                'ledger_entry_id' => $entry->id,
                'amount' => $amount,
                'balance_after' => $balanceAfter,
                'admin_id' => $admin->id,
            ]);

            return $entry;
        });
    }

    public function deductForPurchase(float $amount, GiftCard $giftCard, ?string $orderId = null): PhazeBalanceLedgerEntry
    {
        $amount = round($amount, 2);

        if ($amount <= 0) {
            throw new \InvalidArgumentException('Purchase deduction amount must be greater than zero.');
        }

        $existing = PhazeBalanceLedgerEntry::query()
            ->where('type', PhazeBalanceLedgerEntry::TYPE_PURCHASE_DEDUCTION)
            ->where('reference_type', GiftCard::class)
            ->where('reference_id', $giftCard->id)
            ->first();

        if ($existing) {
            return $existing;
        }

        try {
            return DB::transaction(function () use ($amount, $giftCard, $orderId) {
                $wallet = PhazeBalanceWallet::lockForUpdate()
                    ->where('slug', PhazeBalanceWallet::DEFAULT_SLUG)
                    ->firstOrFail();

                $balanceBefore = round((float) $wallet->available_balance, 2);

                if ($balanceBefore < $amount) {
                    throw new InsufficientPhazeBalanceException($amount, $balanceBefore);
                }

                $balanceAfter = round($balanceBefore - $amount, 2);

                $wallet->update([
                    'available_balance' => $balanceAfter,
                    'total_consumed' => round((float) $wallet->total_consumed + $amount, 2),
                ]);

                $entry = PhazeBalanceLedgerEntry::create([
                    'phaze_balance_wallet_id' => $wallet->id,
                    'type' => PhazeBalanceLedgerEntry::TYPE_PURCHASE_DEDUCTION,
                    'amount' => $amount,
                    'balance_before' => $balanceBefore,
                    'balance_after' => $balanceAfter,
                    'reference_type' => GiftCard::class,
                    'reference_id' => $giftCard->id,
                    'reference_label' => $orderId,
                    'notes' => sprintf(
                        'Gift card purchase #%d (%s)',
                        $giftCard->id,
                        $giftCard->brand_name ?? $giftCard->brand ?? 'Gift card'
                    ),
                    'metadata' => [
                        'gift_card_id' => $giftCard->id,
                        'order_id' => $orderId,
                        'brand_name' => $giftCard->brand_name ?? $giftCard->brand,
                        'payment_method' => $giftCard->payment_method,
                    ],
                ]);

                Log::info('Phaze balance purchase deduction recorded', [
                    'ledger_entry_id' => $entry->id,
                    'gift_card_id' => $giftCard->id,
                    'amount' => $amount,
                    'balance_after' => $balanceAfter,
                ]);

                return $entry;
            });
        } catch (QueryException $e) {
            if ($this->isDuplicateLedgerReference($e)) {
                return PhazeBalanceLedgerEntry::query()
                    ->where('type', PhazeBalanceLedgerEntry::TYPE_PURCHASE_DEDUCTION)
                    ->where('reference_type', GiftCard::class)
                    ->where('reference_id', $giftCard->id)
                    ->firstOrFail();
            }

            throw $e;
        }
    }

    public function manualAdjust(float $amount, string $notes, User $admin, string $direction = 'credit'): PhazeBalanceLedgerEntry
    {
        $amount = round(abs($amount), 2);

        if ($amount <= 0) {
            throw new \InvalidArgumentException('Adjustment amount must be greater than zero.');
        }

        if (! in_array($direction, ['credit', 'debit'], true)) {
            throw new \InvalidArgumentException('Adjustment direction must be credit or debit.');
        }

        return DB::transaction(function () use ($amount, $notes, $admin, $direction) {
            $wallet = PhazeBalanceWallet::lockForUpdate()
                ->where('slug', PhazeBalanceWallet::DEFAULT_SLUG)
                ->firstOrFail();

            $balanceBefore = round((float) $wallet->available_balance, 2);
            $balanceAfter = $direction === 'credit'
                ? round($balanceBefore + $amount, 2)
                : round($balanceBefore - $amount, 2);

            if ($balanceAfter < 0) {
                throw new InsufficientPhazeBalanceException($amount, $balanceBefore, 'Manual adjustment would result in a negative balance.');
            }

            $updates = ['available_balance' => $balanceAfter];

            if ($direction === 'credit') {
                $updates['total_funded'] = round((float) $wallet->total_funded + $amount, 2);
            } else {
                $updates['total_consumed'] = round((float) $wallet->total_consumed + $amount, 2);
            }

            $wallet->update($updates);

            $entry = PhazeBalanceLedgerEntry::create([
                'phaze_balance_wallet_id' => $wallet->id,
                'type' => PhazeBalanceLedgerEntry::TYPE_MANUAL_ADJUSTMENT,
                'amount' => $amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'notes' => $notes,
                'created_by' => $admin->id,
                'metadata' => [
                    'direction' => $direction,
                    'admin_name' => $admin->name,
                    'admin_email' => $admin->email,
                ],
            ]);

            Log::info('Phaze balance manual adjustment recorded', [
                'ledger_entry_id' => $entry->id,
                'direction' => $direction,
                'amount' => $amount,
                'balance_after' => $balanceAfter,
                'admin_id' => $admin->id,
            ]);

            return $entry;
        });
    }

    public function getLedgerEntries(int $perPage = 25, ?string $type = null): LengthAwarePaginator
    {
        return PhazeBalanceLedgerEntry::query()
            ->with(['creator:id,name,email'])
            ->when($type, fn ($query) => $query->where('type', $type))
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->withQueryString();
    }

    private function isDuplicateLedgerReference(QueryException $e): bool
    {
        $message = strtolower($e->getMessage());

        return str_contains($message, 'phaze_balance_ledger_purchase_unique')
            || str_contains($message, 'duplicate')
            || $e->getCode() === '23000';
    }
}
