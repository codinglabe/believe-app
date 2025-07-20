<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\User;
use App\Models\UserFavoriteOrganization;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        if($request->user()->role === 'admin') {
            $totalOrg =  Organization::get()->count();
        }else{
            $organization = Organization::where('user_id', $request->user()->id)->first();
            $totalFav = UserFavoriteOrganization::where('organization_id', $organization->id)->count();
        }

        return Inertia::render('dashboard', [
            'totalOrg' => $totalOrg ?? 0,
            'orgInfo' => $organization ?? null,
            'totalFav' => $totalFav ?? 0,
        ]);
    }
}
