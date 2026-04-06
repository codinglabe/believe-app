<?php
// app/Http/Controllers/AdminSettingsController.php

namespace App\Http\Controllers;

use App\Models\AdminSetting;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AdminSettingsController extends Controller
{
    public function index()
    {
        $settings = [
            'email_verification_required' => AdminSetting::get('email_verification_required', true),
            // Add more settings as needed
        ];

        return Inertia::render('Admin/Settings', [
            'settings' => $settings
        ]);
    }

    public function update(Request $request)
    {
        $request->validate([
            'email_verification_required' => 'required|boolean',
        ]);

        AdminSetting::set(
            'email_verification_required',
            $request->email_verification_required,
            'boolean'
        );

        return back()->with('success', 'Settings updated successfully!');
    }

    public function getVerificationStatus()
    {
        return response()->json([
            'verification_required' => AdminSetting::get('email_verification_required', true)
        ]);
    }
}
