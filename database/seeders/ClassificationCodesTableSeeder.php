<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ClassificationCodesTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $data = [
            ['classification_code' => 1, 'description' => 'Religious'],
            ['classification_code' => 2, 'description' => 'Educational'],
            ['classification_code' => 3, 'description' => 'Charitable'],
            ['classification_code' => 4, 'description' => 'Scientific'],
            ['classification_code' => 5, 'description' => 'Literary'],
            ['classification_code' => 6, 'description' => 'Testing for public safety'],
            ['classification_code' => 7, 'description' => 'Fostering national or international amateur sports competition'],
            ['classification_code' => 8, 'description' => 'Preventing cruelty to children or animals'],
            ['classification_code' => 9, 'description' => 'Organization to support other 501(c)(3) organizations'],
            ['classification_code' => 10, 'description' => 'Fraternal beneficiary society, order or association'],
            ['classification_code' => 11, 'description' => 'Domestic fraternal societies and associations'],
            ['classification_code' => 12, 'description' => 'Cooperative hospital service organization'],
            ['classification_code' => 13, 'description' => 'Cooperative service organization of operating educational organizations'],
            ['classification_code' => 14, 'description' => 'Teacher’s retirement fund association'],
            ['classification_code' => 15, 'description' => 'Title-holding corporation'],
            ['classification_code' => 16, 'description' => 'Title-holding corporation for single parent organization'],
            ['classification_code' => 17, 'description' => 'Title-holding corporation for multiple parent organizations'],
            ['classification_code' => 18, 'description' => 'Supporting organization'],
            ['classification_code' => 19, 'description' => 'Public safety testing organization'],
            ['classification_code' => 20, 'description' => 'Credit counseling organization'],
            ['classification_code' => 21, 'description' => 'Child care organization'],
            ['classification_code' => 22, 'description' => 'Organization providing low-income housing'],
            ['classification_code' => 23, 'description' => 'Employment for people with disabilities or the disadvantaged'],
            ['classification_code' => 24, 'description' => 'Student aid organization'],
            ['classification_code' => 25, 'description' => 'Agricultural organization'],
            ['classification_code' => 26, 'description' => 'Labor organization'],
            ['classification_code' => 27, 'description' => 'Business league'],
            ['classification_code' => 28, 'description' => 'Civic league'],
            ['classification_code' => 29, 'description' => 'Social welfare organization'],
            ['classification_code' => 30, 'description' => 'Local association of employees'],
            ['classification_code' => 31, 'description' => 'Mutual insurance company or association'],
            ['classification_code' => 32, 'description' => 'Mutual cooperative telephone company'],
            ['classification_code' => 33, 'description' => 'Benevolent life insurance association'],
            ['classification_code' => 34, 'description' => 'Cemetery company'],
            ['classification_code' => 35, 'description' => 'State-chartered credit union'],
            ['classification_code' => 36, 'description' => 'Foreign insurance company'],
            ['classification_code' => 37, 'description' => 'Like-kind insurance company'],
            ['classification_code' => 38, 'description' => 'Political organization'],
        ];

        foreach ($data as $item) {
            \App\Models\ClassificationCode::updateOrCreate(
                [
                    'classification_code' => $item['classification_code'],
                    'description' => $item['description']
                ]
            );
        }
    }
}
