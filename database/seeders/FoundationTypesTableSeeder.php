<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class FoundationTypesTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $data = [
            ['foundation_code' => 0, 'foundation_type' => 'Church 170(b)(1)(A)(i)', 'description' => 'A church or convention or association of churches.'],
            ['foundation_code' => 1, 'foundation_type' => 'School 170(b)(1)(A)(ii)', 'description' => 'An educational organization such as a school, college, or university.'],
            ['foundation_code' => 2, 'foundation_type' => 'Hospital or medical research organization 170(b)(1)(A)(iii)', 'description' => 'Hospital or medical institution recognized as a public charity.'],
            ['foundation_code' => 3, 'foundation_type' => 'Organization supporting government entity 170(b)(1)(A)(iv)', 'description' => 'Organization operated for the benefit of a government unit.'],
            ['foundation_code' => 4, 'foundation_type' => 'Organization receiving substantial support from public 170(b)(1)(A)(vi)', 'description' => 'A publicly supported organization (general public, governmental units, etc.).'],
            ['foundation_code' => 5, 'foundation_type' => 'Organization supporting a 501(c)(3) 509(a)(3)', 'description' => 'A supporting organization (Type I, II, or III) for another public charity.'],
            ['foundation_code' => 6, 'foundation_type' => 'Public safety testing organization 509(a)(4)', 'description' => 'Organization organized and operated exclusively for testing for public safety.'],
            ['foundation_code' => 7, 'foundation_type' => 'Private operating foundation 4942(j)(3)', 'description' => 'A private foundation that actively conducts charitable programs and meets minimum spending requirements.'],
            ['foundation_code' => 9, 'foundation_type' => 'Private non-operating foundation', 'description' => 'A typical grant-making foundation that does not directly operate charitable activities.'],
            ['foundation_code' => 10, 'foundation_type' => 'Exempt operating foundation', 'description' => 'A special type of private operating foundation with additional qualifications under IRC 4940(d)(2).'],
        ];

        foreach ($data as $item) {
            \App\Models\FoundationCode::updateOrCreate(
                [
                    'foundation_codes' => $item['foundation_code'],
                    'foundation_type' => $item['foundation_type'],
                    'description' => $item['description']
                ]
            );
        }
    }
}
