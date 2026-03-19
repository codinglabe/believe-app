<?php

namespace App\Http\Controllers;

use App\Models\AdminSetting;
use App\Models\KioskCategory;
use App\Models\KioskService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class KioskController extends Controller
{
    public function index(): Response
    {
        if (KioskCategory::count() === 0) {
            \Artisan::call('db:seed', ['--class' => \Database\Seeders\KioskCategoriesSeeder::class]);
        }

        $categories = KioskCategory::active()
            ->orderBy('sort_order')
            ->get()
            ->map(fn ($c) => [
                'slug' => $c->slug,
                'title' => $c->title,
                'keywords' => $c->keywords ?? '',
                'redirect_url' => $c->redirect_url ?? '',
            ]);

        $hero = AdminSetting::get('kiosk_hero', null);
        if (! is_array($hero)) {
            $hero = [
                'title' => 'How can we help today?',
                'subtitle' => 'Find assistance with bills, healthcare, government services, jobs, housing, and more',
            ];
        }

        return Inertia::render('frontend/Kiosk', [
            'seo' => [
                'title' => 'Kiosk - ' . ($hero['title'] ?? 'How can we help today?'),
                'description' => $hero['subtitle'] ?? 'Find assistance with bills, healthcare, government services, jobs, housing, and more.',
            ],
            'hero' => $hero,
            'categories' => $categories,
        ]);
    }

    public function services(Request $request): Response
    {
        $state = $request->query('state');
        $city = $request->query('city');
        $category = $request->query('category');
        $subcategory = $request->query('subcategory');
        $search = $request->query('search');

        $baseQuery = KioskService::active()
            ->inCategory($category)
            ->inState($state)
            ->inCity($city)
            ->subcategory($subcategory)
            ->search($search);

        $services = $baseQuery->with('category')
            ->orderBy('category_sort')
            ->orderBy('item_sort_within_category')
            ->orderBy('display_name')
            ->paginate(12)
            ->withQueryString()
            ->through(fn ($s) => [
                'id' => $s->id,
                'display_name' => $s->display_name,
                'subcategory' => $s->subcategory,
                'category_slug' => $s->category_slug,
                'category_title' => $s->category?->title ?? $s->category_slug,
                'url' => $s->url,
                'launch_type' => $s->launch_type,
            ]);

        $categoriesForFilter = KioskCategory::active()
            ->orderBy('sort_order')
            ->get(['slug', 'title'])
            ->map(fn ($c) => ['value' => $c->slug, 'label' => $c->title])
            ->all();

        $statesQuery = KioskService::active()->distinct()->whereNotNull('state')->where('state', '!=', '');
        $states = $statesQuery->orderBy('state')->pluck('state')->map(fn ($s) => ['value' => $s, 'label' => $s])->values()->all();

        $citiesQuery = KioskService::active()->distinct()->whereNotNull('city')->where('city', '!=', '');
        $citiesQuery->inCategory($category)->inState($state);
        $cities = $citiesQuery->orderBy('city')->pluck('city')->map(fn ($c) => ['value' => $c, 'label' => $c])->values()->all();

        $subcategoriesQuery = KioskService::active()->distinct()->whereNotNull('subcategory')->where('subcategory', '!=', '');
        $subcategoriesQuery->inCategory($category)->inState($state)->inCity($city);
        $subcategories = $subcategoriesQuery->orderBy('subcategory')->pluck('subcategory')->map(fn ($s) => ['value' => $s, 'label' => $s])->values()->all();

        $hero = AdminSetting::get('kiosk_hero', null);
        if (! is_array($hero)) {
            $hero = ['title' => 'How can we help today?', 'subtitle' => 'Find assistance with bills, healthcare, government services, jobs, housing, and more'];
        }

        return Inertia::render('frontend/KioskServices', [
            'seo' => [
                'title' => 'Kiosk Services',
                'description' => 'Browse services by state, city, category, and subcategory.',
            ],
            'hero' => $hero,
            'services' => $services,
            'filters' => [
                'state' => $state,
                'city' => $city,
                'category' => $category,
                'subcategory' => $subcategory,
                'search' => $search,
            ],
            'filterOptions' => [
                'states' => $states,
                'cities' => $cities,
                'categories' => $categoriesForFilter,
                'subcategories' => $subcategories,
            ],
        ]);
    }
}
