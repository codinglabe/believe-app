<?php

namespace App\Services;

use App\Models\BelievePointProcessingLot;
use App\Models\BelievePointPurchase;
use App\Models\User;
use App\Services\Admin\UnifiedLedgerTransactionWriter;

/**
 * Audit ledger rows when Processing BP converts to Available BP at settlement.
 */
final class BelievePointSettlementLedgerService
{
    public static function recordLotRelease(
        BelievePointPurchase $purchase,
        BelievePointProcessingLot $lot,
        User $owner,
        float $points,
    ): void {
        UnifiedLedgerTransactionWriter::syncBpSettlementRow($purchase, $lot, $owner, $points);
    }
}
