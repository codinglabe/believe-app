<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\NteeCode;
use App\Models\UserFavoriteOrganization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

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
        $sort = $request->get('sort', 'created_at');
        $perPage = $request->get("per_page", 12);

        // Build the query
        $query = Organization::query()
            ->where('registration_status', 'approved');

        // Search in name, description, and mission
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                    ->orWhere('description', 'LIKE', "%{$search}%")
                    ->orWhere('mission', 'LIKE', "%{$search}%");
            });
        }

        // Filter by category (through ntee_code)
        if ($category && $category !== 'All Categories') {
            $query->whereHas('nteeCode', function ($q) use ($category) {
                $q->where('category', $category);
            });
        }

        // Filter by location
        if ($state && $state !== 'All States') {
            $query->where('state', $state);
        }

        if ($city && $city !== 'All Cities') {
            $query->where('city', $city);
        }

        if ($zip) {
            $query->where('zip', 'LIKE', "%{$zip}%");
        }

        // Get organizations with pagination
        $organizations = $query->with(['nteeCode', 'user'])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        // Get filter options
        $categories = NteeCode::select('category')
            ->distinct()
            ->orderBy('category')
            ->pluck('category')
            ->prepend('All Categories');

        $states = Organization::select('state')
            ->where('registration_status', 'approved')
            ->whereNotNull('state')
            ->distinct()
            ->orderBy('state')
            ->pluck('state')
            ->prepend('All States');

        $cities = Organization::select('city')
            ->where('registration_status', 'approved')
            ->whereNotNull('city')
            ->when($state && $state !== 'All States', function ($q) use ($state) {
                return $q->where('state', $state);
            })
            ->distinct()
            ->orderBy('city')
            ->pluck('city')
            ->prepend('All Cities');

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
            'filterOptions' => [
                'categories' => $categories,
                'states' => $states,
                'cities' => $cities,
            ],
            'hasActiveFilters' => $search || ($category && $category !== 'All Categories') ||
                ($state && $state !== 'All States') ||
                ($city && $city !== 'All Cities') || $zip,
        ]);
    }

    public function show(string $slug)
    {
        $organization = Organization::with(['nteeCode', 'user', 'isFavoritedByUser','products', 'events',
            'jobPosts' => function ($query) {
                $query->with(['position'])
                    ->when(auth()->check(), function ($q) {
                        $q->withExists([
                            'applications as has_applied' => function ($subQuery) {
                                $subQuery->where('user_id', auth()->id());
                            }
                        ]);
                    })->whereIn('status', ['open', 'filled', 'closed']);
            }])
            ->whereHas('user', function ($query) use ($slug) {
                $query->where('slug', $slug);
            })
            ->where('registration_status', 'approved')
            ->firstOrFail();

            // dd($organization);

        return Inertia::render('frontend/organization/organization-show', [
            'organization' => $organization,
            'isFav' => $organization->isFavoritedByUser,
        ]);
    }


    // API endpoint for dynamic city loading based on state
    public function getCitiesByState(Request $request)
    {
        $state = $request->get('state');

        $cities = Organization::select('city')
            ->where('registration_status', 'approved')
            ->whereNotNull('city')
            ->when($state && $state !== 'All States', function ($q) use ($state) {
                return $q->where('state', $state);
            })
            ->distinct()
            ->orderBy('city')
            ->pluck('city')
            ->prepend('All Cities');

        return response()->json($cities);
    }

    public function toggleFavorite(Request $request, int $id)
    {
        $user = Auth::user();
        $org =  Organization::findOrFail($id);
        $fav = UserFavoriteOrganization::where('user_id', $user->id)->where('organization_id', $id)->first();

        if ($fav) {
            $fav->delete();
        } else {
            UserFavoriteOrganization::create([
                'user_id' => $user->id,
                'organization_id' => $id,
            ]);
        }

        // $organization =  Organization::find($organization->id);

        // Redirect back to the organization's show page with its slug
        // return Inertia::render('frontend/organization/organization-show', ['slug' => $organization->slug, 'organization' => $organization]);

        return redirect()->route('organizations.show', ['slug' => $org->user->slug]);

    }
}
