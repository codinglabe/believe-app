<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReferralLinkController extends Controller
{
    public function edit(Request $request)
    {
    
        $user = $request->user();
        return Inertia::render('settings/referral', [
            'referral_code' => $user->referral_code,
        ]);
    }
} 