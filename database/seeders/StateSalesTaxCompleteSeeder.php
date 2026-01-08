<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class StateSalesTaxCompleteSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * This seeder creates/updates the state_sales_taxes table with complete data
     * matching the sales tax table structure exactly.
     *
     * Format: [
     *   state_code,
     *   base_sales_tax_rate,
     *   rate_mode,
     *   sales_tax_status,
     *   services_vs_goods,
     *   charitable_vs_resale,
     *   requires_exemption_certificate,
     *   certificate_type_allowed,
     *   site_to_apply_for_certificate
     * ]
     */
    public function run(): void
    {
        $statesData = [
            // Alabama
            ['AL', 4.00, 'STATE BASE ONLY', 'exempt_limited', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://www.revenue.alabama.gov'],
            // Alaska
            ['AK', 0.00, 'NO STATE TAX', 'no_state_sales_tax', 'n_a', 'n_a', false, 'NONE', null],
            // Arizona
            ['AZ', 5.60, 'STATE BASE ONLY', 'exempt_limited', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://azdor.gov'],
            // Arkansas
            ['AR', 6.50, 'STATE BASE ONLY', 'exempt_limited', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://www.dfa.arkansas.gov'],
            // California
            ['CA', 7.25, 'STATE BASE ONLY', 'non_exempt', 'tangible_goods_only', 'n_a', false, 'NONE', null],
            // Colorado
            ['CO', 2.90, 'STATE BASE ONLY', 'exempt_limited', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://tax.colorado.gov'],
            // Connecticut
            ['CT', 6.35, 'STATE BASE ONLY', 'exempt', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://portal.ct.gov/DRS'],
            // Delaware
            ['DE', 0.00, 'NO STATE TAX', 'no_state_sales_tax', 'n_a', 'n_a', false, 'NONE', null],
            // District of Columbia
            ['DC', 6.00, 'STATE BASE ONLY', 'exempt', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://otr.cfo.dc.gov'],
            // Florida
            ['FL', 6.00, 'STATE BASE ONLY', 'exempt', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://floridarevenue.com'],
            // Georgia
            ['GA', 4.00, 'STATE BASE ONLY', 'exempt', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://dor.georgia.gov'],
            // Hawaii
            ['HI', 4.00, 'STATE BASE ONLY', 'non_exempt', 'tangible_goods_only', 'n_a', false, 'NONE', null],
            // Idaho
            ['ID', 6.00, 'STATE BASE ONLY', 'exempt', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://tax.idaho.gov'],
            // Illinois
            ['IL', 6.25, 'STATE BASE ONLY', 'exempt', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://tax.illinois.gov'],
            // Indiana
            ['IN', 7.00, 'STATE BASE ONLY', 'exempt', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://www.in.gov/dor'],
            // Iowa
            ['IA', 6.00, 'STATE BASE ONLY', 'exempt', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://tax.iowa.gov'],
            // Kansas
            ['KS', 6.50, 'STATE BASE ONLY', 'exempt_limited', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://www.ksrevenue.gov'],
            // Kentucky
            ['KY', 6.00, 'STATE BASE ONLY', 'exempt', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://revenue.ky.gov'],
            // Louisiana
            ['LA', 4.45, 'STATE BASE ONLY', 'exempt_limited', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://revenue.louisiana.gov'],
            // Maine
            ['ME', 5.50, 'STATE BASE ONLY', 'exempt', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://www.maine.gov/revenue'],
            // Maryland
            ['MD', 6.00, 'STATE BASE ONLY', 'exempt', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://comptroller.maryland.gov'],
            // Massachusetts
            ['MA', 6.25, 'STATE BASE ONLY', 'exempt', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://www.mass.gov/dor'],
            // Michigan
            ['MI', 6.00, 'STATE BASE ONLY', 'exempt', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://www.michigan.gov/treasury'],
            // Minnesota
            ['MN', 6.88, 'STATE BASE ONLY', 'exempt', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://www.revenue.state.mn.us'],
            // Mississippi
            ['MS', 7.00, 'STATE BASE ONLY', 'non_exempt', 'tangible_goods_only', 'n_a', false, 'NONE', null],
            // Missouri
            ['MO', 4.23, 'STATE BASE ONLY', 'exempt_limited', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://dor.mo.gov'],
            // Montana
            ['MT', 0.00, 'NO STATE TAX', 'no_state_sales_tax', 'n_a', 'n_a', false, 'NONE', null],
            // Nebraska
            ['NE', 5.50, 'STATE BASE ONLY', 'exempt', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://revenue.nebraska.gov'],
            // Nevada
            ['NV', 6.85, 'STATE BASE ONLY', 'exempt_limited', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://tax.nv.gov'],
            // New Hampshire
            ['NH', 0.00, 'NO STATE TAX', 'no_state_sales_tax', 'n_a', 'n_a', false, 'NONE', null],
            // New Jersey
            ['NJ', 6.63, 'STATE BASE ONLY', 'exempt', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://www.state.nj.us/treasury/taxation'],
            // New Mexico
            ['NM', 5.13, 'STATE BASE ONLY', 'non_exempt', 'both_taxable', 'n_a', false, 'NONE', null],
            // New York
            ['NY', 4.00, 'STATE BASE ONLY', 'exempt', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://www.tax.ny.gov'],
            // North Carolina
            ['NC', 4.75, 'STATE BASE ONLY', 'refund_based', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://www.ncdor.gov'],
            // North Dakota
            ['ND', 5.00, 'STATE BASE ONLY', 'exempt', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://www.nd.gov/tax'],
            // Ohio
            ['OH', 5.75, 'STATE BASE ONLY', 'exempt', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://tax.ohio.gov'],
            // Oklahoma
            ['OK', 4.50, 'STATE BASE ONLY', 'exempt_limited', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://www.ok.gov/tax'],
            // Oregon
            ['OR', 0.00, 'NO STATE TAX', 'no_state_sales_tax', 'n_a', 'n_a', false, 'NONE', null],
            // Pennsylvania
            ['PA', 6.00, 'STATE BASE ONLY', 'exempt', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://www.revenue.pa.gov'],
            // Rhode Island
            ['RI', 7.00, 'STATE BASE ONLY', 'exempt', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://tax.ri.gov'],
            // South Carolina
            ['SC', 6.00, 'STATE BASE ONLY', 'exempt_limited', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://dor.sc.gov'],
            // South Dakota
            ['SD', 4.20, 'STATE BASE ONLY', 'exempt_limited', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://dor.sd.gov'],
            // Tennessee
            ['TN', 7.00, 'STATE BASE ONLY', 'refund_based', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://www.tn.gov/revenue'],
            // Texas
            ['TX', 6.25, 'STATE BASE ONLY', 'exempt', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://comptroller.texas.gov'],
            // Utah
            ['UT', 4.85, 'STATE BASE ONLY', 'exempt_limited', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://tax.utah.gov'],
            // Vermont
            ['VT', 6.00, 'STATE BASE ONLY', 'exempt', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://tax.vermont.gov'],
            // Virginia
            ['VA', 5.30, 'STATE BASE ONLY', 'refund_based', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://www.tax.virginia.gov'],
            // Washington
            ['WA', 6.50, 'STATE BASE ONLY', 'exempt_limited', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://dor.wa.gov'],
            // West Virginia
            ['WV', 6.00, 'STATE BASE ONLY', 'exempt', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://tax.wv.gov'],
            // Wisconsin
            ['WI', 5.00, 'STATE BASE ONLY', 'exempt', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://www.revenue.wi.gov'],
            // Wyoming
            ['WY', 4.00, 'STATE BASE ONLY', 'exempt_limited', 'tangible_goods_only', 'charitable_only', true, 'NONPROFIT_EXEMPTION|RESALE', 'https://wyomingtax.gov'],
        ];

        foreach ($statesData as $data) {
            DB::table('state_sales_taxes')
                ->where('state_code', $data[0])
                ->update([
                    'base_sales_tax_rate' => $data[1],
                    'rate_mode' => $data[2],
                    'sales_tax_status' => $data[3],
                    'services_vs_goods' => $data[4],
                    'charitable_vs_resale' => $data[5],
                    'requires_exemption_certificate' => $data[6],
                    'certificate_type_allowed' => $data[7],
                    'site_to_apply_for_certificate' => $data[8],
                    'updated_at' => now(),
                ]);
        }

        $this->command->info('State sales tax data has been updated successfully for all 50 states!');
    }
}

