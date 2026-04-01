<?php

namespace App\Http\Controllers;

use App\Models\CareAlliance;
use App\Models\PrimaryActionCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;

class FindCareAlliancesController extends Controller
{
    /**
     * Display the Find Care Alliances page (filters, sort, pagination — mirrors Find Supporters).
     */
    public function index(Request $request)
    {
        $currentUser = Auth::user();

        $pacKey = (new PrimaryActionCategory)->getQualifiedKeyName();

        $query = CareAlliance::query()
            ->where('status', 'active');

        $search = trim((string) $request->get('q', ''));
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', '%'.$search.'%')
                    ->orWhere('slug', 'LIKE', '%'.$search.'%')
                    ->orWhere('city', 'LIKE', '%'.$search.'%')
                    ->orWhere('state', 'LIKE', '%'.$search.'%');
                if (strlen($search) >= 3) {
                    $q->orWhere('description', 'LIKE', '%'.$search.'%');
                }
            });
        }

        $sameCauses = $request->boolean('same_causes');
        if ($sameCauses && $currentUser) {
            $myCauseIds = $currentUser->supporterInterestCategories()->pluck($pacKey)->toArray();
            if (! empty($myCauseIds)) {
                $query->whereHas('primaryActionCategories', function ($q) use ($myCauseIds, $pacKey) {
                    $q->whereIn($pacKey, $myCauseIds);
                });
            }
        }

        $causeIds = $request->input('causes', $request->input('interests', []));
        if (! is_array($causeIds)) {
            $causeIds = array_filter(explode(',', (string) $causeIds));
        }
        $causeIds = array_values(array_unique(array_filter(array_map('intval', $causeIds), fn (int $id) => $id > 0)));
        if (! empty($causeIds)) {
            $allowed = PrimaryActionCategory::query()
                ->where('is_active', true)
                ->whereIn('id', $causeIds)
                ->pluck('id')
                ->all();
            if (! empty($allowed)) {
                $query->whereHas('primaryActionCategories', function ($q) use ($allowed, $pacKey) {
                    $q->whereIn($pacKey, $allowed);
                });
            }
        }

        $location = trim((string) $request->get('location', ''));
        if ($location !== '') {
            $query->where(function ($q) use ($location) {
                $q->where('city', 'LIKE', '%'.$location.'%')
                    ->orWhere('state', 'LIKE', '%'.$location.'%');
            });
        }

        $sort = $request->get('sort', 'best_match');

        $query->select([
            'care_alliances.id',
            'care_alliances.slug',
            'care_alliances.name',
            'care_alliances.description',
            'care_alliances.city',
            'care_alliances.state',
            'care_alliances.created_at',
        ]);

        $query->withCount([
            'memberships as active_members_count' => fn ($q) => $q->where('status', 'active'),
            'campaigns as active_campaigns_count' => fn ($q) => $q->where('status', 'active'),
        ]);

        $query->with(['primaryActionCategories' => function ($q) {
            $q->where('is_active', true)->orderBy('sort_order')->orderBy('name');
        }]);

        if ($sort === 'most_members') {
            $query->orderByDesc('active_members_count');
        } elseif ($sort === 'newest') {
            $query->orderByDesc('care_alliances.created_at');
        } else {
            $query->orderBy('care_alliances.name');
        }

        $paginator = $query->paginate(12)->withQueryString();

        $alliances = $paginator->through(function (CareAlliance $alliance) {
            $plain = $alliance->description ? trim(strip_tags($alliance->description)) : '';
            $descriptionPreview = $plain !== '' ? Str::limit($plain, 220) : null;

            return [
                'id' => $alliance->id,
                'slug' => $alliance->slug,
                'name' => $alliance->name,
                'description_preview' => $descriptionPreview,
                'location' => implode(', ', array_filter([$alliance->city, $alliance->state])) ?: null,
                'interests' => $alliance->primaryActionCategories->pluck('name')->values()->all(),
                'active_members_count' => (int) $alliance->active_members_count,
                'active_campaigns_count' => (int) $alliance->active_campaigns_count,
            ];
        });

        $interestOptions = PrimaryActionCategory::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn ($row) => ['id' => $row->id, 'name' => $row->name]);

        return Inertia::render('frontend/find-care-alliances', [
            'seo' => \App\Services\SeoService::forPage('find_care_alliances'),
            'alliances' => $alliances,
            'searchQuery' => $search,
            'filters' => [
                'same_causes' => $sameCauses,
                'causes' => $causeIds,
                'location' => $location,
                'radius' => $request->get('radius', ''),
                'sort' => $sort,
            ],
            'interestOptions' => $interestOptions,
        ]);
    }
}
