<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Country;

class CountriesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $countries = [
            ['code' => 'GM', 'name' => 'Gambia', 'is_active' => true, 'display_order' => 1],
            ['code' => 'US', 'name' => 'United States', 'is_active' => true, 'display_order' => 2],
            ['code' => 'CA', 'name' => 'Canada', 'is_active' => true, 'display_order' => 3],
            ['code' => 'GB', 'name' => 'United Kingdom', 'is_active' => true, 'display_order' => 4],
            ['code' => 'AU', 'name' => 'Australia', 'is_active' => true, 'display_order' => 5],
            ['code' => 'DE', 'name' => 'Germany', 'is_active' => true, 'display_order' => 6],
            ['code' => 'FR', 'name' => 'France', 'is_active' => true, 'display_order' => 7],
            ['code' => 'IT', 'name' => 'Italy', 'is_active' => true, 'display_order' => 8],
            ['code' => 'ES', 'name' => 'Spain', 'is_active' => true, 'display_order' => 9],
            ['code' => 'NL', 'name' => 'Netherlands', 'is_active' => true, 'display_order' => 10],
            ['code' => 'BE', 'name' => 'Belgium', 'is_active' => true, 'display_order' => 11],
            ['code' => 'CH', 'name' => 'Switzerland', 'is_active' => true, 'display_order' => 12],
            ['code' => 'AT', 'name' => 'Austria', 'is_active' => true, 'display_order' => 13],
            ['code' => 'SE', 'name' => 'Sweden', 'is_active' => true, 'display_order' => 14],
            ['code' => 'NO', 'name' => 'Norway', 'is_active' => true, 'display_order' => 15],
            ['code' => 'DK', 'name' => 'Denmark', 'is_active' => true, 'display_order' => 16],
            ['code' => 'FI', 'name' => 'Finland', 'is_active' => true, 'display_order' => 17],
            ['code' => 'IE', 'name' => 'Ireland', 'is_active' => true, 'display_order' => 18],
            ['code' => 'PT', 'name' => 'Portugal', 'is_active' => true, 'display_order' => 19],
            ['code' => 'GR', 'name' => 'Greece', 'is_active' => true, 'display_order' => 20],
            ['code' => 'JP', 'name' => 'Japan', 'is_active' => true, 'display_order' => 21],
            ['code' => 'CN', 'name' => 'China', 'is_active' => true, 'display_order' => 22],
            ['code' => 'IN', 'name' => 'India', 'is_active' => true, 'display_order' => 23],
            ['code' => 'BR', 'name' => 'Brazil', 'is_active' => true, 'display_order' => 24],
            ['code' => 'MX', 'name' => 'Mexico', 'is_active' => true, 'display_order' => 25],
            ['code' => 'ZA', 'name' => 'South Africa', 'is_active' => true, 'display_order' => 26],
            ['code' => 'EG', 'name' => 'Egypt', 'is_active' => true, 'display_order' => 27],
            ['code' => 'NG', 'name' => 'Nigeria', 'is_active' => true, 'display_order' => 28],
            ['code' => 'KE', 'name' => 'Kenya', 'is_active' => true, 'display_order' => 29],
            ['code' => 'GH', 'name' => 'Ghana', 'is_active' => true, 'display_order' => 30],
            ['code' => 'ET', 'name' => 'Ethiopia', 'is_active' => true, 'display_order' => 31],
            ['code' => 'TZ', 'name' => 'Tanzania', 'is_active' => true, 'display_order' => 32],
            ['code' => 'UG', 'name' => 'Uganda', 'is_active' => true, 'display_order' => 33],
            ['code' => 'RW', 'name' => 'Rwanda', 'is_active' => true, 'display_order' => 34],
            ['code' => 'TH', 'name' => 'Thailand', 'is_active' => true, 'display_order' => 35],
            ['code' => 'VN', 'name' => 'Vietnam', 'is_active' => true, 'display_order' => 36],
            ['code' => 'ID', 'name' => 'Indonesia', 'is_active' => true, 'display_order' => 37],
            ['code' => 'MY', 'name' => 'Malaysia', 'is_active' => true, 'display_order' => 38],
            ['code' => 'SG', 'name' => 'Singapore', 'is_active' => true, 'display_order' => 39],
            ['code' => 'PH', 'name' => 'Philippines', 'is_active' => true, 'display_order' => 40],
            ['code' => 'KR', 'name' => 'South Korea', 'is_active' => true, 'display_order' => 41],
            ['code' => 'NZ', 'name' => 'New Zealand', 'is_active' => true, 'display_order' => 42],
            ['code' => 'TR', 'name' => 'Turkey', 'is_active' => true, 'display_order' => 43],
            ['code' => 'SA', 'name' => 'Saudi Arabia', 'is_active' => true, 'display_order' => 44],
            ['code' => 'AE', 'name' => 'United Arab Emirates', 'is_active' => true, 'display_order' => 45],
            ['code' => 'SN', 'name' => 'Senegal', 'is_active' => true, 'display_order' => 46],
            ['code' => 'ML', 'name' => 'Mali', 'is_active' => true, 'display_order' => 47],
            ['code' => 'BF', 'name' => 'Burkina Faso', 'is_active' => true, 'display_order' => 48],
            ['code' => 'NE', 'name' => 'Niger', 'is_active' => true, 'display_order' => 49],
            ['code' => 'TD', 'name' => 'Chad', 'is_active' => true, 'display_order' => 50],
        ];

        foreach ($countries as $country) {
            Country::updateOrCreate(
                ['code' => $country['code']],
                $country
            );
        }
    }
}
