<?php

namespace App\Http\Controllers;

use App\Models\PrimaryActionCategory;
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

        $slug = $request->get('interest', optional($allCategories->first())->slug);

        $selectedCategory = $allCategories->firstWhere('slug', $slug)
            ?? $allCategories->first();

        // ── User's chosen causes (from profile/edit → Supporters Interest) ─
        $myCauses = [];
        if (auth()->check()) {
            $myCauses = auth()->user()
                ->supporterInterestCategories()
                ->select('primary_action_categories.id', 'primary_action_categories.name', 'primary_action_categories.slug')
                ->orderBy('sort_order')
                ->get()
                ->map(fn($c) => [
                    'id'   => $c->id,
                    'name' => $c->name,
                    'slug' => $c->slug,
                ]);
        }

        // ── Content filtered by selected PAC ─────────────────────────────
        $organizations = [];
        $events        = [];
        $courses       = [];
        $volunteers    = [];
        $impactCounts  = [];

        if ($selectedCategory) {
            // Organizations via org_primary_action_category pivot
            $orgIds = DB::table('org_primary_action_category')
                ->where('primary_action_category_id', $selectedCategory->id)
                ->pluck('organization_id');

            $organizations = DB::table('organizations')
                ->whereIn('id', $orgIds)
                ->select('id', 'name', 'ico', 'description', 'city', 'state', 'website')
                ->limit(10)
                ->get()
                ->map(fn($o) => [
                    'id'          => $o->id,
                    'name'        => $o->name,
                    'logo'        => $o->ico,
                    'description' => $o->description,
                    'city'        => $o->city,
                    'state'       => $o->state,
                    'website'     => $o->website,
                ]);

            // Events: from organizations linked to this PAC
            $events = DB::table('events')
                ->whereIn('organization_id', $orgIds)
                ->where('status', 'active')
                ->select('id', 'name', 'description', 'start_date', 'end_date', 'address', 'city', 'state')
                ->orderBy('start_date')
                ->limit(10)
                ->get()
                ->map(fn($e) => [
                    'id'          => $e->id,
                    'title'       => $e->name,
                    'description' => $e->description,
                    'start_date'  => $e->start_date ? date('M d, Y', strtotime($e->start_date)) : null,
                    'end_date'    => $e->end_date   ? date('M d, Y', strtotime($e->end_date))   : null,
                    'location'    => implode(', ', array_filter([$e->address, $e->city, $e->state])),
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
                ->map(fn($c) => [
                    'id'          => $c->id,
                    'title'       => $c->name,
                    'slug'        => $c->slug,
                    'description' => $c->description,
                    'start_date'  => $c->start_date,
                    'format'      => $c->format,
                    'is_free'     => $c->pricing_type === 'free' || ! $c->course_fee,
                    'fee'         => $c->course_fee,
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
                ->map(fn($v) => [
                    'id'          => $v->id,
                    'title'       => $v->title,
                    'description' => $v->description,
                    'location'    => implode(', ', array_filter([$v->city, $v->state])),
                    'date_posted' => $v->date_posted,
                    'deadline'    => $v->application_deadline,
                ]);

            $impactCounts = [
                'organizations' => $orgIds->count(),
                'events'        => DB::table('events')->whereIn('organization_id', $orgIds)->where('status', 'active')->count(),
                'courses'       => $courseIds->count(),
                'volunteers'    => $jobIds->count(),
            ];
        }

        return Inertia::render('explore-by-cause/index', [
            'categories' => $allCategories->map(fn($c) => [
                'id'   => $c->id,
                'name' => $c->name,
                'slug' => $c->slug,
            ]),
            'selectedCategory' => $selectedCategory ? [
                'id'          => $selectedCategory->id,
                'name'        => $selectedCategory->name,
                'slug'        => $selectedCategory->slug,
                'description' => null,
            ] : null,
            'organizations' => $organizations,
            'events'        => $events,
            'courses'       => $courses,
            'volunteers'    => $volunteers,
            'impactCounts'  => $impactCounts,
            'myCauses'      => $myCauses,
        ]);
    }

    public function toggleUserInterest(Request $request, PrimaryActionCategory $category)
    {
        $request->user()->supporterInterestCategories()->toggle($category->id);

        return back()->with('success', 'Your interest has been updated.');
    }
}
