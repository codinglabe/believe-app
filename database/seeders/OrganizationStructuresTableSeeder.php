<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class OrganizationStructuresTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {

        $data = [
            ['organization_code' => 1, 'organization_structure' => 'Corporation', 'description' => 'A legal entity incorporated under state law (most common structure for nonprofits).'],
            ['organization_code' => 2, 'organization_structure' => 'Trust', 'description' => 'A fiduciary arrangement where assets are held and managed for charitable purposes.'],
            ['organization_code' => 3, 'organization_structure' => 'Association', 'description' => 'An unincorporated group organized for a common nonprofit purpose.'],
        ];

        foreach ($data as $item) {
            \App\Models\OrganizationTypeCode::updateOrCreate(
                [
                    'organization_code' => $item['organization_code'],
                    'organization_structure' => $item['organization_structure'],
                    'description' => $item['description']
                ]
            );
        }
    }
}
