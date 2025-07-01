<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class NteeCodesTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $data = [
            ['ntee_codes' => 'A20', 'category' => 'Arts & Culture', 'description' => 'Arts Education'],
            ['ntee_codes' => 'A50', 'category' => 'Arts & Culture', 'description' => 'Museums'],
            ['ntee_codes' => 'B20', 'category' => 'Education', 'description' => 'Elementary & Secondary Schools'],
            ['ntee_codes' => 'B30', 'category' => 'Education', 'description' => 'Colleges & Universities'],
            ['ntee_codes' => 'B60', 'category' => 'Education', 'description' => 'Adult and Continuing Education'],
            ['ntee_codes' => 'C20', 'category' => 'Environment', 'description' => 'Natural Resources Conservation & Protection'],
            ['ntee_codes' => 'D20', 'category' => 'Animal Related', 'description' => 'Animal Protection & Welfare'],
            ['ntee_codes' => 'E20', 'category' => 'Health', 'description' => 'Hospitals'],
            ['ntee_codes' => 'E70', 'category' => 'Health', 'description' => 'Public Health'],
            ['ntee_codes' => 'F20', 'category' => 'Mental Health & Crisis', 'description' => 'Substance Abuse Dependency, Prevention & Treatment'],
            ['ntee_codes' => 'G20', 'category' => 'Diseases & Disorders', 'description' => 'Birth Defects & Genetic Diseases'],
            ['ntee_codes' => 'H20', 'category' => 'Medical Research', 'description' => 'Health - General & Rehabilitative Research'],
            ['ntee_codes' => 'I83', 'category' => 'Crime & Legal Related', 'description' => 'Prison Alternatives'],
            ['ntee_codes' => 'J30', 'category' => 'Employment', 'description' => 'Vocational Rehabilitation'],
            ['ntee_codes' => 'K30', 'category' => 'Food, Agriculture & Nutrition', 'description' => 'Food Distribution'],
            ['ntee_codes' => 'L20', 'category' => 'Housing & Shelter', 'description' => 'Housing Development, Construction & Management'],
            ['ntee_codes' => 'M40', 'category' => 'Public Safety', 'description' => 'Fire Prevention & Control'],
            ['ntee_codes' => 'N30', 'category' => 'Recreation & Sports', 'description' => 'Sports Training Facilities'],
            ['ntee_codes' => 'O50', 'category' => 'Youth Development', 'description' => 'Youth Centers & Clubs'],
            ['ntee_codes' => 'P20', 'category' => 'Human Services', 'description' => 'Human Service Organizations'],
            ['ntee_codes' => 'Q20', 'category' => 'International', 'description' => 'International Development'],
            ['ntee_codes' => 'R20', 'category' => 'Civil Rights, Social Action', 'description' => 'Minority Rights'],
            ['ntee_codes' => 'S20', 'category' => 'Community Improvement', 'description' => 'Community & Neighborhood Development'],
            ['ntee_codes' => 'T20', 'category' => 'Philanthropy, Voluntarism', 'description' => 'Private Grantmaking Foundations'],
            ['ntee_codes' => 'U20', 'category' => 'Science & Technology', 'description' => 'General Science'],
            ['ntee_codes' => 'V20', 'category' => 'Social Science', 'description' => 'Economics'],
            ['ntee_codes' => 'W30', 'category' => "Public & Societal Benefit", 'description' => "Military & Veterans' Organizations"],
            ['ntee_codes' => 'X20', 'category' => 'Religion', 'description' => 'Christian'],
            ['ntee_codes' => 'Y20', 'category' => 'Mutual/Membership Benefit', 'description' => 'Mutual & Fraternal Benefit Organizations'],
            ['ntee_codes' => 'Z99', 'category' => 'Unknown/Unclassified', 'description' => 'Unknown or unclassified nonprofit purpose'],
        ];

        foreach ($data as $item) {
            \App\Models\NteeCode::updateOrCreate(
                [
                    'ntee_codes' => $item['ntee_codes'],
                    'category' => $item['category'],
                    'description' => $item['description']
                ]
            );
        }
    }
}
