<?php

namespace App\Observers;

use App\Models\RewardPointLedger;
use App\Services\Admin\UnifiedLedgerTransactionWriter;

class RewardPointLedgerObserver
{
    public function created(RewardPointLedger $entry): void
    {
        UnifiedLedgerTransactionWriter::syncFromRewardPointLedger($entry);
    }
}
