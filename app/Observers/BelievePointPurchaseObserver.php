<?php

namespace App\Observers;

use App\Models\BelievePointPurchase;
use App\Services\BelievePointPurchaseSettlementService;

class BelievePointPurchaseObserver
{
    public function saved(BelievePointPurchase $purchase): void
    {
        BelievePointPurchaseSettlementService::syncAdminLedgerPurchaseRow($purchase);
    }
}
