<?php

namespace App\Observers;

use App\Models\BelievePointWalletTransfer;
use App\Services\BelievePointsWalletTransferLedgerService;

class BelievePointWalletTransferObserver
{
    public function saved(BelievePointWalletTransfer $transfer): void
    {
        BelievePointsWalletTransferLedgerService::syncAdminLedgerRow($transfer);
    }
}
