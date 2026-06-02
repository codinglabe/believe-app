<?php

namespace App\Console\Commands;

use App\Models\GiftCard;
use App\Services\GiftCardRevenueShareService;
use Illuminate\Console\Command;

class RecalculateGiftCardRevenueShareCommand extends Command
{
    protected $signature = 'gift-cards:recalculate-revenue-share {--dry-run : Show changes without saving}';

    protected $description = 'Recalculate gift card commission splits (BIU % of provider commission) from stored Phaze data';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $updated = 0;

        GiftCard::query()
            ->whereNotNull('purchased_at')
            ->orderBy('id')
            ->chunkById(100, function ($cards) use ($dryRun, &$updated) {
                foreach ($cards as $card) {
                    $meta = is_array($card->meta) ? $card->meta : [];
                    $phaze = $meta['phaze_purchase']
                        ?? $meta['phaze_webhook']
                        ?? $meta['phaze_initial_response']
                        ?? null;

                    if (! is_array($phaze) && $card->total_commission === null) {
                        continue;
                    }

                    $split = GiftCardRevenueShareService::calculateFromPhazeResponse(
                        is_array($phaze) ? $phaze : [],
                        (float) $card->amount
                    );

                    if ($card->total_commission !== null && (! is_array($phaze) || $phaze === [])) {
                        $split = GiftCardRevenueShareService::splitProviderCommission(
                            (float) $card->total_commission,
                            $card->commission_percentage !== null ? (float) $card->commission_percentage : null
                        );
                    }

                    $patch = [
                        'commission_percentage' => $split['commission_percentage'],
                        'total_commission' => $split['total_commission'],
                        'platform_commission' => $split['platform_commission'],
                        'nonprofit_commission' => $split['nonprofit_commission'],
                        'merchant_revenue' => $split['merchant_revenue'],
                    ];

                    if ($dryRun) {
                        $this->line("Gift card #{$card->id}: ".json_encode($patch));

                        continue;
                    }

                    $card->update($patch);
                    $updated++;
                }
            });

        $this->info($dryRun
            ? 'Dry run complete (no rows saved).'
            : "Updated {$updated} gift card(s).");

        return self::SUCCESS;
    }
}
