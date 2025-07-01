<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ActivityCodesTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $data = [
            ['activity_code' => 1, 'description' => 'Church, synagogue, etc.'],
            ['activity_code' => 2, 'description' => 'Association or convention of churches'],
            ['activity_code' => 3, 'description' => 'Religious order'],
            ['activity_code' => 4, 'description' => 'Religious publishing activities'],
            ['activity_code' => 5, 'description' => 'Religious radio or television broadcasting'],
            ['activity_code' => 6, 'description' => 'Missionary activities'],
            ['activity_code' => 7, 'description' => 'Evangelism'],
            ['activity_code' => 31, 'description' => 'Special school for the blind, deaf, etc.'],
            ['activity_code' => 33, 'description' => 'Junior college or technical institute'],
            ['activity_code' => 34, 'description' => 'College, university'],
            ['activity_code' => 37, 'description' => 'Scholarship awards or student loans'],
            ['activity_code' => 40, 'description' => 'Nursing or convalescent facility'],
            ['activity_code' => 41, 'description' => 'Hospital'],
            ['activity_code' => 42, 'description' => 'Health clinic or health center'],
            ['activity_code' => 50, 'description' => 'Fair, county or agricultural'],
            ['activity_code' => 51, 'description' => 'Cultural performances (theater, concerts, etc.)'],
            ['activity_code' => 59, 'description' => 'Museum, zoo, planetarium'],
            ['activity_code' => 60, 'description' => 'Library'],
            ['activity_code' => 70, 'description' => 'Housing for the aged or elderly'],
            ['activity_code' => 71, 'description' => 'Low-income housing'],
            ['activity_code' => 72, 'description' => 'Job training, counseling, or assistance'],
            ['activity_code' => 81, 'description' => 'Boy Scouts, Girl Scouts, etc.'],
            ['activity_code' => 83, 'description' => 'Sports training or competition'],
            ['activity_code' => 88, 'description' => 'Community center'],
            ['activity_code' => 91, 'description' => 'Food distribution'],
            ['activity_code' => 92, 'description' => 'Disaster relief'],
            ['activity_code' => 100, 'description' => 'Research institute (non-medical)'],
            ['activity_code' => 103, 'description' => 'Crime prevention'],
            ['activity_code' => 123, 'description' => 'Fundraising organization supporting multiple causes'],
            ['activity_code' => 170, 'description' => 'Advocacy or civil rights organization'],
            ['activity_code' => 200, 'description' => 'Government instrumentality (public agency)'],
            ['activity_code' => 210, 'description' => 'Professional association'],
            ['activity_code' => 250, 'description' => 'Labor union or labor organization'],
            ['activity_code' => 251, 'description' => 'Business or trade association'],
            ['activity_code' => 280, 'description' => 'Fraternal beneficiary society'],
            ['activity_code' => 300, 'description' => 'Credit union or other financial institution'],
            ['activity_code' => 350, 'description' => 'Mutual insurance company'],
            ['activity_code' => 400, 'description' => 'Cemetery company'],
            ['activity_code' => 500, 'description' => 'Title holding corporation'],
        ];

        foreach ($data as $item) {
            \App\Models\ActivityCode::updateOrCreate(
                [
                    'activity_codes' => $item['activity_code'],
                    'description' => $item['description']
                ]
            );
        }
    }
}
