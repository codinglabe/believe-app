<?php

namespace App\Http\Controllers;

use App\Models\ExcelData;
use App\Models\FollowerPosition;
use App\Models\FollowingUserPosition;
use App\Models\NteeCode;
use App\Services\ImpactScoreService;
use App\Models\Organization;
use App\Models\UserFavoriteOrganization;
use App\Services\OpenAiService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use App\Jobs\SendOrganizationInviteJob;
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
    // Get search parameters - ADD category_description
    $search = $request->get('search');
    $category = $request->get('category');
    $categoryDescription = $request->get('category_description'); // Add this
    $state = $request->get('state');
    $city = $request->get('city');
    $zip = $request->get('zip');
    $page = $request->get('page', 1);
    $sort = $request->get('sort', 'id');
    $perPage = min($request->get("per_page", 6), 50);

    // Optimized query
    $query = ExcelData::where('status', 'complete')
        ->where('ein', '!=', 'EIN')
        ->whereNotNull('ein');

    // Optimized search
    if ($search) {
        $query->where(function ($q) use ($search) {
            $q->where('name_virtual', 'LIKE', '%' . $search . '%')
              ->orWhere('sort_name_virtual', 'LIKE', '%' . $search . '%');
        });
    }

    // Optimized category filter
    if ($category && $category !== 'All Categories') {
        $query->join('ntee_codes', 'excel_data.ntee_code_virtual', '=', 'ntee_codes.ntee_codes')
              ->where('ntee_codes.category', $category);
    }

    // NEW: Filter by category description
    if ($categoryDescription && $categoryDescription !== 'All Descriptions') {
        // If not already joined for category filter, join the table
        if (!str_contains($query->toSql(), 'ntee_codes')) {
            $query->join('ntee_codes', 'excel_data.ntee_code_virtual', '=', 'ntee_codes.ntee_codes');
        }
        $query->where('ntee_codes.description', $categoryDescription);
    }

    // Filter by location
    if ($state && $state !== 'All States') {
        $query->where('state_virtual', $state);
    }

    if ($city && $city !== 'All Cities') {
        $query->where('city_virtual', $city);
    }

    if ($zip) {
        if (strlen($zip) >= 3) {
            $query->where('zip_virtual', 'LIKE', $zip . '%');
        } else {
            $query->where('zip_virtual', 'LIKE', '%' . $zip . '%');
        }
    }

    // Continue with the rest of your existing code...
    $query->select([
        'excel_data.id',
        'excel_data.ein',
        'excel_data.row_data',
        'excel_data.created_at',
        'excel_data.updated_at',
        'excel_data.name_virtual',
        'excel_data.state_virtual',
        'excel_data.city_virtual',
        'excel_data.ntee_code_virtual',
        'excel_data.zip_virtual',
        'excel_data.file_id'
    ]);

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

    // Get organizations with pagination
    $organizations = $query->paginate($perPage);

    // Get all EINs from the excel data results
    $eins = $organizations->pluck('ein')->filter()->toArray();

    // Find registered organizations with these EINs
    $registeredOrgs = [];
    $userFavorites = [];

    if (!empty($eins)) {
        $registeredOrgs = Organization::whereIn('ein', $eins)
            ->where('registration_status', 'approved')
            ->get()
            ->keyBy('ein');

        // Get user favorites if authenticated
        if (Auth::check() && !$registeredOrgs->isEmpty()) {
            $userFavorites = UserFavoriteOrganization::where('user_id', Auth::id())
                ->whereIn('organization_id', $registeredOrgs->pluck('id'))
                ->pluck('organization_id')
                ->toArray();
        }
    }

    // Get NTEE codes and their categories/descriptions for the organizations
    $nteeCodes = $organizations->pluck('ntee_code_virtual')->filter()->toArray();
    $nteeCategories = [];
    $nteeDescriptions = [];

    if (!empty($nteeCodes)) {
        $nteeData = NteeCode::whereIn('ntee_codes', $nteeCodes)
            ->select('ntee_codes', 'category', 'description')
            ->get()
            ->keyBy('ntee_codes');

        $nteeCategories = $nteeData->pluck('category', 'ntee_codes')->toArray();
        $nteeDescriptions = $nteeData->pluck('description', 'ntee_codes')->toArray();
    }

    // Transform the data
    $transformedOrganizations = $organizations->getCollection()->map(function ($item) use ($registeredOrgs, $userFavorites, $nteeCategories, $nteeDescriptions) {
        $rowData = $item->row_data;
        $nteeCode = $item->ntee_code_virtual ?? $rowData[26] ?? '';

        // Get NTEE category and description
        $nteeCategory = '';
        $nteeDescription = '';
        if ($nteeCode && isset($nteeCategories[$nteeCode])) {
            $nteeCategory = $nteeCategories[$nteeCode];
            $nteeDescription = $nteeDescriptions[$nteeCode] ?? '';
        }

        // Format NTEE code with category
        $formattedNteeCode = $nteeCode;
        if ($nteeCode && $nteeCategory) {
            $formattedNteeCode = $nteeCode . " - " . $nteeCategory;
        }

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
            'name' => $item->name_virtual ?? $rowData[1] ?? '',
            'city' => $item->city_virtual ?? $rowData[4] ?? '',
            'state' => $item->state_virtual ?? $rowData[5] ?? '',
            'zip' => $item->zip_virtual ?? $rowData[6] ?? '',
            'classification' => $rowData[10] ?? '',
            'ntee_code' => $formattedNteeCode,
            'ntee_code_raw' => $nteeCode,
            'ntee_category' => $nteeCategory,
            'ntee_category_description' => $nteeDescription, // Add this
            'created_at' => $item->created_at,
            'is_registered' => $isRegistered,
            'is_favorited' => $isFavorited,
        ];
    });

    // Cache filter options - ADD categoryDescriptions
    $categories = cache()->remember('orgs_categories', 3600, function () {
        return DB::table('ntee_codes')
            ->distinct()
            ->orderBy('category')
            ->pluck('category')
            ->prepend('All Categories');
    });

    $categoryDescriptions = cache()->remember('orgs_category_descriptions', 3600, function () {
        return DB::table('ntee_codes')
            ->distinct()
            ->orderBy('description')
            ->pluck('description')
            ->prepend('All Descriptions');
    });

    $filterOptions = [
        'categories' => $categories,
        'categoryDescriptions' => $categoryDescriptions, // Add this
        'states' => $this->getStates(),
        'cities' => ['All Cities'],
    ];

    $organizations->setCollection($transformedOrganizations);

    return Inertia::render('frontend/organization/organizations', [
        'organizations' => $organizations,
        'filters' => [
            'search' => $search,
            'category' => $category,
            'category_description' => $categoryDescription, // Add this
            'state' => $state,
            'city' => $city,
            'zip' => $zip,
            'sort' => $sort,
            'per_page' => $perPage,
        ],
        'filterOptions' => $filterOptions,
        'hasActiveFilters' => $search || ($category && $category !== 'All Categories') ||
            ($categoryDescription && $categoryDescription !== 'All Descriptions') || // Add this
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
                ->where('ein', '!=', 'EIN')
                ->whereNotNull('ein')
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
        // Ultra-fast lookup: Try direct ID first (most common case, uses primary key index)
        $organization = ExcelData::where('id', $id)
            ->where('status', 'complete')
            ->select('id', 'ein', 'row_data', 'created_at', 'updated_at') // Only select needed columns
            ->first();
        
        $registeredOrg = null;
        
        if ($organization) {
            // If found by ID, check if registered (single query with eager load)
            $registeredOrg = Organization::where('ein', $organization->ein)
                ->where('registration_status', 'approved')
                ->with('user:id,slug,name,email,image,cover_img')
                ->first();
        } else {
            // Fallback: Try by user slug (less common)
            $user = \App\Models\User::where('slug', $id)->select('id', 'slug')->first();
            
            if ($user) {
                $registeredOrg = Organization::where('user_id', $user->id)
                    ->where('registration_status', 'approved')
                    ->with('user:id,slug,name,email,image,cover_img')
                    ->select('id', 'ein', 'user_id', 'name', 'description', 'mission', 'website', 'phone', 'email', 'contact_name', 'contact_title', 'social_accounts', 'city', 'state')
                    ->first();
                
                if ($registeredOrg) {
                    // Find ExcelData by EIN - use limit 1 for speed
                    $organization = ExcelData::where('ein', $registeredOrg->ein)
                        ->where('status', 'complete')
                        ->select('id', 'ein', 'row_data', 'created_at', 'updated_at')
                        ->orderBy('id', 'desc')
                        ->limit(1)
                        ->first();
                }
            }
        }
        
        if (!$organization) {
            abort(404, 'Organization not found');
        }

        $rowData = $organization->row_data;
        $transformedData = ExcelDataTransformer::transform($rowData);

        // Get any Organization record for mission (only if not already found)
        $anyOrgRecord = $registeredOrg ?: Organization::where('ein', $organization->ein)->first();

        $isFav = false;
        $notificationsEnabled = false;
        
        if (Auth::check()) {
            if ($registeredOrg) {
                // Check favorite by organization_id for registered organizations
                $favorite = UserFavoriteOrganization::where('user_id', Auth::id())
                    ->where('organization_id', $registeredOrg->id)
                    ->first();
            } else {
                // Check favorite by excel_data_id for unregistered organizations
                $excelDataId = (int) $organization->id;
                
                // Query with explicit integer binding to ensure type matching
                $favorite = UserFavoriteOrganization::where('user_id', Auth::id())
                    ->where('excel_data_id', $excelDataId)
                    ->first();
            }

            if ($favorite) {
                $isFav = true;
                $notificationsEnabled = $favorite->notifications;
            }
        }

        // User already loaded above with eager loading

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
                    'image' => $registeredOrg->user->image,
                    'cover_img' => $registeredOrg->user->cover_img,
                ] : null,
            ] : null,
            'description' => $registeredOrg ? $registeredOrg->description : ($anyOrgRecord ? $anyOrgRecord->description : 'This organization is listed in our database but has not yet registered for additional features.'),
            'mission' => $anyOrgRecord && $anyOrgRecord->mission && trim($anyOrgRecord->mission) !== ''
                ? $anyOrgRecord->mission
                : 'Mission statement not available for unregistered organizations.',
            'website' => $registeredOrg && $registeredOrg->website ? $registeredOrg->website : ($anyOrgRecord && $anyOrgRecord->website ? $anyOrgRecord->website : null),
            'ruling' => $transformedData[7] ?? $rowData[7] ?? 'N/A', // Ruling year from excel data
        ];

        // Get posts count and supporters count for both registered and unregistered organizations
        $postsCount = 0;
        $supportersCount = 0;
        $jobsCount = 0;
        $posts = [];
        $supporters = [];
        $believePointsEarned = 0;
        $believePointsSpent = 0;
        $believePointsBalance = 0;

        if ($registeredOrg) {
            // Calculate believe points earned from donations
            $believePointsEarned = \App\Models\Donation::where('organization_id', $registeredOrg->id)
                ->where('payment_method', 'believe_points')
                ->where('status', 'completed')
                ->sum('amount');
            
            // Calculate believe points spent (if organization user has transactions)
            // For now, we'll track this through the organization's user balance changes
            // Points spent would be tracked through transactions if organizations can spend points
            // This is a placeholder - adjust based on your business logic
            $believePointsSpent = 0; // TODO: Calculate from transactions if organizations can spend points
            
            // Net balance (earned - spent)
            $believePointsBalance = $believePointsEarned - $believePointsSpent;
            // Get posts count - use single query with union for faster counting
            $postsCount = \App\Models\Post::where('user_id', $registeredOrg->user_id)->count() 
                + \App\Models\FacebookPost::where('organization_id', $registeredOrg->id)
                    ->where('status', 'published')
                    ->count();
            
            // Get supporters count only - defer loading supporter details
            $supportersCount = \App\Models\UserFavoriteOrganization::where('organization_id', $registeredOrg->id)->count();
            $supporters = []; // Load on demand when supporters tab is accessed
            
            // Get jobs count
            $jobsCount = \App\Models\JobPost::where('organization_id', $registeredOrg->id)->count();
        } else {
            // For unregistered organizations, count supporters by excel_data_id
            $supportersCount = \App\Models\UserFavoriteOrganization::where('excel_data_id', $organization->id)->count();
            $supporters = []; // Load on demand when supporters tab is accessed
        }
        
        // Load posts with minimal data initially - defer detailed loading (only for registered orgs)
        if ($registeredOrg) {
            $userId = Auth::id();
            
            // Get filter from request (default to 'organization' for organization posts only)
            $postFilter = $request->get('filter', 'organization'); // 'all' or 'organization'
            
            // Load posts with reactions and comments data
            // Don't eager load user.organization to avoid ambiguous column error
            // We'll load organization data manually in the map function
            $postsQuery = \App\Models\Post::select('id', 'content', 'images', 'created_at', 'user_id')
                ->with(['user:id,name,image,slug,role'])
                ->withCount(['reactions', 'comments']);
            
            if ($postFilter === 'organization') {
                // Only this organization's posts
                $postsQuery->where('user_id', $registeredOrg->user_id);
            } else if ($postFilter === 'all') {
                // "All Posts" means: organization's posts + posts from supporters who follow this organization
                
                // Get all user IDs who follow this organization (supporters)
                // Check both organization_id (for registered orgs) and excel_data_id (for unregistered orgs)
                $supporterQuery = UserFavoriteOrganization::query();
                
                if ($registeredOrg) {
                    // Registered organizations: match by organization_id
                    $supporterQuery->where('organization_id', $registeredOrg->id);
                }
                
                if ($organization) {
                    // Also check excel_data_id (for unregistered orgs or if someone followed by excel_data_id)
                    if ($registeredOrg) {
                        $supporterQuery->orWhere('excel_data_id', $organization->id);
                    } else {
                        $supporterQuery->where('excel_data_id', $organization->id);
                    }
                }
                
                $supporterUserIds = $supporterQuery
                    ->pluck('user_id')
                    ->unique()
                    ->toArray();
                
                // Combine: organization's user_id + all supporter user IDs
                $allowedUserIds = array_merge(
                    [$registeredOrg->user_id], // Organization's own posts
                    $supporterUserIds // Posts from supporters who follow this organization
                );
                
                $postsQuery->whereIn('user_id', array_unique($allowedUserIds));
            }
            
            $recentPosts = $postsQuery->latest()
                ->limit(5) // Reduced initial load
                ->get()
                ->map(function ($post) use ($userId) {
                    $image = null;
                    if ($post->images && is_array($post->images) && count($post->images) > 0) {
                        $image = $post->images[0];
                    }
                    
                    // Get user's reaction if authenticated
                    $userReaction = null;
                    if ($userId) {
                        $reaction = \App\Models\PostReaction::where('post_id', $post->id)
                            ->where('user_id', $userId)
                            ->first();
                        if ($reaction) {
                            $userReaction = [
                                'id' => $reaction->id,
                                'type' => $reaction->type,
                                'user_id' => $reaction->user_id,
                            ];
                        }
                    }
                    
                    // Load recent reactions with user data (limit to 10 for performance)
                    $reactions = \App\Models\PostReaction::where('post_id', $post->id)
                        ->with('user:id,name,image')
                        ->latest()
                        ->limit(10)
                        ->get()
                        ->map(function ($reaction) {
                            return [
                                'id' => $reaction->id,
                                'type' => $reaction->type,
                                'user_id' => $reaction->user_id,
                                'user' => $reaction->user ? [
                                    'id' => $reaction->user->id,
                                    'name' => $reaction->user->name,
                                    'image' => $reaction->user->image,
                                ] : null,
                            ];
                        });
                    
                    // Load recent comments with user data (limit to 5 for initial load)
                    $comments = \App\Models\PostComment::where('post_id', $post->id)
                        ->with('user:id,name,image')
                        ->latest()
                        ->limit(5)
                        ->get()
                        ->map(function ($comment) {
                            return [
                                'id' => $comment->id,
                                'content' => $comment->content,
                                'created_at' => $comment->created_at,
                                'user' => $comment->user ? [
                                    'id' => $comment->user->id,
                                    'name' => $comment->user->name,
                                    'image' => $comment->user->image,
                                ] : null,
                            ];
                        });
                    
                    // Determine creator info
                    $creator = null;
                    $creatorType = 'user';
                    $creatorName = $post->user->name ?? 'Unknown';
                    $creatorSlug = $post->user->slug ?? null;
                    $creatorImage = $post->user->image ? Storage::url($post->user->image) : null;
                    
                    // Check if user has an organization - load it manually to avoid relationship issues
                    if ($post->user && $post->user->role === 'organization') {
                        $org = Organization::where('user_id', $post->user->id)->first();
                        if ($org) {
                            $creator = [
                                'id' => $org->id,
                                'name' => $org->name,
                                'slug' => $post->user->slug,
                                'image' => $post->user->image ? Storage::url($post->user->image) : null,
                            ];
                            $creatorType = 'organization';
                            $creatorName = $org->name;
                            $creatorSlug = $post->user->slug;
                            $creatorImage = $post->user->image ? Storage::url($post->user->image) : null;
                        } else {
                            // User with organization role but no organization record
                            $creator = [
                                'id' => $post->user->id,
                                'name' => $post->user->name,
                                'slug' => $post->user->slug,
                                'image' => $post->user->image ? Storage::url($post->user->image) : null,
                            ];
                        }
                    } else if ($post->user) {
                        $creator = [
                            'id' => $post->user->id,
                            'name' => $post->user->name,
                            'slug' => $post->user->slug,
                            'image' => $post->user->image ? Storage::url($post->user->image) : null,
                        ];
                    }
                    
                    return [
                        'id' => $post->id,
                        'title' => null, // Post model doesn't have title field
                        'content' => $post->content,
                        'image' => $image,
                        'images' => $post->images ?? [],
                        'created_at' => $post->created_at,
                        'reactions_count' => $post->reactions_count,
                        'comments_count' => $post->comments_count,
                        'user_reaction' => $userReaction,
                        'reactions' => $reactions->toArray(),
                        'comments' => $comments->toArray(),
                        'has_more_comments' => $post->comments_count > 5,
                        'creator' => $creator,
                        'creator_type' => $creatorType,
                        'creator_name' => $creatorName,
                        'creator_slug' => $creatorSlug,
                        'creator_image' => $creatorImage,
                        'user' => $post->user ? [
                            'id' => $post->user->id,
                            'name' => $post->user->name,
                            'image' => $post->user->image ? Storage::url($post->user->image) : null,
                            'slug' => $post->user->slug,
                        ] : null,
                    ];
                });
            
            // Load Facebook posts (only if showing organization posts)
            $facebookPosts = collect([]);
            if ($postFilter === 'organization') {
                $facebookPosts = \App\Models\FacebookPost::where('organization_id', $registeredOrg->id)
                    ->where('status', 'published')
                    ->select('id', 'message', 'image', 'published_at', 'created_at')
                    ->latest()
                    ->limit(5) // Reduced initial load
                    ->get()
                    ->map(function ($post) {
                        return [
                            'id' => 'fb_' . $post->id,
                            'title' => null,
                            'content' => $post->message,
                            'image' => $post->image,
                            'created_at' => $post->published_at ?? $post->created_at,
                            'likes_count' => 0,
                            'comments_count' => 0,
                        ];
                    });
            }
            
            // $recentPosts is an Eloquent Collection; after mapping to arrays it can still be an Eloquent\Collection
            // which expects Models (calls getKey()). Convert to a base collection before merging.
            $posts = collect($recentPosts->all())
                ->merge($facebookPosts)
                ->sortByDesc('created_at')
                ->take(5)
                ->values();
        }

        // Load sidebar data using optimized helper method
        $sidebarData = $this->getSidebarData($registeredOrg);
        $peopleYouMayKnow = $sidebarData['peopleYouMayKnow'];
        $trendingOrganizations = $sidebarData['trendingOrganizations'];

        return Inertia::render('frontend/organization/organization-show', [
            'organization' => $transformedOrganization,
            'posts' => $posts,
            'postsCount' => $postsCount,
            'supportersCount' => $supportersCount,
            'jobsCount' => $jobsCount,
            'supporters' => $supporters,
            'peopleYouMayKnow' => $peopleYouMayKnow,
            'trendingOrganizations' => $trendingOrganizations,
            'isFav' => $isFav,
            'believePointsEarned' => $believePointsEarned,
            'believePointsSpent' => $believePointsSpent,
            'believePointsBalance' => $believePointsBalance,
            'postFilter' => $postFilter ?? 'organization', // Pass filter to frontend
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

    public function toggleFavorite(Request $request, int $id)
    {
        $user = Auth::user();

        // Get the ExcelData organization
        $excelDataOrg = ExcelData::findOrFail($id);

        // Find the registered organization by EIN
        $org = Organization::where('ein', $excelDataOrg->ein)
            ->where('registration_status', 'approved')
            ->first();

        $isFollowing = false;
        $message = '';

        if ($org) {
            // Registered organization - use organization_id
            $fav = UserFavoriteOrganization::where('user_id', $user->id)
                ->where('organization_id', $org->id)
                ->first();

            if ($fav) {
                $fav->delete();
                $isFollowing = false;
                $message = 'Unfollowed organization';
            } else {
                UserFavoriteOrganization::create([
                    'user_id' => $user->id,
                    'organization_id' => $org->id,
                    'excel_data_id' => $id, // Also store excel_data_id for consistency
                    'notifications' => true
                ]);
                $isFollowing = true;
                $message = 'Following organization with notifications';
            }
        } else {
            // Unregistered organization - use excel_data_id
            // Cast to int to ensure type matching
            $excelDataId = (int) $id;
            $fav = UserFavoriteOrganization::where('user_id', $user->id)
                ->where('excel_data_id', $excelDataId)
                ->first();

            if ($fav) {
                $fav->delete();
                $isFollowing = false;
                $message = 'Unfollowed organization';
            } else {
                $createdFavorite = UserFavoriteOrganization::create([
                    'user_id' => $user->id,
                    'organization_id' => null, // null for unregistered organizations
                    'excel_data_id' => $excelDataId,
                    'notifications' => true
                ]);
                
                // Refresh the model to ensure it has the latest data from database
                $createdFavorite->refresh();

                $isFollowing = true;
                $message = 'Following organization with notifications';
            }
        }

        // For API requests (axios/fetch), return JSON response
        // Axios sends X-Requested-With: XMLHttpRequest header
        // Check if it's an AJAX request (not Inertia)
        $isAjaxRequest = $request->header('X-Requested-With') === 'XMLHttpRequest' 
            && !$request->header('X-Inertia');
        
        if ($isAjaxRequest || $request->wantsJson() || $request->expectsJson()) {
            return response()->json([
                'success' => true,
                'is_following' => $isFollowing,
                'message' => $message,
            ]);
        }
        
        // For Inertia requests, redirect back to reload the page with updated favorite status
        $referer = $request->header('Referer');
        if ($referer) {
            return redirect($referer);
        }
        // Fallback to organization show page
        return redirect()->route('organizations.show', $id)
            ->with('success', $message);
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
    //         if ($request->header('X-Inertia')) {
    //             return redirect()->back()->with('error', 'You can only follow registered organizations.');
    //         }
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

    //         if ($request->header('X-Inertia')) {
    //             return redirect()->back()->with('success', 'Unfollowed organization');
    //         }

    //         return response()->json([
    //             'success' => true,
    //             'message' => 'Unfollowed organization',
    //             'is_following' => false
    //         ]);
    //     } else {
    //         // Check if user has any follower positions
    //         $hasPositions = FollowingUserPosition::where('user_id', $user->id)->exists();

    //         if (!$hasPositions) {
    //             if ($request->header('X-Inertia')) {
    //                 // For Inertia requests, we'll handle this differently
    //                 return response()->json([
    //                     'requires_positions' => true,
    //                     'organization_id' => $id,
    //                     'organization_name' => $excelDataOrg->name_virtual ?? 'Organization'
    //                 ]);
    //             }

    //             return response()->json([
    //                 'requires_positions' => true,
    //                 'organization_id' => $id,
    //                 'organization_name' => $excelDataOrg->name_virtual ?? 'Organization'
    //             ]);
    //         }

    //         // User has positions, create the favorite
    //         $favorite = UserFavoriteOrganization::create([
    //             'user_id' => $user->id,
    //             'organization_id' => $org->id,
    //             'notifications' => true
    //         ]);

    //         // Award impact points for following
    //         $this->impactScoreService->awardFollowPoints($favorite);

    //         if ($request->header('X-Inertia')) {
    //             return redirect()->back()->with('success', 'Following organization with notifications');
    //         }

    //         return response()->json([
    //             'success' => true,
    //             'message' => 'Following organization with notifications',
    //             'is_following' => true
    //         ]);
    //     }
    // }

    // public function savePositionsAndFollow(Request $request, int $orgId)
    // {
    //     $user = Auth::user();

    //     // Validate the request
    //     $request->validate([
    //         'positions' => 'required|array|min:1',
    //         'positions.*.follower_position_id' => 'required|exists:follower_positions,id',
    //         'positions.*.experience_level' => 'required|in:beginner,intermediate,expert',
    //         'positions.*.years_of_experience' => 'required|integer|min:0',
    //         'positions.*.skills' => 'nullable|string',
    //         'positions.*.portfolio_url' => 'nullable|url',
    //     ]);

    //     // Delete existing positions for this user
    //     FollowingUserPosition::where('user_id', $user->id)->delete();

    //     // Save new positions
    //     foreach ($request->positions as $positionData) {
    //         FollowingUserPosition::create([
    //             'user_id' => $user->id,
    //             'follower_position_id' => $positionData['follower_position_id'],
    //             'experience_level' => $positionData['experience_level'],
    //             'years_of_experience' => $positionData['years_of_experience'],
    //             'skills' => $positionData['skills'] ?? null,
    //             'portfolio_url' => $positionData['portfolio_url'] ?? null,
    //             'is_primary' => $positionData['is_primary'] ?? false,
    //         ]);
    //     }

    //     // Get the ExcelData organization
    //     $excelDataOrg = ExcelData::findOrFail($orgId);

    //     // Find the registered organization by EIN
    //     $org = Organization::where('ein', $excelDataOrg->ein)
    //         ->where('registration_status', 'approved')
    //         ->first();

    //     if (!$org) {
    //         return response()->json([
    //             'success' => false,
    //             'message' => 'Organization not found'
    //         ], 404);
    //     }

    //     // Create the favorite
    //     UserFavoriteOrganization::create([
    //         'user_id' => $user->id,
    //         'organization_id' => $org->id,
    //         'notifications' => true
    //     ]);

    //     return response()->json([
    //         'success' => true,
    //         'message' => 'Following organization with notifications',
    //         'redirect_url' => route('organizations.show', $orgId)
    //     ]);
    // }

    // public function getPositionsForSelection()
    // {
    //     $positions = FollowerPosition::where('is_active', true)
    //         ->orderBy('sort_order')
    //         ->orderBy('name')
    //         ->get()
    //         ->groupBy('category');

    //     $userPositions = FollowingUserPosition::where('user_id', Auth::id())
    //         ->with('followerPosition')
    //         ->get();


    //     return response()->json([
    //         'all_positions' => $positions,
    //         'user_positions' => $userPositions
    //     ]);
    // }



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

    /**
     * Generate mission statement for an organization using OpenAI
     * Accessible from frontend - no admin restriction, works for registered and unregistered orgs
     * Accepts ExcelData ID (the public organization ID)
     */
    public function generateMission(Request $request, int $id)
    {
        try {
            // Find the ExcelData record (this is the public organization ID)
            $excelData = ExcelData::where('id', $id)
                ->where('status', 'complete')
                ->firstOrFail();

            $rowData = $excelData->row_data;
            $transformedData = ExcelDataTransformer::transform($rowData);

            // Get organization details from ExcelData
            $orgName = $transformedData[1] ?? $rowData[1] ?? '';
            $orgEin = $excelData->ein;
            $orgCity = $transformedData[4] ?? $rowData[4] ?? '';
            $orgState = $transformedData[5] ?? $rowData[5] ?? '';
            $orgClassification = $transformedData[10] ?? $rowData[10] ?? '';
            $orgNteeCode = $transformedData[26] ?? $rowData[26] ?? '';

            // Find or create Organization record by EIN
            $organization = Organization::where('ein', $orgEin)->first();

            if ($organization) {
                // Check if description already exists and is not empty
                if ($organization->description && trim($organization->description) !== '' &&
                    $organization->description !== 'This organization is listed in our database but has not yet registered for additional features.') {
                    return response()->json([
                        'error' => 'Organization description already exists'
                    ], 400);
                }

                $orgDescription = $organization->description ?? '';
                // Use organization's city/state if available, otherwise use ExcelData
                $orgCity = $organization->city ?? $orgCity;
                $orgState = $organization->state ?? $orgState;
            } else {
                // Create a new Organization record for unregistered orgs
                // user_id can be null now
                $organization = Organization::create([
                    'ein' => $orgEin,
                    'name' => $orgName,
                    'street' => $transformedData[3] ?? $rowData[3] ?? '',
                    'city' => $orgCity,
                    'state' => $orgState,
                    'zip' => $transformedData[6] ?? $rowData[6] ?? '',
                    'classification' => $orgClassification,
                    'ntee_code' => $orgNteeCode,
                    'email' => '',
                    'phone' => '',
                    'contact_name' => '',
                    'contact_title' => '',
                    'description' => '',
                    'mission' => '',
                    'registration_status' => 'pending',
                    'user_id' => null, // Nullable now - no user for unregistered orgs
                ]);

                $orgDescription = '';
            }

            // Build prompt for OpenAI to generate "about" description
            // Include Name, City, and State to avoid confusion when multiple organizations have the same name
            $prompt = "Write a comprehensive and engaging 'About Us' description for a nonprofit organization. ";
            $prompt .= "Organization Name: \"{$orgName}\". ";

            if ($orgCity && trim($orgCity) !== '') {
                $prompt .= "Location: {$orgCity}";
                if ($orgState && trim($orgState) !== '') {
                    $prompt .= ", {$orgState}";
                }
                $prompt .= ". ";
            } elseif ($orgState && trim($orgState) !== '') {
                $prompt .= "Location: {$orgState}. ";
            }

            if ($organization->mission) {
                $prompt .= "The organization's mission is: {$organization->mission}. ";
            }

            if ($orgClassification) {
                $prompt .= "The organization is classified as: {$orgClassification}. ";
            }

            if ($orgNteeCode) {
                $prompt .= "The NTEE code is: {$orgNteeCode}. ";
            }

            $prompt .= "The description should be informative, engaging, and provide a clear overview of what the organization does, who it serves, and its impact. ";
            $prompt .= "IMPORTANT: The generated description MUST include the organization's name \"{$orgName}\"";
            if ($orgCity && trim($orgCity) !== '') {
                $prompt .= ", the city \"{$orgCity}\"";
            }
            if ($orgState && trim($orgState) !== '') {
                $prompt .= ", and the state \"{$orgState}\"";
            }
            $prompt .= " within the description text itself. Make sure to naturally incorporate these details into the narrative. ";
            $prompt .= "Keep it comprehensive (approximately 200-400 words). Return only the description text, no additional commentary or formatting.";

            // Generate description using OpenAI
            $openAiService = new OpenAiService();
            $generatedDescription = $openAiService->chatCompletion([
                [
                    'role' => 'system',
                    'content' => 'You are a professional nonprofit consultant specializing in writing compelling organization descriptions. Create clear, engaging, and informative "About Us" descriptions for nonprofit organizations.'
                ],
                [
                    'role' => 'user',
                    'content' => $prompt
                ]
            ]);

            // Update organization with generated description
            $organization->update([
                'description' => trim($generatedDescription)
            ]);

            return response()->json([
                'success' => true,
                'description' => trim($generatedDescription)
            ]);

        } catch (\Exception $e) {
            Log::error('Error generating mission statement', [
                'excel_data_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'Failed to generate mission statement. Please try again later.'
            ], 500);
        }
    }

    /**
     * Get full organization data for tab pages
     */
    private function getOrganizationData(string $id): array
    {
        // Ultra-fast lookup: Try direct ID first (uses primary key index)
        $organization = ExcelData::where('id', $id)
            ->where('status', 'complete')
            ->select('id', 'ein', 'row_data', 'created_at', 'updated_at') // Only select needed columns
            ->first();
        
        $registeredOrg = null;
        
        if ($organization) {
            // Single query to get registered org if exists
            $registeredOrg = Organization::where('ein', $organization->ein)
                ->where('registration_status', 'approved')
                ->with('user:id,slug,name,email,image,cover_img')
                ->select('id', 'ein', 'user_id', 'name', 'description', 'mission', 'website', 'phone', 'email', 'contact_name', 'contact_title', 'social_accounts', 'city', 'state')
                ->first();
        } else {
            // Fallback: Try by user slug
            $user = \App\Models\User::where('slug', $id)->select('id', 'slug')->first();
            
            if ($user) {
                $registeredOrg = Organization::where('user_id', $user->id)
                    ->where('registration_status', 'approved')
                    ->with('user:id,slug,name,email,image,cover_img')
                    ->select('id', 'ein', 'user_id', 'name', 'description', 'mission', 'website', 'phone', 'email', 'contact_name', 'contact_title', 'social_accounts', 'city', 'state')
                    ->first();
                
                if ($registeredOrg) {
                    $organization = ExcelData::where('ein', $registeredOrg->ein)
                        ->where('status', 'complete')
                        ->select('id', 'ein', 'row_data', 'created_at', 'updated_at')
                        ->orderBy('id', 'desc')
                        ->limit(1)
                        ->first();
                }
            }
        }
        
        if (!$organization) {
            abort(404, 'Organization not found');
        }

        $rowData = $organization->row_data;
        $transformedData = ExcelDataTransformer::transform($rowData);

        // Reuse registeredOrg if already loaded, otherwise query once with select for speed
        if (!$registeredOrg) {
            $registeredOrg = Organization::where('ein', $organization->ein)
                ->where('registration_status', 'approved')
                ->with('user:id,slug,name,email,image,cover_img')
                ->select('id', 'ein', 'user_id', 'name', 'description', 'mission', 'website', 'phone', 'email', 'contact_name', 'contact_title', 'social_accounts', 'city', 'state')
                ->first();
        }
        
        // Get any org record only if registeredOrg not found (for mission/description fallback)
        $anyOrgRecord = $registeredOrg;
        if (!$anyOrgRecord) {
            $anyOrgRecord = Organization::where('ein', $organization->ein)
                ->select('id', 'ein', 'description', 'mission', 'website', 'phone', 'email', 'contact_name', 'contact_title', 'social_accounts', 'city', 'state')
                ->first();
        }

        // Check favorite status only if user is authenticated (optimized)
        $isFav = false;
        $notificationsEnabled = false;
        
        if (Auth::check()) {
            if ($registeredOrg) {
                // Check favorite by organization_id for registered organizations
                $favorite = UserFavoriteOrganization::where('user_id', Auth::id())
                    ->where('organization_id', $registeredOrg->id)
                    ->select('id', 'notifications')
                    ->first();

                if ($favorite) {
                    $isFav = true;
                    $notificationsEnabled = $favorite->notifications;
                }
            } else {
                // Check favorite by excel_data_id for unregistered organizations
                $excelDataId = (int) $organization->id;
                $favorite = UserFavoriteOrganization::where('user_id', Auth::id())
                    ->where('excel_data_id', $excelDataId)
                    ->select('id', 'notifications')
                    ->first();

                if ($favorite) {
                    $isFav = true;
                    $notificationsEnabled = $favorite->notifications;
                }
            }
        }
        
        // User already loaded with eager loading above, no need to reload

        return [
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
                    'image' => $registeredOrg->user->image,
                    'cover_img' => $registeredOrg->user->cover_img,
                ] : null,
            ] : null,
            'description' => $registeredOrg ? $registeredOrg->description : ($anyOrgRecord ? $anyOrgRecord->description : 'This organization is listed in our database but has not yet registered for additional features.'),
            'mission' => $anyOrgRecord && $anyOrgRecord->mission && trim($anyOrgRecord->mission) !== ''
                ? $anyOrgRecord->mission
                : 'Mission statement not available for unregistered organizations.',
            'website' => $registeredOrg && $registeredOrg->website ? $registeredOrg->website : ($anyOrgRecord && $anyOrgRecord->website ? $anyOrgRecord->website : null),
            'ruling' => $transformedData[7] ?? $rowData[7] ?? 'N/A',
            'phone' => $registeredOrg ? $registeredOrg->phone : ($anyOrgRecord ? $anyOrgRecord->phone : null),
            'email' => $registeredOrg ? $registeredOrg->email : ($anyOrgRecord ? $anyOrgRecord->email : null),
            'contact_name' => $registeredOrg ? $registeredOrg->contact_name : ($anyOrgRecord ? $anyOrgRecord->contact_name : null),
            'contact_title' => $registeredOrg ? $registeredOrg->contact_title : ($anyOrgRecord ? $anyOrgRecord->contact_title : null),
            'social_accounts' => $registeredOrg ? $registeredOrg->social_accounts : ($anyOrgRecord ? $anyOrgRecord->social_accounts : []),
            '_registered_org' => $registeredOrg, // Include for reuse in tab methods
        ];
    }

    /**
     * Show organization products tab
     */
    public function products(Request $request, string $id)
    {
        $organizationData = $this->getOrganizationData($id);
        $registeredOrg = Organization::where('ein', $organizationData['ein'])
            ->where('registration_status', 'approved')
            ->first();

        $products = [];
        $postsCount = 0;
        $supportersCount = 0;
        $jobsCount = 0;
        $supporters = [];
        $excelDataId = (int) $organizationData['id'];

        if ($registeredOrg) {
            $products = \App\Models\Product::where('organization_id', $registeredOrg->id)
                ->where('publish_status', 'published')
                ->with(['categories', 'variants'])
                ->latest()
                ->paginate(12)
                ->items();

            // Get counts only - defer loading full data
            $postsCount = \App\Models\Post::where('user_id', $registeredOrg->user_id)->count() 
                + \App\Models\FacebookPost::where('organization_id', $registeredOrg->id)
                    ->where('status', 'published')
                    ->count();
            $supportersCount = \App\Models\UserFavoriteOrganization::where('organization_id', $registeredOrg->id)->count();
            $jobsCount = \App\Models\JobPost::where('organization_id', $registeredOrg->id)->count();
            $supporters = []; // Defer loading - only needed for supporters tab
        } else {
            // For unregistered organizations, count supporters by excel_data_id
            $supportersCount = \App\Models\UserFavoriteOrganization::where('excel_data_id', $excelDataId)->count();
        }

        $sidebarData = $this->getSidebarData($registeredOrg);

        return Inertia::render('frontend/organization/organization-show', [
            'organization' => $organizationData,
            'products' => $products,
            'postsCount' => $postsCount,
            'supportersCount' => $supportersCount,
            'supporters' => $supporters,
            'currentPage' => 'products',
            'auth' => Auth::user() ? ['user' => Auth::user()] : null,
            ...$sidebarData,
        ]);
    }

    /**
     * Show organization jobs tab
     */
    public function jobs(Request $request, string $id)
    {
        $organizationData = $this->getOrganizationData($id);
        // Reuse registeredOrg from getOrganizationData to avoid duplicate query
        $registeredOrg = $organizationData['_registered_org'] ?? null;
        
        if (!$registeredOrg && $organizationData['is_registered']) {
            $registeredOrg = Organization::where('ein', $organizationData['ein'])
                ->where('registration_status', 'approved')
                ->select('id', 'user_id', 'name', 'description', 'mission', 'website', 'phone', 'email', 'contact_name', 'contact_title', 'social_accounts', 'city', 'state')
                ->first();
        }

        $jobs = [];
        $postsCount = 0;
        $supportersCount = 0;
        $jobsCount = 0;
        $supporters = [];
        $excelDataId = (int) $organizationData['id'];

        if ($registeredOrg) {
            $jobsQuery = \App\Models\JobPost::where('organization_id', $registeredOrg->id)
                ->with(['position', 'organization'])
                ->latest();
            
            // Add has_applied check if user is authenticated
            if (Auth::check()) {
                $jobsQuery->withExists([
                    'applications as has_applied' => function ($q) {
                        $q->where('user_id', Auth::id());
                    }
                ]);
            }
            
            // Get total count before pagination
            $jobsCount = $jobsQuery->count();
            $jobs = $jobsQuery->paginate(12)->items();

            // Get all data needed for the main organization page
            $postsCount = \App\Models\Post::where('user_id', $registeredOrg->user_id)->count();
            $postsCount += \App\Models\FacebookPost::where('organization_id', $registeredOrg->id)->where('status', 'published')->count();
            $supportersCount = \App\Models\UserFavoriteOrganization::where('organization_id', $registeredOrg->id)->count();
            $supporters = \App\Models\UserFavoriteOrganization::where('organization_id', $registeredOrg->id)
                ->with('user:id,name,email,image')
                ->latest()
                ->get()
                ->map(function ($favorite) {
                    return [
                        'id' => $favorite->id,
                        'user_id' => $favorite->user_id,
                        'user' => $favorite->user ? [
                            'id' => $favorite->user->id,
                            'name' => $favorite->user->name,
                            'email' => $favorite->user->email,
                            'image' => $favorite->user->image,
                        ] : null,
                        'notifications' => $favorite->notifications ?? false,
                        'joined_at' => $favorite->created_at?->toIso8601String(),
                    ];
                })
                ->toArray();
        } else {
            // For unregistered organizations, count supporters by excel_data_id
            $supportersCount = \App\Models\UserFavoriteOrganization::where('excel_data_id', $excelDataId)->count();
        }

        $believePoints = $registeredOrg ? $this->calculateBelievePoints($registeredOrg->id) : [
            'believePointsEarned' => 0,
            'believePointsSpent' => 0,
            'believePointsBalance' => 0,
        ];
        $sidebarData = $this->getSidebarData($registeredOrg);

        return Inertia::render('frontend/organization/organization-show', [
            'organization' => $organizationData,
            'jobs' => $jobs,
            'postsCount' => $postsCount,
            'supportersCount' => $supportersCount,
            'jobsCount' => $jobsCount,
            'supporters' => $supporters,
            'currentPage' => 'jobs',
            'auth' => Auth::user() ? ['user' => Auth::user()] : null,
            ...$believePoints,
            ...$sidebarData,
        ]);
    }

    /**
     * Show organization events tab
     */
    public function events(Request $request, string $id)
    {
        $organizationData = $this->getOrganizationData($id);
        $registeredOrg = Organization::where('ein', $organizationData['ein'])
            ->where('registration_status', 'approved')
            ->first();

        $events = [];
        $postsCount = 0;
        $supportersCount = 0;
        $jobsCount = 0;
        $supporters = [];
        $excelDataId = (int) $organizationData['id'];

        if ($registeredOrg) {
            $events = \App\Models\Event::where('organization_id', $registeredOrg->id)
                ->with(['eventType', 'organization'])
                ->latest()
                ->paginate(12)
                ->items();

            // Get counts only - defer loading full data
            $postsCount = \App\Models\Post::where('user_id', $registeredOrg->user_id)->count() 
                + \App\Models\FacebookPost::where('organization_id', $registeredOrg->id)
                    ->where('status', 'published')
                    ->count();
            $supportersCount = \App\Models\UserFavoriteOrganization::where('organization_id', $registeredOrg->id)->count();
            $jobsCount = \App\Models\JobPost::where('organization_id', $registeredOrg->id)->count();
            $supporters = []; // Defer loading - only needed for supporters tab
        } else {
            // For unregistered organizations, count supporters by excel_data_id
            $supportersCount = \App\Models\UserFavoriteOrganization::where('excel_data_id', $excelDataId)->count();
        }

        $sidebarData = $this->getSidebarData($registeredOrg);

        return Inertia::render('frontend/organization/organization-show', [
            'organization' => $organizationData,
            'events' => $events,
            'postsCount' => $postsCount,
            'supportersCount' => $supportersCount,
            'jobsCount' => $jobsCount,
            'supporters' => $supporters,
            'currentPage' => 'events',
            'auth' => Auth::user() ? ['user' => Auth::user()] : null,
            ...$sidebarData,
        ]);
    }

    /**
     * Show organization social media tab
     */
    public function socialMedia(Request $request, string $id)
    {
        $organizationData = $this->getOrganizationData($id);
        $registeredOrg = Organization::where('ein', $organizationData['ein'])
            ->where('registration_status', 'approved')
            ->first();

        if (!$registeredOrg) {
            abort(404, 'Organization not found');
        }

        // Get Facebook posts
        $facebookPosts = \App\Models\FacebookPost::where('organization_id', $registeredOrg->id)
            ->where('status', 'published')
            ->with('facebookAccount')
            ->latest()
            ->paginate(12);

        return Inertia::render('frontend/organization/tabs/SocialMedia', [
            'organization' => $organizationData,
            'facebookPosts' => $facebookPosts,
            'auth' => Auth::user() ? ['user' => Auth::user()] : null,
        ]);
    }

    /**
     * Show organization about tab
     */
    public function about(Request $request, string $id)
    {
        $organizationData = $this->getOrganizationData($id);
        
        // Reuse registeredOrg from getOrganizationData to avoid duplicate query
        $registeredOrg = $organizationData['_registered_org'] ?? null;
        
        if (!$registeredOrg && $organizationData['is_registered']) {
            $registeredOrg = Organization::where('ein', $organizationData['ein'])
                ->where('registration_status', 'approved')
                ->select('id', 'user_id', 'name', 'description', 'mission', 'website', 'phone', 'email', 'contact_name', 'contact_title', 'social_accounts', 'city', 'state')
                ->first();
        }
        $postsCount = 0;
        $supportersCount = 0;
        $jobsCount = 0;
        $supporters = [];
        $excelDataId = (int) $organizationData['id'];
        
        if ($registeredOrg) {
            // Get counts only - defer loading full data
            $postsCount = \App\Models\Post::where('user_id', $registeredOrg->user_id)->count() 
                + \App\Models\FacebookPost::where('organization_id', $registeredOrg->id)
                    ->where('status', 'published')
                    ->count();
            $supportersCount = \App\Models\UserFavoriteOrganization::where('organization_id', $registeredOrg->id)->count();
            $jobsCount = \App\Models\JobPost::where('organization_id', $registeredOrg->id)->count();
            $supporters = []; // Defer loading - only needed for supporters tab
        } else {
            // For unregistered organizations, count supporters by excel_data_id
            $supportersCount = \App\Models\UserFavoriteOrganization::where('excel_data_id', $excelDataId)->count();
        }

        $believePoints = $registeredOrg ? $this->calculateBelievePoints($registeredOrg->id) : [
            'believePointsEarned' => 0,
            'believePointsSpent' => 0,
            'believePointsBalance' => 0,
        ];
        $sidebarData = $this->getSidebarData($registeredOrg);

        return Inertia::render('frontend/organization/organization-show', [
            'organization' => $organizationData,
            'postsCount' => $postsCount,
            'supportersCount' => $supportersCount,
            'jobsCount' => $jobsCount,
            'supporters' => $supporters,
            'currentPage' => 'about',
            'auth' => Auth::user() ? ['user' => Auth::user()] : null,
            ...$believePoints,
            ...$sidebarData,
        ]);
    }

    /**
     * Show organization impact tab
     */
    public function impact(Request $request, string $id)
    {
        $organization = ExcelData::findOrFail($id);
        $registeredOrg = Organization::where('ein', $organization->ein)
            ->where('registration_status', 'approved')
            ->first();

        // Get impact data
        $impactScore = $this->impactScoreService->calculateImpactScore($organization->ein);

        return Inertia::render('frontend/organization/tabs/Impact', [
            'organization' => [
                'id' => $organization->id,
                'name' => $registeredOrg ? $registeredOrg->name : '',
                'ein' => $organization->ein,
            ],
            'impactScore' => $impactScore,
        ]);
    }

    /**
     * Show organization details tab
     */
    public function details(Request $request, string $id)
    {
        $organizationData = $this->getOrganizationData($id);

        return Inertia::render('frontend/organization/tabs/Details', [
            'organization' => $organizationData,
            'auth' => Auth::user() ? ['user' => Auth::user()] : null,
        ]);
    }

    /**
     * Show organization contact tab
     */
    public function contact(Request $request, string $id)
    {
        $organizationData = $this->getOrganizationData($id);

        // Get all data needed for the main organization page
        $registeredOrg = Organization::where('ein', $organizationData['ein'])
            ->where('registration_status', 'approved')
            ->first();
        $postsCount = 0;
        $supportersCount = 0;
        $jobsCount = 0;
        $supporters = [];
        $excelDataId = (int) $organizationData['id'];
        
        if ($registeredOrg) {
            // Get counts only - defer loading full data
            $postsCount = \App\Models\Post::where('user_id', $registeredOrg->user_id)->count() 
                + \App\Models\FacebookPost::where('organization_id', $registeredOrg->id)
                    ->where('status', 'published')
                    ->count();
            $supportersCount = \App\Models\UserFavoriteOrganization::where('organization_id', $registeredOrg->id)->count();
            $jobsCount = \App\Models\JobPost::where('organization_id', $registeredOrg->id)->count();
            $supporters = []; // Defer loading - only needed for supporters tab
        } else {
            // For unregistered organizations, count supporters by excel_data_id
            $supportersCount = \App\Models\UserFavoriteOrganization::where('excel_data_id', $excelDataId)->count();
        }

        $sidebarData = $this->getSidebarData($registeredOrg);

        return Inertia::render('frontend/organization/organization-show', [
            'organization' => $organizationData,
            'postsCount' => $postsCount,
            'supportersCount' => $supportersCount,
            'jobsCount' => $jobsCount,
            'supporters' => $supporters,
            'currentPage' => 'contact',
            'auth' => Auth::user() ? ['user' => Auth::user()] : null,
            ...$sidebarData,
        ]);
    }

    /**
     * Show organization supporters tab
     */
    public function supporters(Request $request, string $id)
    {
        $organizationData = $this->getOrganizationData($id);
        
        // Reuse registeredOrg from getOrganizationData to avoid duplicate query
        $registeredOrg = $organizationData['_registered_org'] ?? null;
        
        if (!$registeredOrg && $organizationData['is_registered']) {
            $registeredOrg = Organization::where('ein', $organizationData['ein'])
                ->where('registration_status', 'approved')
                ->select('id', 'user_id', 'name', 'description', 'mission', 'website', 'phone', 'email', 'contact_name', 'contact_title', 'social_accounts', 'city', 'state')
                ->first();
        }
        $postsCount = 0;
        $supportersCount = 0;
        $jobsCount = 0;
        $supporters = [];
        
        // Get organization ID (excel_data_id for unregistered, organization id for registered)
        $orgId = $registeredOrg ? $registeredOrg->id : null;
        $excelDataId = $registeredOrg ? null : (int) $organizationData['id'];
        
        if ($registeredOrg) {
            // Get counts only - defer loading full data for faster tab switching
            $postsCount = \App\Models\Post::where('user_id', $registeredOrg->user_id)->count() 
                + \App\Models\FacebookPost::where('organization_id', $registeredOrg->id)
                    ->where('status', 'published')
                    ->count();
            $supportersCount = \App\Models\UserFavoriteOrganization::where('organization_id', $registeredOrg->id)->count();
            $jobsCount = \App\Models\JobPost::where('organization_id', $registeredOrg->id)->count();
            
            // Only load supporters data for supporters tab (limit to 50 for performance)
            $supporters = \App\Models\UserFavoriteOrganization::where('organization_id', $registeredOrg->id)
                ->with('user:id,name,email,image,slug')
                ->latest()
                ->limit(50)
                ->get()
                ->map(function ($favorite) {
                    return [
                        'id' => $favorite->id,
                        'user_id' => $favorite->user_id,
                        'user' => $favorite->user ? [
                            'id' => $favorite->user->id,
                            'slug' => $favorite->user->slug,
                            'name' => $favorite->user->name,
                            'email' => $favorite->user->email,
                            'image' => $favorite->user->image,
                        ] : null,
                        'notifications' => $favorite->notifications ?? false,
                        'joined_at' => $favorite->created_at?->toIso8601String(),
                    ];
                })
                ->toArray();
        } else {
            // For unregistered organizations, get supporters by excel_data_id
            $supportersCount = \App\Models\UserFavoriteOrganization::where('excel_data_id', $excelDataId)->count();
            $jobsCount = 0; // Unregistered orgs don't have jobs
            
            // Load supporters data for unregistered organizations
            $favoriteRecords = \App\Models\UserFavoriteOrganization::where('excel_data_id', $excelDataId)
                ->with('user:id,name,email,image,slug')
                ->latest()
                ->limit(50)
                ->get();
            
            $supporters = $favoriteRecords->map(function ($favorite) {
                if ($favorite->user) {
                    return [
                        'id' => $favorite->id,
                        'user_id' => $favorite->user_id,
                        'user' => [
                            'id' => $favorite->user->id,
                            'slug' => $favorite->user->slug,
                            'name' => $favorite->user->name,
                            'email' => $favorite->user->email,
                            'image' => $favorite->user->image,
                        ],
                        'notifications' => $favorite->notifications ?? false,
                        'joined_at' => $favorite->created_at?->toIso8601String(),
                    ];
                }
                return null;
            })->filter()->values()->toArray();
        }

        $believePoints = $registeredOrg ? $this->calculateBelievePoints($registeredOrg->id) : [
            'believePointsEarned' => 0,
            'believePointsSpent' => 0,
            'believePointsBalance' => 0,
        ];
        $sidebarData = $this->getSidebarData($registeredOrg);

        return Inertia::render('frontend/organization/organization-show', [
            'organization' => $organizationData,
            'postsCount' => $postsCount,
            'supportersCount' => $supportersCount,
            'jobsCount' => $jobsCount,
            'supporters' => $supporters,
            'currentPage' => 'supporters',
            'auth' => Auth::user() ? ['user' => Auth::user()] : null,
            ...$believePoints,
            ...$sidebarData,
        ]);
    }

    /**
     * Calculate believe points for an organization
     */
    private function calculateBelievePoints($organizationId)
    {
        $believePointsEarned = \App\Models\Donation::where('organization_id', $organizationId)
            ->where('payment_method', 'believe_points')
            ->where('status', 'completed')
            ->sum('amount');
        
        $believePointsSpent = 0; // TODO: Calculate from transactions if organizations can spend points
        $believePointsBalance = $believePointsEarned - $believePointsSpent;
        
        return [
            'believePointsEarned' => $believePointsEarned,
            'believePointsSpent' => $believePointsSpent,
            'believePointsBalance' => $believePointsBalance,
        ];
    }

    /**
     * Get sidebar data (People You May Know and Trending Organizations)
     * Optimized to use bulk queries instead of N+1 queries
     */
    private function getSidebarData($registeredOrg = null)
    {
        // Get people you may know (suggested users/organizations)
        $peopleYouMayKnow = [];
        if (Auth::check()) {
            // Get other organizations the user might be interested in
            $userFavoriteOrgIds = \App\Models\UserFavoriteOrganization::where('user_id', Auth::id())
                ->pluck('organization_id')
                ->toArray();
            
            $suggestedOrgs = \App\Models\Organization::where('registration_status', 'approved')
                ->whereNotIn('id', $userFavoriteOrgIds)
                ->when($registeredOrg, function($query) use ($registeredOrg) {
                    return $query->where('id', '!=', $registeredOrg->id);
                })
                ->with('user:id,slug,name,image')
                ->limit(4)
                ->get();
            
            // Bulk fetch ExcelData IDs for all suggested orgs at once (optimized)
            if ($suggestedOrgs->isNotEmpty()) {
                $eins = $suggestedOrgs->pluck('ein')->filter()->unique()->toArray();
                
                // Get ExcelData IDs in bulk - use latest record per EIN (much faster, no subquery)
                $excelDataMap = \App\Models\ExcelData::whereIn('ein', $eins)
                    ->where('status', 'complete')
                    ->orderBy('id', 'desc')
                    ->get()
                    ->groupBy('ein')
                    ->map(function($group) {
                        return $group->first()->id; // Get the first (latest) record
                    });
                
                $peopleYouMayKnow = $suggestedOrgs->map(function($org) use ($excelDataMap) {
                    return [
                        'id' => $org->id,
                        'excel_data_id' => $excelDataMap->get($org->ein) ?? null,
                        'slug' => $org->user?->slug ?? null,
                        'name' => $org->name,
                        'org' => $org->description ? \Illuminate\Support\Str::limit($org->description, 30) : 'Organization',
                        'avatar' => $org->user?->image ? '/storage/' . $org->user->image : null,
                    ];
                })->toArray();
            }
        }

        // Get trending organizations (by follower count)
        $trendingOrgs = \App\Models\Organization::where('registration_status', 'approved')
            ->withCount('followers')
            ->with('user:id,slug,name')
            ->orderBy('followers_count', 'desc')
            ->limit(4)
            ->get();
        
        // Bulk fetch ExcelData IDs for all trending orgs at once (optimized - no subquery)
        $trendingOrganizations = [];
        if ($trendingOrgs->isNotEmpty()) {
            $eins = $trendingOrgs->pluck('ein')->filter()->unique()->toArray();
            
            // Get ExcelData IDs in bulk - use latest record per EIN (much faster)
            $excelDataMap = \App\Models\ExcelData::whereIn('ein', $eins)
                ->where('status', 'complete')
                ->orderBy('id', 'desc')
                ->get()
                ->groupBy('ein')
                ->map(function($group) {
                    return $group->first()->id; // Get the first (latest) record
                });
            
            $colors = ['bg-rose-500', 'bg-cyan-500', 'bg-teal-500', 'bg-blue-500'];
            
            $trendingOrganizations = $trendingOrgs->map(function($org, $index) use ($excelDataMap, $colors) {
                return [
                    'id' => $org->id,
                    'excel_data_id' => $excelDataMap->get($org->ein) ?? null,
                    'slug' => $org->user?->slug ?? null,
                    'name' => $org->name,
                    'desc' => $org->description ? \Illuminate\Support\Str::limit($org->description, 50) : 'Organization description',
                    'color' => $colors[$index % count($colors)],
                ];
            })->toArray();
        }

        return [
            'peopleYouMayKnow' => $peopleYouMayKnow,
            'trendingOrganizations' => $trendingOrganizations,
        ];
    }

    /**
     * Invite an unregistered organization via email
     */
    public function inviteOrganization(Request $request)
    {
        $request->validate([
            'organization_id' => 'required|exists:excel_data,id',
            'organization_name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
        ]);

        $user = Auth::user();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'You must be logged in to invite organizations',
            ], 401);
        }

        try {
            // Get organization data
            $organization = ExcelData::findOrFail($request->organization_id);

            // Check if organization is already registered
            $registeredOrg = Organization::where('ein', $organization->ein)
                ->where('registration_status', 'approved')
                ->first();

            if ($registeredOrg) {
                return response()->json([
                    'success' => false,
                    'message' => 'This organization is already registered',
                ], 400);
            }

            // Check if user has already invited this organization
            $existingInvite = \App\Models\OrganizationInvite::where('excel_data_id', $organization->id)
                ->where('inviter_id', $user->id)
                ->where('email', $request->email)
                ->first();

            if ($existingInvite) {
                return response()->json([
                    'success' => false,
                    'message' => 'You have already invited this organization to this email address',
                ], 400);
            }

            // Create invite record
            $invite = \App\Models\OrganizationInvite::create([
                'excel_data_id' => $organization->id,
                'inviter_id' => $user->id,
                'email' => $request->email,
                'organization_name' => $request->organization_name,
                'ein' => $organization->ein,
                'status' => 'pending',
            ]);

            // Dispatch job to send email via queue
            SendOrganizationInviteJob::dispatch($invite);

            Log::info('Organization invite job dispatched', [
                'inviter_id' => $user->id,
                'organization_id' => $organization->id,
                'email' => $request->email,
                'invite_id' => $invite->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Invitation sent successfully!',
                'data' => [
                    'invite_id' => $invite->id,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send organization invite', [
                'error' => $e->getMessage(),
                'user_id' => $user->id ?? null,
                'organization_id' => $request->organization_id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to send invitation. Please try again later.',
            ], 500);
        }
    }
}
