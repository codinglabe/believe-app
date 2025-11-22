<?php

namespace App\Http\Controllers;

use App\Models\ExcelData;
use App\Models\FollowerPosition;
use App\Models\FollowingUserPosition;
use App\Models\NteeCode;
use App\Services\ImpactScoreService;
use App\Models\Organization;
use App\Models\UserFavoriteOrganization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use App\Services\ExcelDataTransformer;

class OrganizationController extends BaseController
{

    protected $impactScoreService;

    public function __construct(ImpactScoreService $impactScoreService)
    {
        $this->impactScoreService = $impactScoreService;
    }

    public function index(Request $request)
    {
        // $this->authorizePermission($request, 'organization.read');
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
            ->whereNotIn('id', function ($subQuery) {
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

        // $categories = NteeCode::select('category')
        //     ->distinct()
        //     ->orderBy('category')
        //     ->pluck('category')
        //     ->prepend('All Categories');

        $categories = DB::table('ntee_codes')
            ->distinct()
            ->orderBy('category')
            ->pluck('category')
            ->prepend('All Categories');

        $filterOptions = [
            'categories' => $categories,
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

    public function getCitiesByState(Request $request)
    {
        // dd(
        //     $request->all()
        // );
        $state = $request->get('state');
        $cacheKey = 'cities_filter_' . md5($state ?? 'all');

        $cities = cache()->remember($cacheKey, 3600, function () use ($state) {
            return ExcelData::where('status', 'complete')
                ->whereNotIn('id', function ($subQuery) {
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

    public function show(Request $request, string $id)
    {
        // $this->authorizePermission($request, 'organization.read');
        $organization = ExcelData::where('id', $id)
            ->where('status', 'complete')
            ->whereNotIn('id', function ($subQuery) {
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
        $notificationsEnabled = false;
        if ($registeredOrg && Auth::check()) {
            $favorite = UserFavoriteOrganization::where('user_id', Auth::id())
                ->where('organization_id', $registeredOrg->id)
                ->first();

            if ($favorite) {
                $isFav = true;
                $notificationsEnabled = $favorite->notifications;
            }
        }

        // Load user relationship for registered organization
        if ($registeredOrg) {
            $registeredOrg->load('user:id,slug,name,email');
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
            'notifications_enabled' => $notificationsEnabled,
            'registered_organization' => $registeredOrg ? [
                'id' => $registeredOrg->id,
                'name' => $registeredOrg->name,
                'user' => $registeredOrg->user ? [
                    'id' => $registeredOrg->user->id,
                    'slug' => $registeredOrg->user->slug,
                    'name' => $registeredOrg->user->name,
                    'email' => $registeredOrg->user->email,
                ] : null,
            ] : null,
            'description' => $registeredOrg ? $registeredOrg->description : 'This organization is listed in our database but has not yet registered for additional features.',
            'mission' => $registeredOrg ? $registeredOrg->mission : 'Mission statement not available for unregistered organizations.',
            'ruling' => $transformedData[7] ?? $rowData[7] ?? 'N/A', // Ruling year from excel data
        ];

        return Inertia::render('frontend/organization/organization-show', [
            'organization' => $transformedOrganization,
        ]);
    }

    /**
     * Display enrollments for an organization's courses/events
     */
    public function enrollments(Request $request, string $slug)
    {
        // Find organization by user slug
        $user = \App\Models\User::where('slug', $slug)
            ->where('role', 'organization')
            ->firstOrFail();

        $organization = Organization::where('user_id', $user->id)->firstOrFail();

        // Get all courses/events created by this organization
        $courses = \App\Models\Course::where('organization_id', $user->id)
            ->with(['topic', 'eventType'])
            ->get();

        // Get all enrollments grouped by course/event
        $enrollmentsByCourse = [];
        foreach ($courses as $course) {
            $enrollments = \App\Models\Enrollment::where('course_id', $course->id)
                ->whereIn('status', ['active', 'completed', 'pending'])
                ->with('user:id,name,email')
                ->orderBy('enrolled_at', 'desc')
                ->get();

            if ($enrollments->count() > 0) {
                $enrollmentsByCourse[] = [
                    'course' => $course,
                    'enrollments' => $enrollments,
                    'total_enrolled' => $enrollments->count(),
                ];
            }
        }

        return Inertia::render('frontend/organization/enrollments', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'user' => [
                    'slug' => $user->slug,
                ],
            ],
            'enrollmentsByCourse' => $enrollmentsByCourse,
        ]);
    }

    // public function toggleFavorite(Request $request, int $id)
    // {
    //     $user = Auth::user();

    //     // Get the ExcelData organization
    //     $excelDataOrg = ExcelData::findOrFail($id);

    //     // Find the registered organization by EIN
    //     $org = Organization::where('ein', $excelDataOrg->ein)
    //         ->where('registration_status', 'approved')
    //         ->first();

    //     if (!$org) {
    //         return redirect()->route('organizations.show', $id)
    //             ->with('error', 'You can only follow registered organizations.');
    //     }

    //     $fav = UserFavoriteOrganization::where('user_id', $user->id)
    //         ->where('organization_id', $org->id)
    //         ->first();

    //     if ($fav) {
    //         $fav->delete();
    //         return redirect()->route('organizations.show', $id)
    //             ->with('success', 'Unfollowed organization');
    //     } else {
    //         UserFavoriteOrganization::create([
    //             'user_id' => $user->id,
    //             'organization_id' => $org->id,
    //             'notifications' => true
    //         ]);

    //         return redirect()->route('organizations.show', $id)
    //             ->with('success', 'Following organization with notifications');
    //     }
    // }


    // public function toggleFavorite(Request $request, int $id)
    // {
    //     $user = Auth::user();

    //     // Get the ExcelData organization
    //     $excelDataOrg = ExcelData::findOrFail($id);

    //     // Find the registered organization by EIN
    //     $org = Organization::where('ein', $excelDataOrg->ein)
    //         ->where('registration_status', 'approved')
    //         ->first();

    //     if (!$org) {
    //         return response()->json([
    //             'success' => false,
    //             'message' => 'You can only follow registered organizations.'
    //         ], 404);
    //     }

    //     $fav = UserFavoriteOrganization::where('user_id', $user->id)
    //         ->where('organization_id', $org->id)
    //         ->first();

    //     if ($fav) {
    //         $fav->delete();
    //         return response()->json([
    //             'success' => true,
    //             'message' => 'Unfollowed organization',
    //             'is_following' => false
    //         ]);
    //     } else {
    //         // Check if user has any follower positions
    //         $hasPositions = FollowingUserPosition::where('user_id', $user->id)->exists();

    //         if (!$hasPositions) {
    //             // Always return JSON for API requests
    //             return response()->json([
    //                 'requires_positions' => true,
    //                 'organization_id' => $id,
    //                 'organization_name' => $excelDataOrg->name_virtual ?? 'Organization'
    //             ]);
    //         }

    //         // User has positions, create the favorite
    //         UserFavoriteOrganization::create([
    //             'user_id' => $user->id,
    //             'organization_id' => $org->id,
    //             'notifications' => true
    //         ]);

    //         return response()->json([
    //             'success' => true,
    //             'message' => 'Following organization with notifications',
    //             'is_following' => true
    //         ]);
    //     }
    // }

    public function toggleFavorite(Request $request, int $id)
    {
        $user = Auth::user();

        // Get the ExcelData organization
        $excelDataOrg = ExcelData::findOrFail($id);

        // Find the registered organization by EIN
        $org = Organization::where('ein', $excelDataOrg->ein)
            ->where('registration_status', 'approved')
            ->first();

        if (!$org) {
            if ($request->header('X-Inertia')) {
                return redirect()->back()->with('error', 'You can only follow registered organizations.');
            }
            return response()->json([
                'success' => false,
                'message' => 'You can only follow registered organizations.'
            ], 404);
        }

        $fav = UserFavoriteOrganization::where('user_id', $user->id)
            ->where('organization_id', $org->id)
            ->first();

        if ($fav) {
            $fav->delete();

            if ($request->header('X-Inertia')) {
                return redirect()->back()->with('success', 'Unfollowed organization');
            }

            return response()->json([
                'success' => true,
                'message' => 'Unfollowed organization',
                'is_following' => false
            ]);
        } else {
            // Check if user has any follower positions
            $hasPositions = FollowingUserPosition::where('user_id', $user->id)->exists();

            if (!$hasPositions) {
                if ($request->header('X-Inertia')) {
                    // For Inertia requests, we'll handle this differently
                    return response()->json([
                        'requires_positions' => true,
                        'organization_id' => $id,
                        'organization_name' => $excelDataOrg->name_virtual ?? 'Organization'
                    ]);
                }

                return response()->json([
                    'requires_positions' => true,
                    'organization_id' => $id,
                    'organization_name' => $excelDataOrg->name_virtual ?? 'Organization'
                ]);
            }

            // User has positions, create the favorite
            $favorite = UserFavoriteOrganization::create([
                'user_id' => $user->id,
                'organization_id' => $org->id,
                'notifications' => true
            ]);

            // Award impact points for following
            $this->impactScoreService->awardFollowPoints($favorite);

            if ($request->header('X-Inertia')) {
                return redirect()->back()->with('success', 'Following organization with notifications');
            }

            return response()->json([
                'success' => true,
                'message' => 'Following organization with notifications',
                'is_following' => true
            ]);
        }
    }

    public function savePositionsAndFollow(Request $request, int $orgId)
    {
        $user = Auth::user();

        // Validate the request
        $request->validate([
            'positions' => 'required|array|min:1',
            'positions.*.follower_position_id' => 'required|exists:follower_positions,id',
            'positions.*.experience_level' => 'required|in:beginner,intermediate,expert',
            'positions.*.years_of_experience' => 'required|integer|min:0',
            'positions.*.skills' => 'nullable|string',
            'positions.*.portfolio_url' => 'nullable|url',
        ]);

        // Delete existing positions for this user
        FollowingUserPosition::where('user_id', $user->id)->delete();

        // Save new positions
        foreach ($request->positions as $positionData) {
            FollowingUserPosition::create([
                'user_id' => $user->id,
                'follower_position_id' => $positionData['follower_position_id'],
                'experience_level' => $positionData['experience_level'],
                'years_of_experience' => $positionData['years_of_experience'],
                'skills' => $positionData['skills'] ?? null,
                'portfolio_url' => $positionData['portfolio_url'] ?? null,
                'is_primary' => $positionData['is_primary'] ?? false,
            ]);
        }

        // Get the ExcelData organization
        $excelDataOrg = ExcelData::findOrFail($orgId);

        // Find the registered organization by EIN
        $org = Organization::where('ein', $excelDataOrg->ein)
            ->where('registration_status', 'approved')
            ->first();

        if (!$org) {
            return response()->json([
                'success' => false,
                'message' => 'Organization not found'
            ], 404);
        }

        // Create the favorite
        UserFavoriteOrganization::create([
            'user_id' => $user->id,
            'organization_id' => $org->id,
            'notifications' => true
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Following organization with notifications',
            'redirect_url' => route('organizations.show', $orgId)
        ]);
    }

    public function getPositionsForSelection()
    {
        $positions = FollowerPosition::where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->groupBy('category');

        $userPositions = FollowingUserPosition::where('user_id', Auth::id())
            ->with('followerPosition')
            ->get();


        return response()->json([
            'all_positions' => $positions,
            'user_positions' => $userPositions
        ]);
    }

    public function toggleNotifications(Request $request, int $id)
    {
        $user = Auth::user();

        // Get the ExcelData organization
        $excelDataOrg = ExcelData::findOrFail($id);

        // Find the registered organization by EIN
        $org = Organization::where('ein', $excelDataOrg->ein)
            ->where('registration_status', 'approved')
            ->first();

        if (!$org) {
            return redirect()->route('organizations.show', $id)
                ->with('error', 'Organization not found');
        }

        $fav = UserFavoriteOrganization::where('user_id', $user->id)
            ->where('organization_id', $org->id)
            ->first();

        if (!$fav) {
            return redirect()->route('organizations.show', $id)
                ->with('error', 'You are not following this organization');
        }

        $fav->update([
            'notifications' => !$fav->notifications
        ]);

        $message = $fav->notifications ? 'Notifications enabled' : 'Notifications disabled';

        return redirect()->route('organizations.show', $id)
            ->with('success', $message);
    }
}
