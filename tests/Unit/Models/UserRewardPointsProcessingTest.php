<?php

namespace Tests\Unit\Models;

use App\Models\BelievePointPurchase;
use App\Models\Transaction;
use App\Models\User;
use App\Services\Admin\UnifiedLedgerTransactionWriter;
use App\Support\UnifiedLedgerBpStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserRewardPointsProcessingTest extends TestCase
{
    use RefreshDatabase;

    public function test_purchase_linked_brp_counts_as_processing_until_bp_settles(): void
    {
        $user = User::factory()->create(['reward_points' => 0]);

        BelievePointPurchase::query()->create([
            'user_id' => $user->id,
            'amount' => 10,
            'points' => 10,
            'status' => 'completed',
            'reward_points_awarded' => 2,
            'points_released' => false,
            'payment_rail' => 'card',
        ]);

        $user->addRewardPoints(2, 'believe_points_card_purchase', 1);

        $this->assertSame(2.0, $user->fresh()->processingRewardPointsBalance());
        $this->assertSame(0.0, $user->fresh()->availableRewardPointsBalance());
        $this->assertFalse($user->fresh()->deductRewardPoints(1, 'merchant_reward_redemption', 99));
    }

    public function test_admin_ledger_marks_purchase_brp_as_processing_until_release(): void
    {
        $user = User::factory()->create(['reward_points' => 0]);

        $purchase = BelievePointPurchase::query()->create([
            'user_id' => $user->id,
            'amount' => 10,
            'points' => 10,
            'status' => 'completed',
            'reward_points_awarded' => 2,
            'points_released' => false,
            'payment_rail' => 'card',
        ]);

        UnifiedLedgerTransactionWriter::syncBrpPurchaseRewardRow($purchase);

        $tx = Transaction::query()->where('transaction_id', 'brp:earned:purchase:'.$purchase->id)->first();
        $this->assertNotNull($tx);
        $this->assertSame(UnifiedLedgerBpStatus::PROCESSING, $tx->bp_status);
        $this->assertSame(Transaction::STATUS_PENDING, $tx->status);

        $purchase->update(['points_released' => true, 'points_available_at' => now()]);
        UnifiedLedgerTransactionWriter::syncBrpPurchaseRewardRow($purchase->fresh());

        $tx->refresh();
        $this->assertSame(
            UnifiedLedgerBpStatus::AVAILABLE,
            $tx->bp_status,
        );
        $this->assertSame(Transaction::STATUS_COMPLETED, $tx->status);
        $this->assertSame('BRP Participation Reward', $tx->meta['event_name'] ?? null);
    }
}
