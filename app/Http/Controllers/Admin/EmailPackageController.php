<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\BaseController;
use App\Models\EmailPackage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class EmailPackageController extends BaseController
{
    /**
     * Display a listing of email packages.
     */
    public function index(Request $request)
    {
        $this->authorizeRole($request, 'admin');

        $packages = EmailPackage::ordered()->get();

        return Inertia::render('admin/EmailPackages/Index', [
            'packages' => $packages,
        ]);
    }

    /**
     * Show the form for creating a new email package.
     */
    public function create(Request $request)
    {
        $this->authorizeRole($request, 'admin');

        return Inertia::render('admin/EmailPackages/Create');
    }

    /**
     * Store a newly created email package.
     */
    public function store(Request $request)
    {
        $this->authorizeRole($request, 'admin');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:255',
            'emails_count' => 'required|integer|min:1',
            'price' => 'required|numeric|min:0',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        try {
            EmailPackage::create($validated);

            return redirect()->route('admin.email-packages.index')
                ->with('success', 'Email package created successfully.');
        } catch (\Exception $e) {
            Log::error('Email package creation error: ' . $e->getMessage());
            return redirect()->back()
                ->withInput()
                ->with('error', 'Failed to create email package: ' . $e->getMessage());
        }
    }

    /**
     * Show the form for editing the specified email package.
     */
    public function edit(Request $request, EmailPackage $emailPackage)
    {
        $this->authorizeRole($request, 'admin');

        return Inertia::render('admin/EmailPackages/Edit', [
            'package' => $emailPackage,
        ]);
    }

    /**
     * Update the specified email package.
     */
    public function update(Request $request, EmailPackage $emailPackage)
    {
        $this->authorizeRole($request, 'admin');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:255',
            'emails_count' => 'required|integer|min:1',
            'price' => 'required|numeric|min:0',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        try {
            $emailPackage->update($validated);

            return redirect()->route('admin.email-packages.index')
                ->with('success', 'Email package updated successfully.');
        } catch (\Exception $e) {
            Log::error('Email package update error: ' . $e->getMessage());
            return redirect()->back()
                ->withInput()
                ->with('error', 'Failed to update email package: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified email package.
     */
    public function destroy(Request $request, EmailPackage $emailPackage)
    {
        $this->authorizeRole($request, 'admin');

        try {
            $emailPackage->delete();

            return redirect()->route('admin.email-packages.index')
                ->with('success', 'Email package deleted successfully.');
        } catch (\Exception $e) {
            Log::error('Email package deletion error: ' . $e->getMessage());
            return redirect()->back()
                ->with('error', 'Failed to delete email package: ' . $e->getMessage());
        }
    }
}
