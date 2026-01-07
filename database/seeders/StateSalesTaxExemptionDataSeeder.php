<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class StateSalesTaxExemptionDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * This seeder updates the state_sales_taxes table with nonprofit exemption data
     * based on the U.S. Nonprofit Sales Tax Reference Table.
     */
    public function run(): void
    {
        // State exemption data from the Excel table
        // Format: [state_code, sales_tax_status, services_vs_goods, charitable_vs_resale, requires_exemption_certificate]
        $exemptionData = [
            ['AL', 'exempt_limited', 'tangible_goods_only', 'charitable_only', true], // Alabama
            ['AK', 'no_state_sales_tax', 'n_a', 'n_a', false], // Alaska
            ['AZ', 'exempt_limited', 'tangible_goods_only', 'charitable_only', true], // Arizona
            ['AR', 'exempt_limited', 'tangible_goods_only', 'charitable_only', true], // Arkansas
            ['CA', 'non_exempt', 'tangible_goods_only', 'n_a', false], // California
            ['CO', 'exempt_limited', 'tangible_goods_only', 'charitable_only', true], // Colorado
            ['CT', 'exempt', 'tangible_goods_only', 'charitable_only', true], // Connecticut
            ['DE', 'no_state_sales_tax', 'n_a', 'n_a', false], // Delaware
            ['DC', 'exempt', 'tangible_goods_only', 'charitable_only', true], // District of Columbia
            ['FL', 'exempt', 'tangible_goods_only', 'charitable_only', true], // Florida
            ['GA', 'exempt', 'tangible_goods_only', 'charitable_only', true], // Georgia
            ['HI', 'non_exempt', 'tangible_goods_only', 'n_a', false], // Hawaii (Generally non-exempt GET)
            ['ID', 'exempt', 'tangible_goods_only', 'charitable_only', true], // Idaho
            ['IL', 'exempt', 'tangible_goods_only', 'charitable_only', true], // Illinois
            ['IN', 'exempt', 'tangible_goods_only', 'charitable_only', true], // Indiana
            ['IA', 'exempt', 'tangible_goods_only', 'charitable_only', true], // Iowa
            ['KS', 'exempt_limited', 'tangible_goods_only', 'charitable_only', true], // Kansas
            ['KY', 'exempt', 'tangible_goods_only', 'charitable_only', true], // Kentucky
            ['LA', 'exempt_limited', 'tangible_goods_only', 'charitable_only', true], // Louisiana
            ['ME', 'exempt', 'tangible_goods_only', 'charitable_only', true], // Maine
            ['MD', 'exempt', 'tangible_goods_only', 'charitable_only', true], // Maryland
            ['MA', 'exempt', 'tangible_goods_only', 'charitable_only', true], // Massachusetts
            ['MI', 'exempt', 'tangible_goods_only', 'charitable_only', true], // Michigan
            ['MN', 'exempt', 'tangible_goods_only', 'charitable_only', true], // Minnesota
            ['MS', 'non_exempt', 'tangible_goods_only', 'n_a', false], // Mississippi
            ['MO', 'exempt_limited', 'tangible_goods_only', 'charitable_only', true], // Missouri
            ['MT', 'no_state_sales_tax', 'n_a', 'n_a', false], // Montana
            ['NE', 'exempt', 'tangible_goods_only', 'charitable_only', true], // Nebraska
            ['NV', 'exempt_limited', 'tangible_goods_only', 'charitable_only', true], // Nevada
            ['NH', 'no_state_sales_tax', 'n_a', 'n_a', false], // New Hampshire
            ['NJ', 'exempt', 'tangible_goods_only', 'charitable_only', true], // New Jersey
            ['NM', 'non_exempt', 'both_taxable', 'n_a', false], // New Mexico (Generally non-exempt GRT)
            ['NY', 'exempt', 'tangible_goods_only', 'charitable_only', true], // New York
            ['NC', 'refund_based', 'tangible_goods_only', 'charitable_only', true], // North Carolina
            ['ND', 'exempt', 'tangible_goods_only', 'charitable_only', true], // North Dakota
            ['OH', 'exempt', 'tangible_goods_only', 'charitable_only', true], // Ohio
            ['OK', 'exempt_limited', 'tangible_goods_only', 'charitable_only', true], // Oklahoma
            ['OR', 'no_state_sales_tax', 'n_a', 'n_a', false], // Oregon
            ['PA', 'exempt', 'tangible_goods_only', 'charitable_only', true], // Pennsylvania
            ['RI', 'exempt', 'tangible_goods_only', 'charitable_only', true], // Rhode Island
            ['SC', 'exempt_limited', 'tangible_goods_only', 'charitable_only', true], // South Carolina
            ['SD', 'exempt_limited', 'tangible_goods_only', 'charitable_only', true], // South Dakota
            ['TN', 'refund_based', 'tangible_goods_only', 'charitable_only', true], // Tennessee
            ['TX', 'exempt', 'tangible_goods_only', 'charitable_only', true], // Texas
            ['UT', 'exempt_limited', 'tangible_goods_only', 'charitable_only', true], // Utah
            ['VT', 'exempt', 'tangible_goods_only', 'charitable_only', true], // Vermont
            ['VA', 'refund_based', 'tangible_goods_only', 'charitable_only', true], // Virginia
            ['WA', 'exempt_limited', 'tangible_goods_only', 'charitable_only', true], // Washington
            ['WV', 'exempt', 'tangible_goods_only', 'charitable_only', true], // West Virginia
            ['WI', 'exempt', 'tangible_goods_only', 'charitable_only', true], // Wisconsin
            ['WY', 'exempt_limited', 'tangible_goods_only', 'charitable_only', true], // Wyoming
        ];

        foreach ($exemptionData as $data) {
            DB::table('state_sales_taxes')
                ->where('state_code', $data[0])
                ->update([
                    'sales_tax_status' => $data[1],
                    'services_vs_goods' => $data[2],
                    'charitable_vs_resale' => $data[3],
                    'requires_exemption_certificate' => $data[4],
                    'updated_at' => now(),
                ]);
        }

        $this->command->info('State sales tax exemption data has been updated successfully!');
    }
}
