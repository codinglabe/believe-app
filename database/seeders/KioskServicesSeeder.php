<?php

namespace Database\Seeders;

use App\Models\KioskService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

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
        $itemCounter = [];
        $categorySortMap = [
            'pay-bills' => 1,
            'healthcare' => 2,
            'government' => 3,
            'find-a-job' => 4,
            'financial' => 5,
            'community-help' => 6,
            'housing-assistance' => 7,
            'education' => 8,
            'veteran-services' => 9,
            'food-and-family' => 10,
            'transportation' => 11,
            'disaster-and-legal' => 12,
        ];

        foreach ($rows as $i => $row) {
            $categoryName = (string) ($row['category'] ?? '');
            $categorySlug = $this->categoryToSlug[$categoryName] ?? Str::slug($categoryName);
            $serviceSlug = (string) ($row['service_slug'] ?? '');
            if ($serviceSlug === '') {
                $serviceSlug = $categorySlug.'--'.Str::slug((string) ($row['subcategory'] ?? $row['display_name'] ?? 'item-'.($i + 1)));
            }
            $itemCounter[$categorySlug] = ($itemCounter[$categorySlug] ?? 0) + 1;

            $url = $this->nullableString($row['url'] ?? null);
            $launchType = $url ? 'web_portal' : 'internal_app';

            KioskService::updateOrCreate(
                [
                    'market_code' => (string) ($row['market_code'] ?? 'LA-IBERIA-JEANERETTE'),
                    'service_slug' => $serviceSlug,
                ],
                [
                    'state' => (string) ($row['state'] ?? 'Louisiana'),
                    'parish' => $this->nullableString($row['parish'] ?? null),
                    'city' => (string) ($row['city'] ?? 'Jeanerette'),
                    'category_slug' => $categorySlug,
                    'subcategory' => $this->nullableString($row['subcategory'] ?? null),
                    'display_name' => (string) ($row['display_name'] ?? ''),
                    'url' => $url,
                    'launch_type' => $launchType,
                    'jurisdiction_level' => $this->nullableString($row['jurisdiction_level'] ?? null),
                    'jurisdiction_rank' => (int) ($row['jurisdiction_rank'] ?? 7),
                    'category_sort' => (int) ($row['category_sort'] ?? ($categorySortMap[$categorySlug] ?? 99)),
                    'item_sort_within_category' => (int) ($row['item_sort_within_category'] ?? $itemCounter[$categorySlug]),
                    'is_active' => $this->toBool($row['active'] ?? true),
                    'allow_webview' => $this->toBool($row['allow_webview'] ?? true),
                    'enable_redirect_tracking' => $this->toBool($row['enable_redirect_tracking'] ?? false),
                    'internal_product' => $this->nullableString($row['internal_product'] ?? null),
                    'notes' => $this->nullableString($row['notes'] ?? null),
                ]
            );
        }
    }

    protected function getJeaneretteRows(): array
    {
        return [
            ['category' => 'Pay Bills', 'subcategory' => 'Electricity (Cleco)', 'display_name' => 'Electricity (Cleco)', 'url' => 'https://www.cleco.com'],
            ['category' => 'Pay Bills', 'subcategory' => 'Electricity (Entergy Louisiana)', 'display_name' => 'Electricity (Entergy Louisiana)', 'url' => 'https://www.entergy-louisiana.com'],
            ['category' => 'Pay Bills', 'subcategory' => 'Water (City of Jeanerette)', 'display_name' => 'Water (City of Jeanerette)', 'url' => 'http://www.jeanerette.com'],
            ['category' => 'Pay Bills', 'subcategory' => 'Gas (Atmos Energy)', 'display_name' => 'Gas (Atmos Energy)', 'url' => 'https://www.atmosenergy.com'],
            ['category' => 'Pay Bills', 'subcategory' => 'Phone/Internet (AT&T)', 'display_name' => 'Phone/Internet (AT&T)', 'url' => 'https://www.att.com'],
            ['category' => 'Healthcare', 'subcategory' => 'Medicaid (Healthy Louisiana)', 'display_name' => 'Medicaid (Healthy Louisiana)', 'url' => 'https://www.healthy.la.gov'],
            ['category' => 'Healthcare', 'subcategory' => 'Find Local Clinics', 'display_name' => 'Find Local Clinics', 'url' => 'https://ldh.la.gov'],
            ['category' => 'Healthcare', 'subcategory' => 'Telehealth (Ochsner Health)', 'display_name' => 'Telehealth (Ochsner Health)', 'url' => 'https://www.ochsner.org'],
            ['category' => 'Healthcare', 'subcategory' => 'Prescription Help (GoodRx)', 'display_name' => 'Prescription Help (GoodRx)', 'url' => 'https://www.goodrx.com'],
            ['category' => 'Healthcare', 'subcategory' => 'Mental Health Services', 'display_name' => 'Mental Health Services', 'url' => 'https://ldh.la.gov/page/mental-health'],
            ['category' => 'Government', 'subcategory' => 'Benefits (CAFÉ Portal)', 'display_name' => 'Benefits (CAFÉ Portal)', 'url' => 'https://cafe-cp.dcfs.la.gov'],
            ['category' => 'Government', 'subcategory' => 'DMV Services (OMV)', 'display_name' => 'DMV Services (OMV)', 'url' => 'https://www.expresslane.org'],
            ['category' => 'Government', 'subcategory' => 'Local Parish Services (Iberia Parish)', 'display_name' => 'Local Parish Services (Iberia Parish)', 'url' => 'https://iberiaparishgovernment.com'],
            ['category' => 'Government', 'subcategory' => 'Louisiana.gov Portal', 'display_name' => 'Louisiana.gov Portal', 'url' => 'https://www.louisiana.gov'],
            ['category' => 'Government', 'subcategory' => 'Tax Filing (LA Dept of Revenue)', 'display_name' => 'Tax Filing (LA Dept of Revenue)', 'url' => 'https://revenue.louisiana.gov'],
            ['category' => 'Jobs', 'subcategory' => 'Louisiana Workforce Commission', 'display_name' => 'Louisiana Workforce Commission', 'url' => 'https://www.louisianaworks.net'],
            ['category' => 'Jobs', 'subcategory' => 'Local Job Listings', 'display_name' => 'Local Job Listings', 'url' => 'https://www.indeed.com'],
            ['category' => 'Jobs', 'subcategory' => 'State Civil Service Jobs', 'display_name' => 'State Civil Service Jobs', 'url' => 'https://www.civilservice.louisiana.gov'],
            ['category' => 'Jobs', 'subcategory' => 'Resume Builder', 'display_name' => 'Resume Builder', 'url' => 'https://www.canva.com/resumes'],
            ['category' => 'Jobs', 'subcategory' => 'Gig Work (DoorDash/Uber)', 'display_name' => 'Gig Work (DoorDash/Uber)', 'url' => 'https://www.doordash.com'],
            ['category' => 'Financial', 'subcategory' => 'Link Bank (Plaid-style flow)', 'display_name' => 'Link Bank (Plaid-style flow)', 'url' => null, 'internal_product' => 'believe-wallet'],
            ['category' => 'Financial', 'subcategory' => 'Send Money (Cash App)', 'display_name' => 'Send Money (Cash App)', 'url' => 'https://cash.app'],
            ['category' => 'Financial', 'subcategory' => 'PayPal', 'display_name' => 'PayPal', 'url' => 'https://www.paypal.com'],
            ['category' => 'Financial', 'subcategory' => 'Credit Check (Credit Karma)', 'display_name' => 'Credit Check (Credit Karma)', 'url' => 'https://www.creditkarma.com'],
            ['category' => 'Financial', 'subcategory' => 'Financial Education (MyMoney.gov)', 'display_name' => 'Financial Education (MyMoney.gov)', 'url' => 'https://www.mymoney.gov'],
            ['category' => 'Community Help', 'subcategory' => 'United Way (Local Help)', 'display_name' => 'United Way (Local Help)', 'url' => 'https://www.211.org'],
            ['category' => 'Community Help', 'subcategory' => 'Local Nonprofits', 'display_name' => 'Local Nonprofits', 'url' => 'https://www.guidestar.org'],
            ['category' => 'Community Help', 'subcategory' => 'Volunteer Opportunities', 'display_name' => 'Volunteer Opportunities', 'url' => 'https://www.volunteermatch.org'],
            ['category' => 'Community Help', 'subcategory' => 'Donation Requests', 'display_name' => 'Donation Requests', 'url' => null, 'internal_product' => 'believe-fundme'],
            ['category' => 'Community Help', 'subcategory' => 'Churches Near Me', 'display_name' => 'Churches Near Me', 'url' => 'https://www.churchfinder.com'],
            ['category' => 'Housing', 'subcategory' => 'Section 8 (HUD)', 'display_name' => 'Section 8 (HUD)', 'url' => 'https://www.hud.gov'],
            ['category' => 'Housing', 'subcategory' => 'Louisiana Housing Corp', 'display_name' => 'Louisiana Housing Corp', 'url' => 'https://www.lhc.la.gov'],
            ['category' => 'Housing', 'subcategory' => 'Rent Assistance', 'display_name' => 'Rent Assistance', 'url' => 'https://www.211.org'],
            ['category' => 'Housing', 'subcategory' => 'Affordable Housing Search', 'display_name' => 'Affordable Housing Search', 'url' => 'https://www.affordablehousing.com'],
            ['category' => 'Housing', 'subcategory' => 'Homeless Assistance', 'display_name' => 'Homeless Assistance', 'url' => 'https://endhomelessness.org'],
            ['category' => 'Education', 'subcategory' => 'Stuttie Platform', 'display_name' => 'Stuttie Platform', 'url' => null, 'internal_product' => 'stuttie'],
            ['category' => 'Education', 'subcategory' => 'Louisiana Schools Info', 'display_name' => 'Louisiana Schools Info', 'url' => 'https://www.louisianabelieves.com'],
            ['category' => 'Education', 'subcategory' => 'GED Programs', 'display_name' => 'GED Programs', 'url' => 'https://www.hiset.org'],
            ['category' => 'Education', 'subcategory' => 'Scholarships', 'display_name' => 'Scholarships', 'url' => 'https://www.fastweb.com'],
            ['category' => 'Education', 'subcategory' => 'Online Courses', 'display_name' => 'Online Courses', 'url' => 'https://www.coursera.org'],
            ['category' => 'Veterans', 'subcategory' => 'VA Benefits', 'display_name' => 'VA Benefits', 'url' => 'https://www.va.gov'],
            ['category' => 'Veterans', 'subcategory' => 'Healthcare (VA)', 'display_name' => 'Healthcare (VA)', 'url' => 'https://www.va.gov/health-care'],
            ['category' => 'Veterans', 'subcategory' => 'Disability Claims', 'display_name' => 'Disability Claims', 'url' => 'https://www.va.gov/disability'],
            ['category' => 'Veterans', 'subcategory' => 'Job Support', 'display_name' => 'Job Support', 'url' => 'https://www.va.gov/careers-employment'],
            ['category' => 'Veterans', 'subcategory' => 'Housing', 'display_name' => 'Housing', 'url' => 'https://www.va.gov/housing-assistance'],
            ['category' => 'Food & Family', 'subcategory' => 'SNAP / Food Stamps', 'display_name' => 'SNAP / Food Stamps', 'url' => 'https://dcfs.la.gov'],
            ['category' => 'Food & Family', 'subcategory' => 'WIC Program', 'display_name' => 'WIC Program', 'url' => 'https://ldh.la.gov'],
            ['category' => 'Food & Family', 'subcategory' => 'Food Banks', 'display_name' => 'Food Banks', 'url' => 'https://www.feedingamerica.org'],
            ['category' => 'Food & Family', 'subcategory' => 'Childcare Help', 'display_name' => 'Childcare Help', 'url' => 'https://louisianabelieves.com'],
            ['category' => 'Food & Family', 'subcategory' => 'Family Services', 'display_name' => 'Family Services', 'url' => 'https://www.211.org'],
            ['category' => 'Transportation', 'subcategory' => 'Local Transit Info', 'display_name' => 'Local Transit Info', 'url' => 'https://www.iberiaparishgovernment.com'],
            ['category' => 'Transportation', 'subcategory' => 'DMV / Vehicle Services', 'display_name' => 'DMV / Vehicle Services', 'url' => 'https://www.expresslane.org'],
            ['category' => 'Transportation', 'subcategory' => 'Rideshare (Uber)', 'display_name' => 'Rideshare (Uber)', 'url' => 'https://www.uber.com'],
            ['category' => 'Transportation', 'subcategory' => 'Medical Transport', 'display_name' => 'Medical Transport', 'url' => 'https://www.modivcare.com'],
            ['category' => 'Transportation', 'subcategory' => 'Bus Info (Acadiana Regional)', 'display_name' => 'Bus Info (Acadiana Regional)', 'url' => 'https://www.arcgisa.org'],
            ['category' => 'Disaster & Legal', 'subcategory' => 'FEMA Assistance', 'display_name' => 'FEMA Assistance', 'url' => 'https://www.disasterassistance.gov'],
            ['category' => 'Disaster & Legal', 'subcategory' => 'Legal Aid Louisiana', 'display_name' => 'Legal Aid Louisiana', 'url' => 'https://www.lalegalhelp.org'],
            ['category' => 'Disaster & Legal', 'subcategory' => 'Eviction Help', 'display_name' => 'Eviction Help', 'url' => 'https://www.consumerfinance.gov'],
            ['category' => 'Disaster & Legal', 'subcategory' => 'Immigration Help', 'display_name' => 'Immigration Help', 'url' => 'https://www.uscis.gov'],
            ['category' => 'Disaster & Legal', 'subcategory' => 'Insurance Claims', 'display_name' => 'Insurance Claims', 'url' => 'https://www.ldi.la.gov'],
        ];
    }

    protected function toBool(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        $v = strtolower(trim((string) $value));
        return in_array($v, ['1', 'true', 'yes', 'y'], true);
    }

    protected function nullableString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $str = trim((string) $value);
        return $str === '' ? null : $str;
    }
}
