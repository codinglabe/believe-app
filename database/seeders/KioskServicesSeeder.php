<?php

namespace Database\Seeders;

use App\Models\KioskService;
use Illuminate\Database\Seeder;

class KioskServicesSeeder extends Seeder
{
    /** Map category display name from import to kiosk_categories slug */
    protected array $categoryToSlug = [
        'Pay Bills' => 'pay-bills',
        'Healthcare' => 'healthcare',
        'Government' => 'government',
        'Jobs' => 'find-a-job',
        'Financial' => 'financial',
        'Community Help' => 'community-help',
        'Housing' => 'housing-assistance',
        'Education' => 'education',
        'Veterans' => 'veteran-services',
        'Food & Family' => 'food-and-family',
        'Transportation' => 'transportation',
        'Disaster & Legal' => 'disaster-and-legal',
    ];

    public function run(): void
    {
        $rows = $this->getJeaneretteRows();
        foreach ($rows as $i => $row) {
            $categorySlug = $this->categoryToSlug[$row['category']] ?? \Str::slug($row['category']);
            KioskService::updateOrCreate(
                [
                    'market_code' => $row['market_code'],
                    'service_slug' => $row['service_slug'],
                ],
                [
                    'state' => $row['state'],
                    'parish' => $row['parish'] ?? null,
                    'city' => $row['city'],
                    'category_slug' => $categorySlug,
                    'subcategory' => $row['subcategory'],
                    'display_name' => $row['display_name'],
                    'url' => $row['url'] ?? null,
                    'launch_type' => $row['launch_type'] ?? 'web_portal',
                    'jurisdiction_level' => $row['jurisdiction_level'] ?? null,
                    'jurisdiction_rank' => (int) ($row['jurisdiction_rank'] ?? 7),
                    'category_sort' => (int) ($row['category_sort'] ?? 1),
                    'item_sort_within_category' => (int) ($row['item_sort_within_category'] ?? $i + 1),
                    'is_active' => true,
                    'allow_webview' => true,
                    'enable_redirect_tracking' => false,
                    'internal_product' => $row['internal_product'] ?? null,
                    'notes' => $row['notes'] ?? null,
                ]
            );
        }
    }

