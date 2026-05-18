<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class GroupCodesTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $data = [
            ['group_code' => 0, 'description' => 'No group exemption; the organization is not part of a group ruling.'],
            ['group_code' => 73, 'description' => 'Knights of Columbus'],
            ['group_code' => 175, 'description' => 'National Association for the Advancement of Colored People (NAACP)'],
            ['group_code' => 190, 'description' => 'Catholic Church (U.S. Conference of Catholic Bishops)'],
            ['group_code' => 249, 'description' => 'Veterans of Foreign Wars (VFW)'],
            ['group_code' => 307, 'description' => 'Benevolent and Protective Order of Elks'],
            ['group_code' => 329, 'description' => 'American Legion'],
            ['group_code' => 375, 'description' => 'General Grand Chapter of the Order of the Eastern Star'],
            ['group_code' => 398, 'description' => 'Boy Scouts of America'],
            ['group_code' => 570, 'description' => 'Rotary International'],
            ['group_code' => 571, 'description' => 'Lions Clubs International'],
            ['group_code' => 595, 'description' => 'Kiwanis International'],
            ['group_code' => 925, 'description' => 'Church of God in Christ (COGIC)'],
            ['group_code' => 1155, 'description' => 'Lutheran Church - Missouri Synod'],
            ['group_code' => 1236, 'description' => 'United Methodist Church'],
            ['group_code' => 1254, 'description' => 'The Episcopal Church'],
            ['group_code' => 1304, 'description' => 'Seventh-day Adventist Church'],
            ['group_code' => 1595, 'description' => 'Southern Baptist Convention'],
        ];

        foreach ($data as $item) {
            \App\Models\GroupCode::updateOrCreate(
                [
                    'group_code' => $item['group_code'],
                    'description' => $item['description']
                ],
            );
        }

        $this->command->info('Group codes seeded successfully!');
    }
}
