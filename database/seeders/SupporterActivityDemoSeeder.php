<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\SupporterActivity;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Inserts sample rows into supporter_activity for local/staging QA.
 * Run: php artisan db:seed --class=SupporterActivityDemoSeeder
 */
class SupporterActivityDemoSeeder extends Seeder
{
    public function run(): void
    {
        $org = Organization::query()->orderBy('id')->first();
        if (!$org) {
            $this->command->warn('No organizations found. Create an organization first.');

            return;
        }

        $supporters = User::query()
            ->where('id', '!=', $org->user_id)
            ->orderBy('id')
            ->limit(5)
            ->get();

        if ($supporters->isEmpty()) {
            $this->command->warn('No users found to use as supporters.');

            return;
        }

        $now = now();
        $baseRef = 9_000_000;

        $rows = [];
        $u = $supporters->values();

        // Spread events across supporters and last ~30 days (amount_cents / believe_points for UI demos)
        $defs = [
            [$u[0] ?? null, SupporterActivity::EVENT_DONATION_COMPLETED, 0, 25_00, null],
            [$u[0] ?? null, SupporterActivity::EVENT_PURCHASE_COMPLETED, 1, 18_50, null],
            [$u[1] ?? $u[0], SupporterActivity::EVENT_COURSES_COMPLETED, 2, null, null],
            [$u[1] ?? $u[0], SupporterActivity::EVENT_EVENTS_COMPLETED, 3, null, null],
            [$u[2] ?? $u[0], SupporterActivity::EVENT_VOLUNTEER_SIGNUP, 4, null, null],
            [$u[0] ?? null, SupporterActivity::EVENT_DONATION_COMPLETED, 5, 10_00, 10],
        ];

        foreach ($defs as $i => [$user, $eventType, $refOffset, $amountCents, $believePoints]) {
            if (!$user) {
                continue;
            }
            $rows[] = [
                'supporter_id' => $user->id,
                'organization_id' => $org->id,
                'event_type' => $eventType,
                'reference_id' => $baseRef + $refOffset,
                'amount_cents' => $amountCents,
                'believe_points' => $believePoints,
                'created_at' => $now->copy()->subDays(30 - $i * 5),
            ];
        }

        foreach ($rows as $row) {
            SupporterActivity::query()->updateOrInsert(
                [
                    'event_type' => $row['event_type'],
                    'reference_id' => $row['reference_id'],
                ],
                $row
            );
        }

        $this->command->info(sprintf(
            'Supporter activity demo data for organization #%d (%s). Open /supporter-activity as that org or admin.',
            $org->id,
            $org->name
        ));
    }
}
