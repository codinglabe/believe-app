<?php

namespace App\Http\Controllers;

use App\Models\NteeCode;
use App\Models\Organization;
use Illuminate\Http\Request;
use Inertia\Inertia;

class HomeController extends Controller
{
    public function index(Request $request)
    {
        // Get filter options for search
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
            ->distinct()
            ->orderBy('city')
            ->pluck('city')
            ->prepend('All Cities');

        // Get featured organizations (latest 6 verified organizations)
        $featuredOrganizations = Organization::with(['nteeCode', 'user'])
            ->where('registration_status', 'approved')
            ->latest()
            ->limit(6)
            ->get();

        return Inertia::render('frontend/home', [
            'filters' => [
                'search' => $request->get('search'),
                'category' => $request->get('category'),
                'state' => $request->get('state'),
                'city' => $request->get('city'),
                'zip' => $request->get('zip'),
            ],
            'filterOptions' => [
                'categories' => $categories,
                'states' => $states,
                'cities' => $cities,
            ],
            'featuredOrganizations' => $featuredOrganizations,
        ]);
    }
}
