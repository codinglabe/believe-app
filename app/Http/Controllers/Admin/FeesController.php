<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminSetting;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FeesController extends Controller
{
    /**
     * Display the fees management page.
     */
    public function index()
    {
        $form1023Fee = (float) AdminSetting::get('form_1023_application_fee', 600.00);
        $complianceFee = (float) AdminSetting::get('compliance_application_fee', 399.00);

        return Inertia::render('admin/fees/Index', [
            'fees' => [
                'form_1023_application_fee' => $form1023Fee,
                'compliance_application_fee' => $complianceFee,
            ],
        ]);
    }

    /**
     * Update the application fees.
     */
    public function update(Request $request)
    {
        $request->validate([
            'form_1023_application_fee' => ['required', 'numeric', 'min:0', 'max:10000'],
            'compliance_application_fee' => ['required', 'numeric', 'min:0', 'max:10000'],
        ]);

        AdminSetting::set('form_1023_application_fee', $request->input('form_1023_application_fee'), 'float');
        AdminSetting::set('compliance_application_fee', $request->input('compliance_application_fee'), 'float');

        return redirect()->back()->with('success', 'Application fees updated successfully.');
    }
}


