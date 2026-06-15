<?php

namespace App\Http\Controllers;

use App\Services\SeoService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DevLoginController extends Controller
{
    /**
     * Developer-only login landing for the staging host (501c3ers.com).
     */
    public function create(Request $request): Response
    {
        if ($request->filled('redirect')) {
            $request->session()->put('url.intended', $request->redirect);
        }

        return Inertia::render('dev/login', [
            'seo' => [
                'title' => 'Developer Access',
                'description' => 'Sign in to the Believe In Unity development environment.',
            ],
            'status' => $request->session()->get('status'),
            'devHost' => $request->getHost(),
            'productionUrl' => config('app.production_url'),
            'organizationRegisterUrl' => route('dev.register.organization'),
        ]);
    }
}
