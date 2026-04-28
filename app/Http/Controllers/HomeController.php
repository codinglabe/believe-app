<?php

namespace App\Http\Controllers;

use App\Models\Donation;
use App\Models\ExcelData;
use App\Models\GiftCard;
use App\Models\MerchantHubMerchant;
use App\Models\NteeCode;
use App\Models\Organization;
use App\Models\Raffle;
use App\Services\ExcelDataTransformer;
use App\Services\SeoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class HomeController extends Controller
{
    public function index(Request $request)
    {
        // Get filter options for search
        // $categories = NteeCode::select('category')
        //     ->distinct()
        //     ->orderBy('category')
        //     ->pluck('category')
        //     ->prepend('All Categories')
        //     ->toArray(); // Convert to array

        $categories = DB::table('ntee_codes')
            ->distinct()
            ->orderBy('category')
            ->pluck('category')
            ->prepend('All Categories');

        // Featured organizations: show real organizations ranked by total raised (from donations)
        $successfulStatuses = ['completed', 'active'];

        $topOrgDonationRows = Donation::query()
            ->whereIn('status', $successfulStatuses)
            ->whereNotNull('organization_id')
            ->selectRaw('organization_id, SUM(amount) as total_amount')
            ->groupBy('organization_id')
            ->orderByDesc('total_amount')
            ->take(6)
            ->get();

        $topOrgIds = $topOrgDonationRows->pluck('organization_id')->all();

        $approvedOrgsById = Organization::query()
            ->whereIn('id', $topOrgIds)
            ->where('registration_status', 'approved')
            ->with(['user:id,slug'])
            ->select('id', 'ein', 'name', 'description', 'city', 'state', 'zip', 'user_id')
            ->get()
            ->keyBy('id');

        $excelRowsByEin = ExcelData::query()
            ->where('status', 'complete')
            ->where('ein', '!=', 'EIN')
            ->whereNotNull('ein')
            ->whereIn('ein', $approvedOrgsById->pluck('ein')->filter()->all())
            ->select('id', 'ein', 'row_data', 'created_at', 'name_virtual', 'city_virtual', 'state_virtual', 'zip_virtual', 'ntee_code_virtual')
            ->get()
            ->keyBy('ein');

        $transformedOrganizations = $topOrgDonationRows->map(function ($row) use ($approvedOrgsById, $excelRowsByEin) {
            $org = $approvedOrgsById->get((int) $row->organization_id);
            if (! $org) {
                return null;
            }

            $totalRaisedCents = (int) ($row->total_amount ?? 0);
            $totalRaised = '$'.number_format($totalRaisedCents / 100, 0);

            $excel = $org->ein ? ($excelRowsByEin->get($org->ein) ?? null) : null;
            $rowData = $excel?->row_data ?? [];

            $fallbackName = $excel?->name_virtual ?? ($rowData[1] ?? '');
            $name = trim((string) ($org->name ?: $fallbackName));

            // OrganizationController@show accepts ExcelData id OR user slug
            $orgShowKey = $excel?->id ?? ($org->user?->slug ?? (string) $org->id);

            return [
                'id' => (int) ($excel?->id ?? 0),
                'ein' => $org->ein,
                'name' => $name !== '' ? $name : 'Organization',
                'city' => $org->city ?: ($excel?->city_virtual ?? ($rowData[4] ?? '')),
                'state' => $org->state ?: ($excel?->state_virtual ?? ($rowData[5] ?? '')),
                'zip' => $org->zip ?: ($excel?->zip_virtual ?? ($rowData[6] ?? '')),
                'ntee_code' => $excel?->ntee_code_virtual ?? ($rowData[26] ?? ''),
                'created_at' => $excel?->created_at,
                'verified' => true,
                'description' => $org->description ?: null,
                'total_raised' => $totalRaised,
                'url' => route('organizations.show', (string) $orgShowKey),
            ];
        })->filter()->values();

        // Fallback: if no donations yet, show latest orgs
        if ($transformedOrganizations->isEmpty()) {
            $featuredOrganizations = ExcelData::where('status', 'complete')
                ->where('ein', '!=', 'EIN')
                ->whereNotNull('ein')
                ->orderBy('id', 'desc')
                ->take(6)
                ->get();

            $transformedOrganizations = $featuredOrganizations->map(function ($item) {
                $rowData = $item->row_data;

                return [
                    'id' => $item->id,
                    'ein' => $item->ein,
                    'name' => trim((string) ($item->name_virtual ?? $rowData[1] ?? '')) ?: 'Organization',
                    'city' => $item->city_virtual ?? $rowData[4] ?? '',
                    'state' => $item->state_virtual ?? $rowData[5] ?? '',
                    'zip' => $item->zip_virtual ?? $rowData[6] ?? '',
                    'classification' => $rowData[10] ?? '',
                    'ntee_code' => $item->ntee_code_virtual ?? $rowData[26] ?? '',
                    'created_at' => $item->created_at,
                    'verified' => false,
                    'description' => null,
                    'total_raised' => '$0',
                    'url' => route('organizations.show', (string) $item->id),
                ];
            });
        }

        // Active raffles (soonest draw date first)
        $activeRaffles = Raffle::query()
            ->where('status', 'active')
            ->where('draw_date', '>', now())
            ->orderBy('draw_date')
            ->take(3)
            ->get()
            ->map(function (Raffle $raffle) {
                $total = (int) ($raffle->total_tickets ?? 0);
                $sold = (int) ($raffle->sold_tickets ?? 0);
                $pct = $total > 0 ? (int) round(min(100, ($sold / $total) * 100)) : 0;

                return [
                    'id' => $raffle->id,
                    'title' => $raffle->title,
                    'ticket_price' => (string) $raffle->ticket_price,
                    'total_tickets' => $total,
                    'sold_tickets' => $sold,
                    'progress' => $pct,
                    'sold_text' => number_format($sold)." / ".number_format($total)." Tickets Sold",
                    'percent_text' => $pct.'% Sold',
                    'draw_date' => optional($raffle->draw_date)->toIso8601String(),
                    'end_at_ms' => optional($raffle->draw_date)->getTimestamp() ? optional($raffle->draw_date)->getTimestamp() * 1000 : null,
                    'image' => $raffle->image,
                ];
            });

        // Featured merchants (Merchant Hub)
        $featuredMerchants = MerchantHubMerchant::query()
            ->where('is_active', true)
            ->withCount(['offers' => function ($q) {
                $q->active();
            }])
            ->orderByDesc('offers_count')
            ->take(4)
            ->get()
            ->map(function (MerchantHubMerchant $m) {
                return [
                    'id' => $m->id,
                    'name' => $m->name,
                    'slug' => $m->slug,
                    'logo_url' => $m->logo_url,
                    'offers_count' => (int) $m->offers_count,
                ];
            });

        // Gift card brands (from real purchases)
        $giftCardBrands = GiftCard::query()
            ->whereNotNull('brand_name')
            ->where('brand_name', '!=', '')
            ->selectRaw('brand_name, COUNT(*) as purchases, MIN(amount) as min_amount, MAX(amount) as max_amount')
            ->groupBy('brand_name')
            ->orderByDesc('purchases')
            ->take(5)
            ->get()
            ->map(function ($row) {
                $min = (float) ($row->min_amount ?? 0);
                $max = (float) ($row->max_amount ?? 0);

                $range = $min > 0 && $max > 0
                    ? 'From $'.number_format($min, 0).' - $'.number_format($max, 0)
                    : 'Available amounts vary';

                return [
                    'name' => (string) $row->brand_name,
                    'range' => $range,
                    'purchases' => (int) $row->purchases,
                ];
            });

        // Homepage stats (real totals)
        $successfulStatuses = ['completed', 'active'];
        $totalRaisedCents = (int) Donation::query()
            ->whereIn('status', $successfulStatuses)
            ->sum('amount');
        $totalRaised = '$'.number_format($totalRaisedCents / 100, 0);

        $livesImpacted = (int) Donation::query()
            ->whereIn('status', $successfulStatuses)
            ->distinct('user_id')
            ->count('user_id');

        $organizationsSupported = (int) Donation::query()
            ->whereIn('status', $successfulStatuses)
            ->whereNotNull('organization_id')
            ->distinct('organization_id')
            ->count('organization_id');

        $merchantsPartnered = (int) MerchantHubMerchant::query()
            ->where('is_active', true)
            ->count();

        return Inertia::render('frontend/home', [
            'seo' => SeoService::forPage('home'),
            'filters' => [
                'search' => $request->get('search', ''),
                'category' => $request->get('category', 'All Categories'),
                'state' => $request->get('state', 'All States'),
                'city' => $request->get('city', 'All Cities'),
                'zip' => $request->get('zip', ''),
            ],
            'filterOptions' => [
                'categories' => $categories,
                'states' => $this->getStates()->toArray(), // Convert to array
                'cities' => ['All Cities'],
            ],
            'featuredOrganizations' => $transformedOrganizations,
            'featuredMerchants' => $featuredMerchants,
            'giftCardBrands' => $giftCardBrands,
            'activeRaffles' => $activeRaffles,
            'stats' => [
                'totalRaised' => $totalRaised,
                'livesImpacted' => number_format($livesImpacted),
                'organizationsSupported' => number_format($organizationsSupported),
                'merchantsPartnered' => number_format($merchantsPartnered),
            ],
        ]);
    }

    private function getStates()
    {
        // Static list of all U.S. States and Territories abbreviations only
        $statesAndTerritories = [
            'AL',
            'AK',
            'AZ',
            'AR',
            'CA',
            'CO',
            'CT',
            'DE',
            'FL',
            'GA',
            'HI',
            'ID',
            'IL',
            'IN',
            'IA',
            'KS',
            'KY',
            'LA',
            'ME',
            'MD',
            'MA',
            'MI',
            'MN',
            'MS',
            'MO',
            'MT',
            'NE',
            'NV',
            'NH',
            'NJ',
            'NM',
            'NY',
            'NC',
            'ND',
            'OH',
            'OK',
            'OR',
            'PA',
            'RI',
            'SC',
            'SD',
            'TN',
            'TX',
            'UT',
            'VT',
            'VA',
            'WA',
            'WV',
            'WI',
            'WY',
            'DC',
            'AS',
            'GU',
            'MP',
            'PR',
            'VI'
        ];

        // Create a collection with just the abbreviations, sorted alphabetically
        $statesCollection = collect($statesAndTerritories)
            ->sort()
            ->values() // Reset keys to maintain proper order
            ->prepend('All States');

        return $statesCollection;
    }

    /**
     * Original getStates method - commented out and replaced with static list
     * This method previously queried the database for states from organization data
     *
    */
    // private function getStates()
    // {
    //     $cacheKey = 'states_filter_v3';

    //     return cache()->remember($cacheKey, 86400, function () {
    //         return ExcelData::where('status', 'complete')
    //             ->whereNotNull('state_virtual')
    //             ->where('state_virtual', '!=', '')
    //             ->whereNotIn('id', function ($subQuery) {
    //                 $subQuery->select(DB::raw('MIN(id)'))
    //                     ->from('excel_data')
    //                     ->groupBy('file_id');
    //             })
    //             ->distinct()
    //             ->orderBy('state_virtual')
    //             ->pluck('state_virtual')
    //             ->prepend('All States');
    //     });
    // }

}
