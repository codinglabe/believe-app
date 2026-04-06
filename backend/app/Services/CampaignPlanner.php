<?php

namespace App\Services;

use App\Models\Campaign;
use App\Models\ContentItem;
use Carbon\Carbon;

class CampaignPlanner
{
    public static function planDailyCampaign(Campaign $campaign, $contentItems)
    {
        $startDate = Carbon::parse($campaign->start_date);
        $endDate = Carbon::parse($campaign->end_date);

        $scheduledDrops = [];
        $dayIndex = 0;

        // Loop through each day in the campaign period
        for ($date = $startDate->copy(); $date->lte($endDate); $date->addDay()) {
            // Calculate publish time in UTC
            $publishUtc = self::calculatePublishTime($date, $campaign->send_time_local, $campaign->organization->timezone);

            // Get content item for this day (cycle through available items)
            if ($contentItems instanceof \Illuminate\Database\Eloquent\Collection) {
                // If it's an Eloquent collection
                $contentItem = $contentItems[$dayIndex % $contentItems->count()];
                $contentItemId = $contentItem->id;
            } else {
                // If it's an array (fallback)
                $contentItem = $contentItems[$dayIndex % count($contentItems)];
                $contentItemId = $contentItem['id'];
            }

            $scheduledDrops[] = [
                'campaign_id' => $campaign->id,
                'content_item_id' => $contentItemId,
                'publish_at_utc' => $publishUtc,
                'status' => 'pending',
                'created_at' => now(),
                'updated_at' => now(),
            ];

            $dayIndex++;
        }

        // Bulk insert all scheduled drops
        \App\Models\ScheduledDrop::insert($scheduledDrops);

        return count($scheduledDrops);
    }

    private static function calculatePublishTime(Carbon $date, string $sendTimeLocal, string $timezone = null)
    {
        $timezone = $timezone ?? config('app.timezone');

        // Parse the local time and convert to UTC
        $localDateTime = Carbon::createFromFormat('Y-m-d H:i', $date->format('Y-m-d') . ' ' . $sendTimeLocal, $timezone);

        return $localDateTime->utc();
    }
}
