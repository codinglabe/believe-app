<?php

namespace App\Services;

use App\Models\CareAllianceCampaign;
use App\Models\CareAllianceCampaignSplit;
use InvalidArgumentException;

class CareAllianceSplitService
{
    /**
     * Build frozen split snapshot in cents for a donation amount.
     *
     * @return list<array{type: 'organization'|'alliance', organization_id: int|null, label: string, cents: int, percent_bps: int}>
     */
    public function snapshotForAmount(CareAllianceCampaign $campaign, int $amountCents): array
    {
        if ($amountCents < 1) {
            throw new InvalidArgumentException('Amount must be at least 1 cent.');
        }

        $campaign->loadMissing(['splits', 'careAlliance']);

        $splits = $campaign->splits;
        $totalBps = $splits->sum('percent_bps');
        if ($totalBps !== 10000) {
            throw new InvalidArgumentException('Campaign splits must total 100%.');
        }

        $lines = [];
        $allocated = 0;
        $n = $splits->count();
        foreach ($splits->values() as $i => $split) {
            /** @var CareAllianceCampaignSplit $split */
            $isLast = $i === $n - 1;
            $cents = $isLast
                ? ($amountCents - $allocated)
                : (int) floor($amountCents * $split->percent_bps / 10000);
            $allocated += $cents;

            if ($split->is_alliance_fee) {
                $lines[] = [
                    'type' => 'alliance',
                    'organization_id' => null,
                    'label' => $campaign->careAlliance?->name ?? 'Alliance',
                    'cents' => $cents,
                    'percent_bps' => $split->percent_bps,
                ];
            } else {
                $org = $split->organization;
                $lines[] = [
                    'type' => 'organization',
                    'organization_id' => $split->organization_id,
                    'label' => $org?->name ?? ('Organization #'.$split->organization_id),
                    'cents' => $cents,
                    'percent_bps' => $split->percent_bps,
                ];
            }
        }

        return $lines;
    }
}
