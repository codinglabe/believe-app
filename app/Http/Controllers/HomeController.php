<?php

namespace App\Http\Controllers;

use App\Models\ExcelData;
use App\Models\NteeCode;
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

        // Get featured organizations (latest 6 verified organizations)
        // Optimized: Use simple filter instead of expensive subquery
        $featuredOrganizations = ExcelData::where('status', 'complete')
            ->where('ein', '!=', 'EIN')
            ->whereNotNull('ein')
            ->orderBy('id', 'desc')
            ->take(6) // Limit to 6 featured organizations
            ->get();

        // Optimized: Use virtual columns directly instead of expensive transformer
        $transformedOrganizations = $featuredOrganizations->map(function ($item) {
            $rowData = $item->row_data;

            return [
                'id' => $item->id,
                'ein' => $item->ein,
                'name' => $item->name_virtual ?? $rowData[1] ?? '',
                'city' => $item->city_virtual ?? $rowData[4] ?? '',
                'state' => $item->state_virtual ?? $rowData[5] ?? '',
                'zip' => $item->zip_virtual ?? $rowData[6] ?? '',
                'classification' => $rowData[10] ?? '',
                'ntee_code' => $item->ntee_code_virtual ?? $rowData[26] ?? '',
                'created_at' => $item->created_at,
            ];
        });

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
