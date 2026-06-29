<?php

namespace Tests\Unit\Services;

use App\Models\BelievePointsLedgerEntry;
use App\Services\BelievePointsPurchaseSettingsService;
use Tests\TestCase;

class BelievePointsWalletLedgerServiceTest extends TestCase
{
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
}
