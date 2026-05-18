<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class AffiliationCodesTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $data = [
            ['affiliation_code' => 1, 'description' => 'Central – The central organization (i.e., the parent or umbrella group)'],
            ['affiliation_code' => 2, 'description' => 'Intermediate – A group that is both a parent and a subordinate'],
            ['affiliation_code' => 3, 'description' => 'Subordinate – An organization under the control of a central organization'],
            ['affiliation_code' => 6, 'description' => 'Independent – Not affiliated with any group ruling or parent organization'],
        ];

        foreach ($data as $item) {
            \App\Models\AffiliationCode::updateOrCreate(
                [
                    'affiliation_codes' => $item['affiliation_code'],
                    'description' => $item['description']
                ]
            );
        }
    }
}
