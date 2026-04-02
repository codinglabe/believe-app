<?php

namespace App\Http\Controllers;

use App\Models\InterestCategory;
use App\Models\Organization;
use App\Models\Event;
use App\Models\Course;
use App\Models\JobPost;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ExploreByCauseController extends Controller
{
    public function index(Request $request)
    {
        $allCategories = InterestCategory::active()->get();

        $slug = $request->get('interest', optional($allCategories->first())->slug);

        $selectedCategory = InterestCategory::where('slug', $slug)
            ->where('is_active', true)
            ->first();

        if (! $selectedCategory && $allCategories->isNotEmpty()) {
            $selectedCategory = $allCategories->first();
        }

        $organizations = [];
        $events        = [];
        $courses       = [];
        $volunteers    = [];
        $impactCounts  = [];
        $myCauses      = [];

        if ($selectedCategory) {
            $organizations = $selectedCategory->organizations()
                ->select('organizations.id', 'organizations.name', 'organizations.ico', 'organizations.email', 'organizations.city', 'organizations.state', 'organizations.website')
                ->limit(10)
                ->get()
                ->map(fn($org) => [
                    'id'          => $org->id,
                    'name'        => $org->name,
                    'logo'        => $org->ico,
                    'description' => $org->email ? "Contact: {$org->email}" : null,
                    'city'        => $org->city,
                    'state'       => $org->state,
                    'website'     => $org->website,
                ]);

            $events = $selectedCategory->events()
                ->select('events.id', 'events.name', 'events.description', 'events.start_date', 'events.end_date', 'events.city', 'events.state', 'events.address')
                ->where('events.status', 'active')
                ->orderBy('events.start_date')
                ->limit(10)
                ->get()
                ->map(fn($e) => [
                    'id'          => $e->id,
                    'title'       => $e->name,
                    'description' => $e->description,
                    'start_date'  => $e->start_date?->format('M d, Y'),
                    'end_date'    => $e->end_date?->format('M d, Y'),
                    'location'    => trim("{$e->address}, {$e->city}, {$e->state}", ', '),
                ]);

            $courses = $selectedCategory->courses()
                ->select('courses.id', 'courses.name', 'courses.slug', 'courses.description', 'courses.start_date', 'courses.format', 'courses.pricing_type', 'courses.course_fee')
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

            $volunteers = $selectedCategory->jobPosts()
                ->select('job_posts.id', 'job_posts.title', 'job_posts.description', 'job_posts.city', 'job_posts.state', 'job_posts.date_posted', 'job_posts.application_deadline', 'job_posts.organization_id')
                ->where('job_posts.status', 'active')
                ->limit(10)
                ->get()
                ->map(fn($v) => [
                    'id'          => $v->id,
                    'title'       => $v->title,
                    'description' => $v->description,
                    'location'    => trim("{$v->city}, {$v->state}", ', '),
                    'date_posted' => $v->date_posted,
                    'deadline'    => $v->application_deadline,
                ]);

            $impactCounts = [
                'organizations' => $selectedCategory->organizations()->count(),
                'events'        => $selectedCategory->events()->where('events.status', 'active')->count(),
                'courses'       => $selectedCategory->courses()->count(),
                'volunteers'    => $selectedCategory->jobPosts()->where('job_posts.status', 'active')->count(),
            ];
        }

        if (auth()->check()) {
            $myCauses = auth()->user()->interestCategories()
                ->select('interest_categories.id', 'interest_categories.name', 'interest_categories.slug', 'interest_categories.color')
                ->get()
                ->map(fn($c) => [
                    'id'    => $c->id,
                    'name'  => $c->name,
                    'slug'  => $c->slug,
                    'color' => $c->color,
                ]);
        }

        return Inertia::render('explore-by-cause/index', [
            'categories'       => $allCategories->map(fn($c) => [
                'id'          => $c->id,
                'name'        => $c->name,
                'slug'        => $c->slug,
                'description' => $c->description,
                'color'       => $c->color,
                'icon'        => $c->icon,
            ]),
            'selectedCategory' => $selectedCategory ? [
                'id'          => $selectedCategory->id,
                'name'        => $selectedCategory->name,
                'slug'        => $selectedCategory->slug,
                'description' => $selectedCategory->description,
                'color'       => $selectedCategory->color,
            ] : null,
            'organizations'    => $organizations,
            'events'           => $events,
            'courses'          => $courses,
            'volunteers'       => $volunteers,
            'impactCounts'     => $impactCounts,
            'myCauses'         => $myCauses,
        ]);
    }

    public function toggleUserInterest(Request $request, InterestCategory $category)
    {
        $user = $request->user();
        $user->interestCategories()->toggle($category->id);

        return back()->with('success', 'Your interest has been updated.');
    }
}
