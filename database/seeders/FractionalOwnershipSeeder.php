<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\FractionalAsset;
use App\Models\FractionalOffering;
use Carbon\Carbon;

class FractionalOwnershipSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create Assets
        $goatFarm = FractionalAsset::create([
            'type' => 'Livestock',
            'name' => 'Premium Goat Farm',
            'symbol' => 'GOAT',
            'description' => 'A premium goat farming operation with 500+ high-quality goats. This farm specializes in organic goat milk production and sustainable farming practices. Located in the heart of agricultural region with modern facilities.',
            'media' => [
                'images' => [
                    '/images/goat-farm-1.jpg',
                    '/images/goat-farm-2.jpg'
                ]
            ],
            'meta' => [
                'location' => 'Rural Agricultural Region',
                'established' => '2015',
                'certifications' => ['Organic', 'Sustainable Farming']
            ]
        ]);

        $goldReserve = FractionalAsset::create([
            'type' => 'Precious Metals',
            'name' => 'Gold Reserve',
            'symbol' => 'GOLD',
            'description' => 'Physical gold bullion stored in secure vaults. High-purity 99.99% gold bars with full insurance coverage and independent verification. Ideal for portfolio diversification and wealth preservation.',
            'media' => [
                'images' => [
                    '/images/gold-bullion-1.jpg',
                    '/images/gold-bullion-2.jpg'
                ]
            ],
            'meta' => [
                'purity' => '99.99%',
                'storage' => 'Secure Vault',
                'insurance' => 'Full Coverage'
            ]
        ]);

        $officeComplex = FractionalAsset::create([
            'type' => 'Real Estate',
            'name' => 'Downtown Office Complex',
            'symbol' => 'RE-001',
            'description' => 'Prime commercial real estate in downtown business district. 5-story office building with modern amenities, high occupancy rates, and excellent rental income potential. Fully leased with long-term tenants.',
            'media' => [
                'images' => [
                    '/images/office-building-1.jpg',
                    '/images/office-building-2.jpg'
                ]
            ],
            'meta' => [
                'location' => 'Downtown Business District',
                'floors' => 5,
                'occupancy_rate' => '95%',
                'year_built' => '2018'
            ]
        ]);

        $artCollection = FractionalAsset::create([
            'type' => 'Art',
            'name' => 'Contemporary Art Collection',
            'symbol' => 'ART-001',
            'description' => 'Curated collection of contemporary artworks from emerging and established artists. Includes paintings, sculptures, and digital art pieces. Professionally appraised and insured collection with proven appreciation value.',
            'media' => [
                'images' => [
                    '/images/art-collection-1.jpg',
                    '/images/art-collection-2.jpg'
                ]
            ],
            'meta' => [
                'pieces' => 25,
                'appraised_value' => 'Independent Appraisal',
                'insurance' => 'Full Coverage'
            ]
        ]);

        $farmland = FractionalAsset::create([
            'type' => 'Agriculture',
            'name' => 'Premium Farmland',
            'symbol' => 'FARM-001',
            'description' => '500 acres of prime agricultural land with fertile soil, water rights, and modern irrigation systems. Currently producing organic crops with sustainable farming practices. Long-term lease agreements in place.',
            'media' => [
                'images' => [
                    '/images/farmland-1.jpg',
                    '/images/farmland-2.jpg'
                ]
            ],
            'meta' => [
                'acres' => 500,
                'soil_type' => 'Fertile Loam',
                'water_rights' => 'Yes',
                'irrigation' => 'Modern System'
            ]
        ]);

        $miningFacility = FractionalAsset::create([
            'type' => 'Technology',
            'name' => 'Bitcoin Mining Facility',
            'symbol' => 'BTC-MINE',
            'description' => 'State-of-the-art cryptocurrency mining facility with high-performance ASIC miners. Located in region with low electricity costs and renewable energy sources. 24/7 operations with professional management.',
            'media' => [
                'images' => [
                    '/images/mining-facility-1.jpg',
                    '/images/mining-facility-2.jpg'
                ]
            ],
            'meta' => [
                'hash_rate' => '100 TH/s',
                'energy_source' => 'Renewable',
                'operational' => '24/7'
            ]
        ]);

        // Create Offerings for Goat Farm
        FractionalOffering::create([
            'asset_id' => $goatFarm->id,
            'title' => 'Premium Goat Farm - Initial Offering',
            'summary' => 'Own a share of our premium goat farming operation. This offering provides fractional ownership in a profitable, sustainable farming business with regular income distributions.',
            'total_shares' => 1000,
            'available_shares' => 750,
            'price_per_share' => 500.00,
            'token_price' => 10.00,
            'ownership_percentage' => 2.00,
            'currency' => 'USD',
            'status' => 'live',
            'go_live_at' => Carbon::parse('2025-01-01'),
            'close_at' => Carbon::parse('2025-12-31'),
            'meta' => [
                'expected_returns' => '8-12% annually',
                'distribution_schedule' => 'Quarterly',
                'minimum_investment' => 10
            ]
        ]);

        FractionalOffering::create([
            'asset_id' => $goatFarm->id,
            'title' => 'Goat Farm Expansion - Phase 2',
            'summary' => 'Second offering for farm expansion. Funds will be used to increase herd size and upgrade facilities, increasing production capacity by 40%.',
            'total_shares' => 500,
            'available_shares' => 500,
            'price_per_share' => 600.00,
            'token_price' => 12.00,
            'ownership_percentage' => 2.00,
            'currency' => 'USD',
            'status' => 'live',
            'go_live_at' => Carbon::parse('2025-02-01'),
            'close_at' => Carbon::parse('2025-11-30'),
            'meta' => [
                'expected_returns' => '10-15% annually',
                'distribution_schedule' => 'Quarterly',
                'minimum_investment' => 12
            ]
        ]);

        // Create Offerings for Gold Reserve
        FractionalOffering::create([
            'asset_id' => $goldReserve->id,
            'title' => 'Gold Bullion Reserve - Standard Offering',
            'summary' => 'Fractional ownership in physical gold bullion. Each share represents ownership in high-purity gold stored in secure, insured vaults. Hedge against inflation and market volatility.',
            'total_shares' => 2000,
            'available_shares' => 1500,
            'price_per_share' => 1000.00,
            'token_price' => 25.00,
            'ownership_percentage' => 2.50,
            'currency' => 'USD',
            'status' => 'live',
            'go_live_at' => Carbon::parse('2025-01-15'),
            'close_at' => Carbon::parse('2025-12-31'),
            'meta' => [
                'storage_fee' => '0.5% annually',
                'redemption' => 'Physical delivery available',
                'minimum_investment' => 25
            ]
        ]);

        FractionalOffering::create([
            'asset_id' => $goldReserve->id,
            'title' => 'Gold Bullion Reserve - Premium Offering',
            'summary' => 'Premium gold offering with larger share sizes. Includes additional benefits such as priority redemption and lower storage fees.',
            'total_shares' => 500,
            'available_shares' => 300,
            'price_per_share' => 5000.00,
            'token_price' => 100.00,
            'ownership_percentage' => 2.00,
            'currency' => 'USD',
            'status' => 'live',
            'go_live_at' => Carbon::parse('2025-02-01'),
            'close_at' => Carbon::parse('2025-11-30'),
            'meta' => [
                'storage_fee' => '0.3% annually',
                'redemption' => 'Priority physical delivery',
                'minimum_investment' => 100
            ]
        ]);

        // Create Offering for Office Complex
        FractionalOffering::create([
            'asset_id' => $officeComplex->id,
            'title' => 'Downtown Office Complex - Commercial Real Estate',
            'summary' => 'Fractional ownership in prime commercial real estate. Benefit from steady rental income and potential property appreciation in a prime downtown location.',
            'total_shares' => 500,
            'available_shares' => 400,
            'price_per_share' => 2000.00,
            'token_price' => 50.00,
            'ownership_percentage' => 2.50,
            'currency' => 'USD',
            'status' => 'live',
            'go_live_at' => Carbon::parse('2025-01-10'),
            'close_at' => Carbon::parse('2025-12-31'),
            'meta' => [
                'expected_returns' => '6-8% annually',
                'distribution_schedule' => 'Monthly',
                'occupancy_rate' => '95%',
                'minimum_investment' => 50
            ]
        ]);

        // Create Offering for Art Collection
        FractionalOffering::create([
            'asset_id' => $artCollection->id,
            'title' => 'Contemporary Art Collection - Curated Selection',
            'summary' => 'Own a piece of a professionally curated contemporary art collection. Benefit from potential appreciation in art value while supporting emerging artists.',
            'total_shares' => 300,
            'available_shares' => 250,
            'price_per_share' => 1500.00,
            'token_price' => 30.00,
            'ownership_percentage' => 2.00,
            'currency' => 'USD',
            'status' => 'live',
            'go_live_at' => Carbon::parse('2025-01-20'),
            'close_at' => Carbon::parse('2025-12-31'),
            'meta' => [
                'appreciation_potential' => '10-20% annually',
                'exhibition' => 'Regular gallery shows',
                'minimum_investment' => 30
            ]
        ]);

        // Create Offering for Farmland
        FractionalOffering::create([
            'asset_id' => $farmland->id,
            'title' => 'Premium Farmland - Agricultural Investment',
            'summary' => 'Fractional ownership in 500 acres of prime agricultural land. Benefit from lease income and potential land appreciation. Sustainable farming practices ensure long-term value.',
            'total_shares' => 1000,
            'available_shares' => 800,
            'price_per_share' => 750.00,
            'token_price' => 15.00,
            'ownership_percentage' => 2.00,
            'currency' => 'USD',
            'status' => 'live',
            'go_live_at' => Carbon::parse('2025-01-05'),
            'close_at' => Carbon::parse('2025-12-31'),
            'meta' => [
                'expected_returns' => '5-7% annually',
                'lease_income' => 'Annual',
                'land_appreciation' => 'Historical 3-5%',
                'minimum_investment' => 15
            ]
        ]);

        // Create Offering for Mining Facility
        FractionalOffering::create([
            'asset_id' => $miningFacility->id,
            'title' => 'Bitcoin Mining Facility - Crypto Mining',
            'summary' => 'Fractional ownership in a professional Bitcoin mining operation. Benefit from daily mining rewards and potential cryptocurrency appreciation. Low-cost renewable energy ensures profitability.',
            'total_shares' => 2000,
            'available_shares' => 1500,
            'price_per_share' => 250.00,
            'token_price' => 5.00,
            'ownership_percentage' => 2.00,
            'currency' => 'USD',
            'status' => 'live',
            'go_live_at' => Carbon::parse('2025-01-01'),
            'close_at' => Carbon::parse('2025-12-31'),
            'meta' => [
                'expected_returns' => '15-25% annually',
                'payout_schedule' => 'Daily',
                'energy_cost' => 'Low (Renewable)',
                'minimum_investment' => 5
            ]
        ]);

        $this->command->info('Fractional Ownership test data seeded successfully!');
        $this->command->info('Created 6 assets and 8 offerings.');
    }
}


