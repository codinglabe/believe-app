<?php

namespace Tests\Unit\Services\Admin;

use App\Models\Transaction;
use App\Services\Admin\UnifiedLedgerClassificationService;
use App\Support\UnifiedLedgerBpStatus;
use App\Support\UnifiedLedgerBrpActivity;
use App\Support\UnifiedLedgerOwner;
use App\Support\UnifiedLedgerType;
use Tests\TestCase;

class UnifiedLedgerClassificationServiceTest extends TestCase
{
    public function test_money_bp_purchase_row_classifies_as_money(): void
    {
        $transaction = new Transaction([
            'type' => 'purchase',
            'ledger_type' => UnifiedLedgerType::MONEY,
            'bp_status' => UnifiedLedgerBpStatus::NA,
            'brp_activity_type' => UnifiedLedgerBrpActivity::NA,
            'meta' => ['source' => 'believe_points_purchase'],
        ]);

        $classified = UnifiedLedgerClassificationService::classify($transaction);

        $this->assertSame(UnifiedLedgerType::MONEY, $classified['ledger_type']);
        $this->assertSame(UnifiedLedgerBpStatus::NA, $classified['bp_status']);
    }

    public function test_bp_credit_row_classifies_with_processing_status(): void
    {
        $transaction = new Transaction([
            'type' => 'purchase',
            'ledger_type' => UnifiedLedgerType::BP,
            'currency' => 'BP',
            'amount' => 5,
            'bp_status' => UnifiedLedgerBpStatus::PROCESSING,
            'current_owner' => UnifiedLedgerOwner::SUPPORTER,
            'meta' => ['source' => 'believe_points_purchase_bp', 'owner_type' => 'supporter'],
        ]);

        $present = UnifiedLedgerClassificationService::presentForTransaction($transaction);

        $this->assertSame('BP', $present['ledger_type_label']);
        $this->assertSame('Processing', $present['bp_status_label']);
        $this->assertSame('N/A', $present['brp_activity_label']);
        $this->assertSame('Supporter', $present['current_owner']);
    }

    public function test_bp_settlement_row_classifies_as_available(): void
    {
        $transaction = new Transaction([
            'type' => 'bp_settlement',
            'ledger_type' => UnifiedLedgerType::BP,
            'currency' => 'BP',
            'amount' => 5,
            'meta' => ['source' => 'bp_settlement'],
        ]);

        $classified = UnifiedLedgerClassificationService::classify($transaction);

        $this->assertSame(UnifiedLedgerBpStatus::AVAILABLE, $classified['bp_status']);
    }

    public function test_legacy_settled_bp_status_normalizes_to_available(): void
    {
        $transaction = new Transaction([
            'type' => 'bp_settlement',
            'ledger_type' => UnifiedLedgerType::BP,
            'bp_status' => 'settled',
            'meta' => ['source' => 'bp_settlement'],
        ]);

        $present = UnifiedLedgerClassificationService::presentForTransaction($transaction);

        $this->assertSame('Available', $present['bp_status_label']);
    }

    public function test_infers_brp_redeemed_from_debit_amount(): void
    {
        $transaction = new Transaction([
            'type' => 'redemption',
            'ledger_type' => UnifiedLedgerType::BRP,
            'currency' => 'BRP',
            'amount' => -5,
            'brp_activity_type' => UnifiedLedgerBrpActivity::REDEEMED,
            'meta' => ['source' => 'reward_point_ledger'],
        ]);

        $classified = UnifiedLedgerClassificationService::classify($transaction);

        $this->assertSame(UnifiedLedgerType::BRP, $classified['ledger_type']);
        $this->assertSame(UnifiedLedgerBrpActivity::REDEEMED, $classified['brp_activity_type']);
    }
}
