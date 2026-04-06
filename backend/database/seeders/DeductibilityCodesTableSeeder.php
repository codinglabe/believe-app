<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DeductibilityCodesTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $data = [
            ['deductibility_code' => 1, 'description' => 'Contributions are deductible – for most 501(c)(3) public charities and private foundations.'],
            ['deductibility_code' => 2, 'description' => 'Contributions are not deductible – typically for 501(c) organizations that are not 501(c)(3) (e.g., 501(c)(4), 501(c)(6)).'],
            ['deductibility_code' => 4, 'description' => 'Contributions are deductible by treaty – for certain foreign organizations recognized under tax treaties.'],
            ['deductibility_code' => 5, 'description' => 'Contributions are not deductible – for organizations whose tax-exempt status has been revoked.'],
        ];

        foreach ($data as $item) {
            \App\Models\DeductibilityCode::updateOrCreate(
                [
                    'deductibility_code' => $item['deductibility_code'],
                    'description' => $item['description']
                ]
            );
        }
    }
}