    protected function getJeaneretteRows(): array
    {
        return [
            ['market_code' => 'LA-IBERIA-JEANERETTE', 'state' => 'Louisiana', 'parish' => 'Iberia Parish', 'city' => 'Jeanerette', 'category' => 'Pay Bills', 'subcategory' => 'Electricity (Cleco)', 'service_slug' => 'pay-bills--electricity-cleco', 'display_name' => 'Electricity (Cleco)', 'url' => 'https://www.cleco.com', 'launch_type' => 'web_portal', 'jurisdiction_level' => 'Private', 'jurisdiction_rank' => 7, 'category_sort' => 1, 'item_sort_within_category' => 1],
            ['market_code' => 'LA-IBERIA-JEANERETTE', 'state' => 'Louisiana', 'parish' => 'Iberia Parish', 'city' => 'Jeanerette', 'category' => 'Pay Bills', 'subcategory' => 'Electricity (Entergy Louisiana)', 'service_slug' => 'pay-bills--electricity-entergy-louisiana', 'display_name' => 'Electricity (Entergy Louisiana)', 'url' => 'https://www.entergy-louisiana.com', 'launch_type' => 'web_portal', 'jurisdiction_level' => 'Private', 'jurisdiction_rank' => 7, 'category_sort' => 1, 'item_sort_within_category' => 2],
            ['market_code' => 'LA-IBERIA-JEANERETTE', 'state' => 'Louisiana', 'parish' => 'Iberia Parish', 'city' => 'Jeanerette', 'category' => 'Pay Bills', 'subcategory' => 'Water (City of Jeanerette)', 'service_slug' => 'pay-bills--water-city-of-jeanerette', 'display_name' => 'Water (City of Jeanerette)', 'url' => 'http://www.jeanerette.com', 'launch_type' => 'web_portal', 'jurisdiction_level' => 'City', 'jurisdiction_rank' => 1, 'category_sort' => 1, 'item_sort_within_category' => 3],
            ['market_code' => 'LA-IBERIA-JEANERETTE', 'state' => 'Louisiana', 'parish' => 'Iberia Parish', 'city' => 'Jeanerette', 'category' => 'Pay Bills', 'subcategory' => 'Gas (Atmos Energy)', 'service_slug' => 'pay-bills--gas-atmos-energy', 'display_name' => 'Gas (Atmos Energy)', 'url' => 'https://www.atmosenergy.com', 'launch_type' => 'web_portal', 'jurisdiction_level' => 'Private', 'jurisdiction_rank' => 7, 'category_sort' => 1, 'item_sort_within_category' => 4],
            ['market_code' => 'LA-IBERIA-JEANERETTE', 'state' => 'Louisiana', 'parish' => 'Iberia Parish', 'city' => 'Jeanerette', 'category' => 'Pay Bills', 'subcategory' => 'Phone/Internet (AT&T)', 'service_slug' => 'pay-bills--phone-internet-at-and-t', 'display_name' => 'Phone/Internet (AT&T)', 'url' => 'https://www.att.com', 'launch_type' => 'web_portal', 'jurisdiction_level' => 'Private', 'jurisdiction_rank' => 7, 'category_sort' => 1, 'item_sort_within_category' => 5],
            ['market_code' => 'LA-IBERIA-JEANERETTE', 'state' => 'Louisiana', 'parish' => 'Iberia Parish', 'city' => 'Jeanerette', 'category' => 'Healthcare', 'subcategory' => 'Medicaid (Healthy Louisiana)', 'service_slug' => 'healthcare--medicaid-healthy-louisiana', 'display_name' => 'Medicaid (Healthy Louisiana)', 'url' => 'https://www.healthy.la.gov', 'launch_type' => 'web_portal', 'jurisdiction_level' => 'State', 'jurisdiction_rank' => 3, 'category_sort' => 2, 'item_sort_within_category' => 1],
            ['market_code' => 'LA-IBERIA-JEANERETTE', 'state' => 'Louisiana', 'parish' => 'Iberia Parish', 'city' => 'Jeanerette', 'category' => 'Healthcare', 'subcategory' => 'Find Local Clinics', 'service_slug' => 'healthcare--find-local-clinics', 'display_name' => 'Find Local Clinics', 'url' => 'https://ldh.la.gov', 'launch_type' => 'web_portal', 'jurisdiction_level' => 'State', 'jurisdiction_rank' => 3, 'category_sort' => 2, 'item_sort_within_category' => 2],
            ['market_code' => 'LA-IBERIA-JEANERETTE', 'state' => 'Louisiana', 'parish' => 'Iberia Parish', 'city' => 'Jeanerette', 'category' => 'Healthcare', 'subcategory' => 'Telehealth (Ochsner Health)', 'service_slug' => 'healthcare--telehealth-ochsner-health', 'display_name' => 'Telehealth (Ochsner Health)', 'url' => 'https://www.ochsner.org', 'launch_type' => 'web_portal', 'jurisdiction_level' => 'Private', 'jurisdiction_rank' => 7, 'category_sort' => 2, 'item_sort_within_category' => 3],
            ['market_code' => 'LA-IBERIA-JEANERETTE', 'state' => 'Louisiana', 'parish' => 'Iberia Parish', 'city' => 'Jeanerette', 'category' => 'Healthcare', 'subcategory' => 'Prescription Help (GoodRx)', 'service_slug' => 'healthcare--prescription-help-goodrx', 'display_name' => 'Prescription Help (GoodRx)', 'url' => 'https://www.goodrx.com', 'launch_type' => 'web_portal', 'jurisdiction_level' => 'Private', 'jurisdiction_rank' => 7, 'category_sort' => 2, 'item_sort_within_category' => 4],
            ['market_code' => 'LA-IBERIA-JEANERETTE', 'state' => 'Louisiana', 'parish' => 'Iberia Parish', 'city' => 'Jeanerette', 'category' => 'Healthcare', 'subcategory' => 'Mental Health Services', 'service_slug' => 'healthcare--mental-health-services', 'display_name' => 'Mental Health Services', 'url' => 'https://ldh.la.gov/page/mental-health', 'launch_type' => 'web_portal', 'jurisdiction_level' => 'State', 'jurisdiction_rank' => 3, 'category_sort' => 2, 'item_sort_within_category' => 5],
            ['market_code' => 'LA-IBERIA-JEANERETTE', 'state' => 'Louisiana', 'parish' => 'Iberia Parish', 'city' => 'Jeanerette', 'category' => 'Government', 'subcategory' => 'Benefits (CAFÉ Portal)', 'service_slug' => 'government--benefits-cafe-portal', 'display_name' => 'Benefits (CAFÉ Portal)', 'url' => 'https://cafe-cp.dcfs.la.gov', 'launch_type' => 'web_portal', 'jurisdiction_level' => 'State', 'jurisdiction_rank' => 3, 'category_sort' => 3, 'item_sort_within_category' => 1],
            ['market_code' => 'LA-IBERIA-JEANERETTE', 'state' => 'Louisiana', 'parish' => 'Iberia Parish', 'city' => 'Jeanerette', 'category' => 'Government', 'subcategory' => 'DMV Services (OMV)', 'service_slug' => 'government--dmv-services-omv', 'display_name' => 'DMV Services (OMV)', 'url' => 'https://www.expresslane.org', 'launch_type' => 'web_portal', 'jurisdiction_level' => 'State', 'jurisdiction_rank' => 3, 'category_sort' => 3, 'item_sort_within_category' => 2],
            ['market_code' => 'LA-IBERIA-JEANERETTE', 'state' => 'Louisiana', 'parish' => 'Iberia Parish', 'city' => 'Jeanerette', 'category' => 'Government', 'subcategory' => 'Local Parish Services (Iberia Parish)', 'service_slug' => 'government--local-parish-services-iberia-parish', 'display_name' => 'Local Parish Services (Iberia Parish)', 'url' => 'https://iberiaparishgovernment.com', 'launch_type' => 'web_portal', 'jurisdiction_level' => 'Parish', 'jurisdiction_rank' => 2, 'category_sort' => 3, 'item_sort_within_category' => 3],
            ['market_code' => 'LA-IBERIA-JEANERETTE', 'state' => 'Louisiana', 'parish' => 'Iberia Parish', 'city' => 'Jeanerette', 'category' => 'Government', 'subcategory' => 'Louisiana.gov Portal', 'service_slug' => 'government--louisiana-gov-portal', 'display_name' => 'Louisiana.gov Portal', 'url' => 'https://www.louisiana.gov', 'launch_type' => 'web_portal', 'jurisdiction_level' => 'State', 'jurisdiction_rank' => 3, 'category_sort' => 3, 'item_sort_within_category' => 4],
            ['market_code' => 'LA-IBERIA-JEANERETTE', 'state' => 'Louisiana', 'parish' => 'Iberia Parish', 'city' => 'Jeanerette', 'category' => 'Jobs', 'subcategory' => 'Louisiana Workforce Commission', 'service_slug' => 'jobs--louisiana-workforce-commission', 'display_name' => 'Louisiana Workforce Commission', 'url' => 'https://www.louisianaworks.net', 'launch_type' => 'web_portal', 'jurisdiction_level' => 'State', 'jurisdiction_rank' => 3, 'category_sort' => 4, 'item_sort_within_category' => 1],
            ['market_code' => 'LA-IBERIA-JEANERETTE', 'state' => 'Louisiana', 'parish' => 'Iberia Parish', 'city' => 'Jeanerette', 'category' => 'Jobs', 'subcategory' => 'Local Job Listings', 'service_slug' => 'jobs--local-job-listings', 'display_name' => 'Local Job Listings', 'url' => 'https://www.indeed.com', 'launch_type' => 'web_portal', 'jurisdiction_level' => 'Private', 'jurisdiction_rank' => 7, 'category_sort' => 4, 'item_sort_within_category' => 2],
            ['market_code' => 'LA-IBERIA-JEANERETTE', 'state' => 'Louisiana', 'parish' => 'Iberia Parish', 'city' => 'Jeanerette', 'category' => 'Financial', 'subcategory' => 'Send Money (Cash App)', 'service_slug' => 'financial--send-money-cash-app', 'display_name' => 'Send Money (Cash App)', 'url' => 'https://cash.app', 'launch_type' => 'web_portal', 'jurisdiction_level' => 'Private', 'jurisdiction_rank' => 7, 'category_sort' => 5, 'item_sort_within_category' => 2],
            ['market_code' => 'LA-IBERIA-JEANERETTE', 'state' => 'Louisiana', 'parish' => 'Iberia Parish', 'city' => 'Jeanerette', 'category' => 'Financial', 'subcategory' => 'PayPal', 'service_slug' => 'financial--paypal', 'display_name' => 'PayPal', 'url' => 'https://www.paypal.com', 'launch_type' => 'web_portal', 'jurisdiction_level' => 'Private', 'jurisdiction_rank' => 7, 'category_sort' => 5, 'item_sort_within_category' => 3],
            ['market_code' => 'LA-IBERIA-JEANERETTE', 'state' => 'Louisiana', 'parish' => 'Iberia Parish', 'city' => 'Jeanerette', 'category' => 'Community Help', 'subcategory' => 'United Way (Local Help)', 'service_slug' => 'community-help--united-way-local-help', 'display_name' => 'United Way (Local Help)', 'url' => 'https://www.211.org', 'launch_type' => 'web_portal', 'jurisdiction_level' => 'Nonprofit', 'jurisdiction_rank' => 6, 'category_sort' => 6, 'item_sort_within_category' => 1],
            ['market_code' => 'LA-IBERIA-JEANERETTE', 'state' => 'Louisiana', 'parish' => 'Iberia Parish', 'city' => 'Jeanerette', 'category' => 'Housing', 'subcategory' => 'Section 8 (HUD)', 'service_slug' => 'housing--section-8-hud', 'display_name' => 'Section 8 (HUD)', 'url' => 'https://www.hud.gov', 'launch_type' => 'web_portal', 'jurisdiction_level' => 'Federal', 'jurisdiction_rank' => 5, 'category_sort' => 7, 'item_sort_within_category' => 1],
            ['market_code' => 'LA-IBERIA-JEANERETTE', 'state' => 'Louisiana', 'parish' => 'Iberia Parish', 'city' => 'Jeanerette', 'category' => 'Education', 'subcategory' => 'Louisiana Schools Info', 'service_slug' => 'education--louisiana-schools-info', 'display_name' => 'Louisiana Schools Info', 'url' => 'https://www.louisianabelieves.com', 'launch_type' => 'web_portal', 'jurisdiction_level' => 'State', 'jurisdiction_rank' => 3, 'category_sort' => 8, 'item_sort_within_category' => 2],
            ['market_code' => 'LA-IBERIA-JEANERETTE', 'state' => 'Louisiana', 'parish' => 'Iberia Parish', 'city' => 'Jeanerette', 'category' => 'Veterans', 'subcategory' => 'VA Benefits', 'service_slug' => 'veterans--va-benefits', 'display_name' => 'VA Benefits', 'url' => 'https://www.va.gov', 'launch_type' => 'web_portal', 'jurisdiction_level' => 'Federal', 'jurisdiction_rank' => 5, 'category_sort' => 9, 'item_sort_within_category' => 1],
            ['market_code' => 'LA-IBERIA-JEANERETTE', 'state' => 'Louisiana', 'parish' => 'Iberia Parish', 'city' => 'Jeanerette', 'category' => 'Food & Family', 'subcategory' => 'SNAP / Food Stamps', 'service_slug' => 'food-and-family--snap-food-stamps', 'display_name' => 'SNAP / Food Stamps', 'url' => 'https://dcfs.la.gov', 'launch_type' => 'web_portal', 'jurisdiction_level' => 'State', 'jurisdiction_rank' => 3, 'category_sort' => 10, 'item_sort_within_category' => 1],
            ['market_code' => 'LA-IBERIA-JEANERETTE', 'state' => 'Louisiana', 'parish' => 'Iberia Parish', 'city' => 'Jeanerette', 'category' => 'Transportation', 'subcategory' => 'Local Transit Info', 'service_slug' => 'transportation--local-transit-info', 'display_name' => 'Local Transit Info', 'url' => 'https://www.iberiaparishgovernment.com', 'launch_type' => 'web_portal', 'jurisdiction_level' => 'Parish', 'jurisdiction_rank' => 2, 'category_sort' => 11, 'item_sort_within_category' => 1],
            ['market_code' => 'LA-IBERIA-JEANERETTE', 'state' => 'Louisiana', 'parish' => 'Iberia Parish', 'city' => 'Jeanerette', 'category' => 'Disaster & Legal', 'subcategory' => 'FEMA Assistance', 'service_slug' => 'disaster-and-legal--fema-assistance', 'display_name' => 'FEMA Assistance', 'url' => 'https://www.disasterassistance.gov', 'launch_type' => 'web_portal', 'jurisdiction_level' => 'Federal', 'jurisdiction_rank' => 5, 'category_sort' => 12, 'item_sort_within_category' => 1],
        ];
    }
}
