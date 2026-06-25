<?php

namespace App\Console\Commands;

use App\Models\BelievePointProcessingLot;
use App\Models\BelievePointPurchase;
use App\Services\BelievePointProcessingLotService;
use Illuminate\Console\Command;

class BackfillBelievePointProcessingLotsCommand extends Command
{
    protected $signature = 'believe-points:backfill-processing-lots';

    protected $description = 'Create processing lots for completed purchases that predate lot tracking';

    public function handle(): int
    {
        $created = 0;

        BelievePointPurchase::query()
            ->where('status', 'completed')
            ->where('points_released', false)
            ->orderBy('id')
            ->each(function (BelievePointPurchase $purchase) use (&$created) {
                $exists = BelievePointProcessingLot::query()
                    ->where('believe_point_purchase_id', $purchase->id)
                    ->whereNull('released_at')
                    ->exists();

                if ($exists) {
                    return;
                }

                $user = $purchase->user;
                if ($user === null) {
                    return;
                }

                $points = round((float) $purchase->points, 2);
                if ($points <= 0) {
                    return;
                }

                BelievePointProcessingLotService::createLotForPurchase($purchase, $user, $points);
                $created++;
            });

        $this->info("Created {$created} processing lot row(s).");

        return self::SUCCESS;
    }
}
