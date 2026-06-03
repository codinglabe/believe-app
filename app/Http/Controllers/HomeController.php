<?php

namespace App\Http\Controllers;

use App\Services\SeoService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class HomeController extends Controller
{
    public function index(Request $request)
    {
        if (! $request->user() && is_development_site($request)) {
            return app(DevLoginController::class)->create($request);
        }

        return Inertia::render('frontend/home', [
            'seo' => SeoService::forPage('home'),
            'homeHero' => SeoService::getHomeHero(),
        ]);
    }
}
