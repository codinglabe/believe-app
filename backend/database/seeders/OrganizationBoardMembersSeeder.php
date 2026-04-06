<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class OrganizationBoardMembersSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        // Get all organizations with their user_id
        $organizations = DB::table('organizations')
            ->whereNotNull('user_id')
            ->get();

        $count = 0;

        foreach ($organizations as $organization) {
            // Use updateOrInsert to avoid duplicates
            $result = DB::table('board_members')->updateOrInsert(
                [
                    'organization_id' => $organization->id,
                    'user_id' => $organization->user_id,
                ],
                [
                    'position' => 'Organization Administrator',
                    'is_active' => 1,
                    'appointed_on' => now(),
                    'term_ends_on' => now()->addYears(2),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            if ($result) {
                $count++;
            }
        }

        $this->command->info('Successfully processed ' . $count . ' board members.');
    }
}
