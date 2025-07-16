<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        if($request->user()->role === 'admin') {
            $totalOrg =  Organization::get()->count();
        }

        return Inertia::render('dashboard', [
            'totalOrg' => $totalOrg ?? 0,
        ]);
    }
}
