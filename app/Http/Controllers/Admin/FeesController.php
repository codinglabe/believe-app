<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Form1023FeeService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FeesController extends Controller
{
    /**
     * Display the fees management page.
     */
    public function index()
    {
        return Inertia::render('admin/fees/Index', [
            'fees' => Form1023FeeService::schedule(),
        ]);
    }

    /**
     * Update the application fees.
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'form_1023_application_fee' => ['required', 'numeric', 'min:0', 'max:10000'],
            'form_1023_ez_application_fee' => ['required', 'numeric', 'min:0', 'max:10000'],
            'form_1023_processing_filing_fee' => ['required', 'numeric', 'min:0', 'max:10000'],
            'form_1023_ez_processing_filing_fee' => ['required', 'numeric', 'min:0', 'max:10000'],
            'compliance_application_fee' => ['required', 'numeric', 'min:0', 'max:10000'],
        ]);

        Form1023FeeService::persistSchedule($validated);

        return redirect()->back()->with('success', 'Application fees updated successfully.');
    }
}
