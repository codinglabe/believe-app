<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Support\PayAsYouGoServices;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PayAsYouGoServicesController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('settings/pay-as-you-go', [
            'services' => PayAsYouGoServices::forUser($user),
            'stripeMinCheckoutUsd' => \App\Support\EmailPackageCatalog::stripeMinCheckoutUsd(),
        ]);
    }
}
