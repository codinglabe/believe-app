<?php

namespace Tests\Unit\Services;

use App\Models\BelievePointPurchase;
use App\Models\BelievePointWalletTransfer;
use App\Models\BelievePointsLedgerEntry;
use App\Models\Transaction;
use App\Models\User;
use App\Services\Admin\UnifiedLedgerTransactionWriter;
use App\Services\BelievePointsPurchaseSettingsService;
use App\Services\BelievePointsWalletLedgerService;
use App\Support\UnifiedLedgerType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BelievePointsWalletLedgerServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_ledger_entry_types_include_wallet_transaction_kinds(): void
    {
        $this->assertSame('purchase', BelievePointsLedgerEntry::TYPE_PURCHASE);
        $this->assertSame('settlement', BelievePointsLedgerEntry::TYPE_SETTLEMENT);
        $this->assertSame('gift_sent', BelievePointsLedgerEntry::TYPE_GIFT_SENT);
        $this->assertSame('gift_received', BelievePointsLedgerEntry::TYPE_GIFT_RECEIVED);
        $this->assertSame('refund', BelievePointsLedgerEntry::TYPE_REFUND);
        $this->assertSame('wallet_transfer', BelievePointsLedgerEntry::TYPE_WALLET_TRANSFER);
    }

    public function test_payer_covers_transaction_fee_enables_both_fee_toggles(): void
    {
        $this->assertTrue(BelievePointsPurchaseSettingsService::DEFAULT_PAYER_COVERS_TRANSACTION_FEE);
    }

    public function test_record_purchase_processing_is_idempotent(): void
    {
        $user = User::factory()->create();
        $purchase = BelievePointPurchase::query()->create([
            'user_id' => $user->id,
            'amount' => 10,
            'points' => 10,
            'status' => 'completed',
            'payment_rail' => 'card',
        ]);

        BelievePointsWalletLedgerService::recordPurchaseProcessing($purchase);
        BelievePointsWalletLedgerService::recordPurchaseProcessing($purchase);

        $this->assertSame(1, BelievePointsLedgerEntry::query()
            ->where('entry_type', BelievePointsLedgerEntry::TYPE_PURCHASE)
            ->where('metadata->believe_point_purchase_id', $purchase->id)
            ->count());
    }

    public function test_record_wallet_transfer_and_refund_are_idempotent(): void
    {
        $user = User::factory()->create();
        $transfer = BelievePointWalletTransfer::query()->create([
            'user_id' => $user->id,
            'amount' => 25,
            'status' => BelievePointWalletTransfer::STATUS_REFUNDED,
        ]);

        BelievePointsWalletLedgerService::recordWalletTransfer($transfer);
        BelievePointsWalletLedgerService::recordWalletTransfer($transfer);
        BelievePointsWalletLedgerService::recordWalletTransferRefund($transfer, 'failed');
        BelievePointsWalletLedgerService::recordWalletTransferRefund($transfer, 'failed');

        $this->assertSame(1, BelievePointsLedgerEntry::query()
            ->where('entry_type', BelievePointsLedgerEntry::TYPE_WALLET_TRANSFER)
            ->where('metadata->believe_point_wallet_transfer_id', $transfer->id)
            ->count());
        $this->assertSame(1, BelievePointsLedgerEntry::query()
            ->where('entry_type', BelievePointsLedgerEntry::TYPE_WALLET_TRANSFER_REFUND)
            ->where('metadata->believe_point_wallet_transfer_id', $transfer->id)
            ->count());
    }

    public function test_sync_brp_purchase_row_prunes_legacy_duplicate_brp_rows(): void
    {
        $user = User::factory()->create();
        $purchase = BelievePointPurchase::query()->create([
            'user_id' => $user->id,
            'amount' => 10,
            'points' => 10,
            'status' => 'completed',
            'reward_points_awarded' => 2,
            'points_released' => false,
            'payment_rail' => 'card',
        ]);

        Transaction::query()->create([
            'user_id' => $user->id,
            'related_id' => $purchase->id,
            'type' => 'reward',
            'ledger_type' => UnifiedLedgerType::BRP,
            'transaction_id' => 'brp:ledger:999',
            'status' => 'completed',
            'amount' => 2,
            'currency' => 'BRP',
        ]);

        UnifiedLedgerTransactionWriter::syncBrpPurchaseRewardRow($purchase);

        $this->assertSame(1, Transaction::query()
            ->where('ledger_type', UnifiedLedgerType::BRP)
            ->where('related_id', $purchase->id)
            ->count());
        $this->assertNotNull(Transaction::query()
            ->where('transaction_id', 'brp:earned:purchase:'.$purchase->id)
            ->first());
    }
}
