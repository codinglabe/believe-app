<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\PrimaryActionCategory;
use App\Models\User;
use App\Services\CauseGroupChatService;
use App\Models\UserFavoriteOrganization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ExploreByCauseController extends Controller
{
    public function index(Request $request)
    {
        // ── All active causes (from the real PAC table) ──────────────────
        $allCategories = PrimaryActionCategory::where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        // ── User's profile causes (Supporters Interest). When non-empty, the page
        // and `interest=` query are scoped to these only (dropdown + data).
        $userMyCauses = collect();
        if (auth()->check()) {
            $userMyCauses = auth()->user()
                ->supporterInterestCategories()
                ->where('primary_action_categories.is_active', true)
                ->orderBy('primary_action_categories.sort_order')
                ->get();
        }

        $myCauses = $userMyCauses
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'slug' => $c->slug,
            ])
            ->values()
            ->all();

        if ($userMyCauses->isNotEmpty()) {
            $defaultSlug = $userMyCauses->first()->slug;
            $requestSlug = $request->get('interest', $defaultSlug);
            $selectedCategory = $userMyCauses->firstWhere('slug', $requestSlug)
                ?? $userMyCauses->first();
        } else {
            $slug = $request->get('interest', optional($allCategories->first())->slug);
            $selectedCategory = $allCategories->firstWhere('slug', $slug)
                ?? $allCategories->first();
        }

        // ── Content filtered by selected PAC ─────────────────────────────
        $organizations = [];
        $events = [];
        $courses = [];
        $volunteers = [];
        $impactCounts = [];

        $authUser = auth()->user();
        $canFollowOrganizations = $authUser instanceof User && $authUser->canFollowOrganizations();

        if ($selectedCategory) {
            // Organizations via org_primary_action_category pivot (same eligibility rules as toggle-favorite)
            $pacOrgIds = DB::table('org_primary_action_category')
                ->where('primary_action_category_id', $selectedCategory->id)
                ->pluck('organization_id');

            $eligibleOrgIds = Organization::query()
                ->active()
                ->excludingCareAllianceHubs()
                ->whereIn('id', $pacOrgIds)
                ->pluck('id');

            $favoriteOrgIds = collect();
            if ($canFollowOrganizations && $authUser) {
                $favoriteOrgIds = UserFavoriteOrganization::query()
                    ->where('user_id', $authUser->id)
                    ->whereNotNull('organization_id')
                    ->whereIn('organization_id', $eligibleOrgIds)
                    ->pluck('organization_id');
            }

            $organizations = Organization::query()
                ->active()
                ->excludingCareAllianceHubs()
                ->whereIn('id', $pacOrgIds)
                ->orderBy('name')
                ->limit(10)
                ->get(['id', 'name', 'ico', 'description', 'city', 'state', 'website'])
                ->map(fn ($o) => [
                    'id' => $o->id,
                    'name' => $o->name,
                    'logo' => $o->ico,
                    'description' => $o->description,
                    'city' => $o->city,
                    'state' => $o->state,
                    'website' => $o->website,
                    'is_following' => $favoriteOrgIds->contains($o->id),
                ]);

            // Events: orgs linked to this PAC, or events tagged with this PAC (status uses upcoming/ongoing/completed/cancelled — not "active")
            $eventsQuery = DB::table('events')
                ->where(function ($q) use ($eligibleOrgIds, $selectedCategory) {
                    $q->whereIn('organization_id', $eligibleOrgIds)
                        ->orWhere('primary_action_category_id', $selectedCategory->id);
                })
                ->whereIn('status', ['upcoming', 'ongoing'])
                ->where('visibility', 'public');

            $events = (clone $eventsQuery)
                ->select('id', 'name', 'description', 'start_date', 'end_date', 'address', 'city', 'state')
                ->orderBy('start_date')
                ->limit(10)
                ->get()
                ->map(fn ($e) => [
                    'id' => $e->id,
                    'title' => $e->name,
                    'description' => $e->description,
                    'start_date' => $e->start_date ? date('M d, Y', strtotime($e->start_date)) : null,
                    'end_date' => $e->end_date ? date('M d, Y', strtotime($e->end_date)) : null,
                    'location' => implode(', ', array_filter([$e->address, $e->city, $e->state])),
                ]);

            // Courses via course_pac pivot
            $courseIds = DB::table('course_pac')
                ->where('primary_action_category_id', $selectedCategory->id)
                ->pluck('course_id');

            $courses = DB::table('courses')
                ->whereIn('id', $courseIds)
                ->select('id', 'name', 'slug', 'description', 'start_date', 'format', 'pricing_type', 'course_fee')
                ->limit(10)
                ->get()
                ->map(fn ($c) => [
                    'id' => $c->id,
                    'title' => $c->name,
                    'slug' => $c->slug,
                    'description' => $c->description,
                    'start_date' => $c->start_date,
                    'format' => $c->format,
                    'is_free' => $c->pricing_type === 'free' || ! $c->course_fee,
                    'fee' => $c->course_fee,
                ]);

            // Volunteer/Job posts via job_post_pac pivot
            $jobIds = DB::table('job_post_pac')
                ->where('primary_action_category_id', $selectedCategory->id)
                ->pluck('job_post_id');

            $volunteers = DB::table('job_posts')
                ->whereIn('id', $jobIds)
                ->where('status', 'active')
                ->select('id', 'title', 'description', 'city', 'state', 'date_posted', 'application_deadline')
                ->limit(10)
                ->get()
                ->map(fn ($v) => [
                    'id' => $v->id,
                    'title' => $v->title,
                    'description' => $v->description,
                    'location' => implode(', ', array_filter([$v->city, $v->state])),
                    'date_posted' => $v->date_posted,
                    'deadline' => $v->application_deadline,
                ]);

            $impactCounts = [
                'organizations' => $eligibleOrgIds->count(),
                'events' => (clone $eventsQuery)->count(),
                'courses' => $courseIds->count(),
                'volunteers' => $jobIds->count(),
            ];
        }

        return Inertia::render('explore-by-cause/index', [
            'categories' => $allCategories->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'slug' => $c->slug,
            ]),
            'selectedCategory' => $selectedCategory ? [
                'id' => $selectedCategory->id,
                'name' => $selectedCategory->name,
                'slug' => $selectedCategory->slug,
                'description' => null,
            ] : null,
            'organizations' => $organizations,
            'events' => $events,
            'courses' => $courses,
            'volunteers' => $volunteers,
            'impactCounts' => $impactCounts,
            'myCauses' => $myCauses,
            'canFollowOrganizations' => $canFollowOrganizations,
        ]);
    }

    public function toggleUserInterest(Request $request, PrimaryActionCategory $category)
    {
        /** @var User $user */
        $user = $request->user();
        if (! $user->canFollowOrganizations()) {
            return back()->with('error', __('Only supporter accounts can follow causes.'));
        }

        $user->supporterInterestCategories()->toggle($category->id);
        $user->load('supporterInterestCategories');
        if ($user->supporterInterestCategories->pluck('id')->contains((int) $category->id)) {
            app(CauseGroupChatService::class)->ensureForUserAndPrimaryActionCategory($user, (int) $category->id);
        }

        return back()->with('success', 'Your interest has been updated.');
    }
}
