<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class SubsectionCodesTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $data = [
            ['subsection_code' => 1, 'irs_code' => '501(c)(1)', 'description' => 'Corporations organized under Act of Congress (e.g., Federal Credit Unions)'],
            ['subsection_code' => 2, 'irs_code' => '501(c)(2)', 'description' => 'Title-holding corporations for exempt organizations'],
            ['subsection_code' => 3, 'irs_code' => '501(c)(3)', 'description' => 'Religious, educational, charitable, scientific, or literary organizations; public charities'],
            ['subsection_code' => 4, 'irs_code' => '501(c)(4)', 'description' => 'Social welfare organizations; civic leagues; local employee associations'],
            ['subsection_code' => 5, 'irs_code' => '501(c)(5)', 'description' => 'Labor, agricultural, and horticultural organizations'],
            ['subsection_code' => 6, 'irs_code' => '501(c)(6)', 'description' => 'Business leagues, chambers of commerce, real estate boards'],
            ['subsection_code' => 7, 'irs_code' => '501(c)(7)', 'description' => 'Social and recreational clubs'],
            ['subsection_code' => 8, 'irs_code' => '501(c)(8)', 'description' => 'Fraternal beneficiary societies and associations (e.g., Knights of Columbus)'],
            ['subsection_code' => 9, 'irs_code' => '501(c)(9)', 'description' => 'Voluntary employee beneficiary associations'],
            ['subsection_code' => 10, 'irs_code' => '501(c)(10)', 'description' => 'Domestic fraternal societies and associations (not providing life insurance)'],
            ['subsection_code' => 11, 'irs_code' => '501(c)(11)', 'description' => 'Teachers’ retirement fund associations'],
            ['subsection_code' => 12, 'irs_code' => '501(c)(12)', 'description' => 'Benevolent life insurance associations, mutual ditch or irrigation companies'],
            ['subsection_code' => 13, 'irs_code' => '501(c)(13)', 'description' => 'Cemetery companies'],
            ['subsection_code' => 14, 'irs_code' => '501(c)(14)', 'description' => 'State-chartered credit unions, mutual reserve funds'],
            ['subsection_code' => 15, 'irs_code' => '501(c)(15)', 'description' => 'Mutual insurance companies or associations'],
            ['subsection_code' => 16, 'irs_code' => '501(c)(16)', 'description' => 'Cooperative organizations to finance crop operations'],
            ['subsection_code' => 17, 'irs_code' => '501(c)(17)', 'description' => 'Supplemental unemployment benefit trusts'],
            ['subsection_code' => 18, 'irs_code' => '501(c)(18)', 'description' => 'Employee funded pension trusts (pre-1959 legislation)'],
            ['subsection_code' => 19, 'irs_code' => '501(c)(19)', 'description' => 'Veterans’ organizations'],
            ['subsection_code' => 20, 'irs_code' => '501(c)(20)', 'description' => 'Group legal services organizations (now obsolete)'],
            ['subsection_code' => 21, 'irs_code' => '501(c)(21)', 'description' => 'Black Lung benefit trusts'],
            ['subsection_code' => 22, 'irs_code' => '501(c)(22)', 'description' => 'Multiemployer pension plan associations'],
            ['subsection_code' => 23, 'irs_code' => '501(c)(23)', 'description' => 'Veterans’ organizations (established before 1880)'],
            ['subsection_code' => 24, 'irs_code' => '501(c)(24)', 'description' => 'Section 4049 ERISA trusts'],
            ['subsection_code' => 25, 'irs_code' => '501(c)(25)', 'description' => 'Title holding corporations or trusts with multiple parent organizations'],
            ['subsection_code' => 26, 'irs_code' => '501(c)(26)', 'description' => 'State-sponsored high-risk health insurance organizations'],
            ['subsection_code' => 27, 'irs_code' => '501(c)(27)', 'description' => 'State-sponsored workers\' compensation reinsurance organizations'],
            ['subsection_code' => 29, 'irs_code' => '501(c)(29)', 'description' => 'Qualified nonprofit health insurance issuers (under the Affordable Care Act)'],
        ];

        foreach ($data as $item) {
            \App\Models\SubsectionCode::updateOrCreate(
                [
                    'subsection_codes' => $item['subsection_code'],
                    'irs_code' => $item['irs_code'],
                    'description' => $item['description']
                ]
            );
        }
    }
}
