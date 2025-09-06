<?php

namespace App\Http\Controllers;

use App\Models\ExcelData;
use App\Models\NteeCode;
use App\Models\Organization;
use App\Models\UserFavoriteOrganization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use App\Services\ExcelDataTransformer;

class OrganizationController extends Controller
{
    public function index(Request $request)
    {
        // Get search parameters
        $search = $request->get('search');
        $category = $request->get('category');
        $state = $request->get('state');
        $city = $request->get('city');
        $zip = $request->get('zip');
        $page = $request->get('page', 1);
        $sort = $request->get('sort', 'id');
        $perPage = min($request->get("per_page", 6), 50); // Limit per_page to prevent abuse

        // Build the query using virtual columns for better performance
        $query = ExcelData::where('status', 'complete')
            ->whereNotIn('id', function($subQuery) {
                $subQuery->select(DB::raw('MIN(id)'))
                    ->from('excel_data')
                    ->where('status', 'complete')
                    ->groupBy('file_id');
            });

        // Search in name (using virtual column)
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name_virtual', 'LIKE', "%{$search}%")
                    ->orWhere('sort_name_virtual', 'LIKE', "%{$search}%");
            });
        }

        // Filter by category (using virtual column)
        if ($category && $category !== 'All Categories') {
            $query->whereHas('nteeCode', function ($q) use ($category) {
                $q->where('category', $category);
            });
        }

        // Filter by location (using virtual columns)
        if ($state && $state !== 'All States') {
            $query->where('state_virtual', $state);
        }

        if ($city && $city !== 'All Cities') {
            $query->where('city_virtual', $city);
        }

        if ($zip) {
            $query->where('zip_virtual', 'LIKE', "%{$zip}%");
        }

        // Apply sorting
        switch ($sort) {
            case 'name':
                $query->orderBy('name_virtual', 'asc');
                break;
            case 'state':
                $query->orderBy('state_virtual', 'asc');
                break;
            case 'city':
                $query->orderBy('city_virtual', 'asc');
                break;
            default:
                $query->orderBy('id', 'asc');
                break;
        }

        // Get only the necessary columns
        $query->select([
            'id',
            'ein',
            'row_data',
            'created_at',
            'updated_at',
            'name_virtual',
            'state_virtual',
            'city_virtual',
            'ntee_code_virtual',
            'file_id' // Added file_id for debugging purposes
        ]);

        // Get organizations with pagination
        $organizations = $query->paginate($perPage);

        // dd($organizations);

        // Get all EINs from the excel data results
        $eins = $organizations->pluck('ein')->filter()->toArray();

        // Find registered organizations with these EINs
        $registeredOrgs = [];
        $userFavorites = [];

        if (!empty($eins)) {
            $registeredOrgs = Organization::whereIn('ein', $eins)
                ->where('registration_status', 'approved')
                ->get()
                ->keyBy('ein'); // Key by EIN for easy lookup

            // Get user favorites if authenticated
            if (Auth::check() && !$registeredOrgs->isEmpty()) {
                $userFavorites = UserFavoriteOrganization::where('user_id', Auth::id())
                    ->whereIn('organization_id', $registeredOrgs->pluck('id'))
                    ->pluck('organization_id')
                    ->toArray();
            }
        }

        // Transform the data
        $transformedOrganizations = $organizations->getCollection()->map(function ($item) use ($registeredOrgs, $userFavorites) {
            $rowData = $item->row_data;
            $transformedData = ExcelDataTransformer::transform($rowData);

            // Check if this excel data organization is registered
            $isRegistered = isset($registeredOrgs[$item->ein]);

            // For registered organizations, check if they're favorited by the user
            $isFavorited = false;
            if ($isRegistered && Auth::check()) {
                $registeredOrg = $registeredOrgs[$item->ein];
                $isFavorited = in_array($registeredOrg->id, $userFavorites);
            }

            return [
                'id' => $item->id,
                'ein' => $item->ein,
                'name' => $transformedData[1] ?? $rowData[1] ?? '',
                'city' => $transformedData[4] ?? $rowData[4] ?? '',
                'state' => $transformedData[5] ?? $rowData[5] ?? '',
                'zip' => $transformedData[6] ?? $rowData[6] ?? '',
                'classification' => $transformedData[10] ?? $rowData[10] ?? '',
                'ntee_code' => $transformedData[26] ?? $rowData[26] ?? '',
                'created_at' => $item->created_at,
                'is_registered' => $isRegistered,
                'is_favorited' => $isFavorited,
            ];
        });

        $categories = NteeCode::select('category')
            ->distinct()
            ->orderBy('category')
            ->pluck('category')
            ->prepend('All Categories');

        $filterOptions = [
            'categories' => $categories->toArray(),
            'states' => $this->getStates(),
            'cities' => ['All Cities'], // Initially empty, will be loaded dynamically
        ];

        $organizations->setCollection($transformedOrganizations);

        return Inertia::render('frontend/organization/organizations', [
            'organizations' => $organizations,
            'filters' => [
                'search' => $search,
                'category' => $category,
                'state' => $state,
                'city' => $city,
                'zip' => $zip,
                'sort' => $sort,
                'per_page' => $perPage,
            ],
            'filterOptions' => $filterOptions,
            'hasActiveFilters' => $search || ($category && $category !== 'All Categories') ||
                ($state && $state !== 'All States') ||
                ($city && $city !== 'All Cities') || $zip,
        ]);
    }

    // Get states for filter options
    // private function getStates()
    // {
    //     $cacheKey = 'states_filter_v3'; // Change cache key to force refresh

    //     return cache()->remember($cacheKey, 86400, function () {
    //         return ExcelData::where('status', 'complete')
    //             ->whereRaw("JSON_EXTRACT(row_data, '$[0]') != 'EIN'")
    //             ->whereNotNull(DB::raw("JSON_EXTRACT(row_data, '$[5]')"))
    //             ->whereRaw("JSON_EXTRACT(row_data, '$[5]') != ''")
    //             ->distinct()
    //             ->orderBy(DB::raw("JSON_EXTRACT(row_data, '$[5]')"))
    //             ->pluck(DB::raw("TRIM(BOTH '\"' FROM JSON_EXTRACT(row_data, '$[5]'))")) // Remove quotes
    //             ->prepend('All States');
    //     });
    // }

    private function getStates()
    {
        $cacheKey = 'states_filter_v3';

        return cache()->remember($cacheKey, 86400, function () {
            return ExcelData::where('status', 'complete')
                ->whereNotNull('state_virtual')
                ->where('state_virtual', '!=', '')
                ->whereNotIn('id', function ($subQuery) {
                    $subQuery->select(DB::raw('MIN(id)'))
                        ->from('excel_data')
                        ->groupBy('file_id');
                })
                ->distinct()
                ->orderBy('state_virtual')
                ->pluck('state_virtual')
                ->prepend('All States');
        });
    }

    public function getCitiesByState(Request $request)
    {
        // dd(
        //     $request->all()
        // );
        $state = $request->get('state');
        $cacheKey = 'cities_filter_' . md5($state ?? 'all');

        $cities = cache()->remember($cacheKey, 3600, function () use ($state) {
            return ExcelData::where('status', 'complete')
                ->whereNotIn('id', function($subQuery) {
                    $subQuery->select(DB::raw('MIN(id)'))
                        ->from('excel_data')
                        ->where('status', 'complete')
                        ->groupBy('file_id');
                })
                ->whereNotNull('city_virtual')
                ->when($state && $state !== 'All States', function ($q) use ($state) {
                    return $q->where('state_virtual', $state);
                })
                ->distinct('city_virtual')
                ->orderBy('city_virtual')
                ->limit(200)
                ->pluck('city_virtual')
                ->prepend('All Cities');
        });

        return response()->json($cities);
    }

    public function show(string $id)
    {
        $organization = ExcelData::where('id', $id)
            ->where('status', 'complete')
            ->whereNotIn('id', function($subQuery) {
                $subQuery->select(DB::raw('MIN(id)'))
                    ->from('excel_data')
                    ->where('status', 'complete')
                    ->groupBy('file_id');
            })
            ->firstOrFail();

        $rowData = $organization->row_data;
        $transformedData = ExcelDataTransformer::transform($rowData);

        // Check if this organization is registered
        $registeredOrg = Organization::where('ein', $organization->ein)
            ->where('registration_status', 'approved')
            ->first();

        $isFav = false;
        if ($registeredOrg && Auth::check()) {
            $isFav = UserFavoriteOrganization::where('user_id', Auth::id())
                ->where('organization_id', $registeredOrg->id)
                ->exists();
        }

        $transformedOrganization = [
            'id' => $organization->id,
            'ein' => $organization->ein,
            'name' => $transformedData[1] ?? $rowData[1] ?? '',
            'ico' => $transformedData[2] ?? $rowData[2] ?? '',
            'street' => $transformedData[3] ?? $rowData[3] ?? '',
            'city' => $transformedData[4] ?? $rowData[4] ?? '',
            'state' => $transformedData[5] ?? $rowData[5] ?? '',
            'zip' => $transformedData[6] ?? $rowData[6] ?? '',
            'classification' => $transformedData[10] ?? $rowData[10] ?? '',
            'ntee_code' => $transformedData[26] ?? $rowData[26] ?? '',
            'created_at' => $organization->created_at,
            'is_registered' => (bool) $registeredOrg,
            'is_favorited' => $isFav,
            'registered_organization' => $registeredOrg,
            'description' => $registeredOrg ? $registeredOrg->description : 'This organization is listed in our database but has not yet registered for additional features.',
            'mission' => $registeredOrg ? $registeredOrg->mission : 'Mission statement not available for unregistered organizations.',
            'ruling' => $transformedData[7] ?? $rowData[7] ?? 'N/A', // Ruling year from excel data
        ];

        return Inertia::render('frontend/organization/organization-show', [
            'organization' => $transformedOrganization,
        ]);
    }

    public function toggleFavorite(Request $request, int $id)
    {
        $user = Auth::user();

        // Get the ExcelData organization
        $excelDataOrg = ExcelData::findOrFail($id);

        // Find the registered organization by EIN
        $org = Organization::where('ein', $excelDataOrg->ein)
            ->where('registration_status', 'approved')
            ->firstOrFail();

        if (!$org) {
            return redirect()->route('organizations.show', ['id' => $id])
                ->with('error', 'You can only favorite registered organizations.');
        }

        $fav = UserFavoriteOrganization::where('user_id', $user->id)
            ->where('organization_id', $org->id)
            ->first();

        if ($fav) {
            $fav->delete();
        } else {
            UserFavoriteOrganization::create([
                'user_id' => $user->id,
                'organization_id' => $org->id,
            ]);
        }

        return redirect()->route('organizations.show', ['id' => $id]);
    }
}
