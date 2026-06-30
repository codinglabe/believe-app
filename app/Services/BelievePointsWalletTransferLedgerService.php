<?php

namespace App\Services;

use App\Models\BelievePointWalletTransfer;
use App\Services\Admin\UnifiedLedgerTransactionWriter;

class BelievePointsWalletTransferLedgerService
{
    /**
     * Admin ledger: BP redemption row + Bridge wallet money row per transfer.
     */
    public static function syncAdminLedgerRow(BelievePointWalletTransfer $transfer): void
    {
        UnifiedLedgerTransactionWriter::syncWalletTransferRows($transfer);
    }
}
