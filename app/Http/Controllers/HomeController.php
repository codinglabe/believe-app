<?php

namespace App\Http\Controllers;

use App\Http\Helpers\AuthRedirectHelper;
use App\Services\SeoService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class HomeController extends Controller
{
    public function index(Request $request)
    {
        if (is_development_site($request)) {
            return app(DevLoginController::class)->create($request);
        }

        if (
            ! is_livestock_domain()
            && ! request_is_merchant_portal($request)
            && request_is_mobile_phone_client($request)
        ) {
            if ($request->user()) {
                return redirect()->to(AuthRedirectHelper::defaultRedirectForUser($request->user()));
            }

            return redirect()->route('login');
        }

        return Inertia::render('frontend/home', [
            'seo' => SeoService::forPage('home'),
            'homeHero' => SeoService::getHomeHero(),
        ]);
    }
}
