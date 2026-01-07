<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminSetting;
use App\Models\StateSalesTax;
use App\Services\ServiceHubFeeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ServiceHubSettingsController extends Controller
{
    public function __construct()
    {
        $this->middleware('role:admin');
    }

    /**
     * Display Service Hub settings page
     */
    public function index(): Response
    {
        // Double check admin authorization
        if (Auth::user()->role !== 'admin') {
            abort(403, 'Only administrators can access Service Hub settings.');
        }

        // Get current settings
        $settings = [
            'platform_fee_percentage' => ServiceHubFeeService::getPlatformFeePercentage(),
            'stripe_transaction_fee_percentage' => ServiceHubFeeService::getStripeTransactionFeePercentage(),
            'believe_points_transaction_fee_percentage' => ServiceHubFeeService::getBelievePointsTransactionFeePercentage(),
            'monthly_advertising_fee' => ServiceHubFeeService::getMonthlyAdvertisingFee(),
        ];

        // Get all states for sales tax management
        $states = StateSalesTax::orderBy('state')->get();

        return Inertia::render('admin/service-hub-settings', [
            'settings' => $settings,
            'states' => $states,
        ]);
    }

    /**
     * Update Service Hub fee settings
     */
    public function updateFees(Request $request)
    {
        // Double check admin authorization
        if (Auth::user()->role !== 'admin') {
            abort(403, 'Only administrators can update Service Hub settings.');
        }

        $validated = $request->validate([
            'platform_fee_percentage' => 'required|numeric|min:0|max:100',
            'stripe_transaction_fee_percentage' => 'required|numeric|min:0|max:100',
            'believe_points_transaction_fee_percentage' => 'required|numeric|min:0|max:100',
            'monthly_advertising_fee' => 'required|numeric|min:0',
        ]);

        // Save settings to database
        AdminSetting::set('service_hub_platform_fee_percentage', $validated['platform_fee_percentage'], 'float');
        AdminSetting::set('service_hub_stripe_transaction_fee_percentage', $validated['stripe_transaction_fee_percentage'], 'float');
        AdminSetting::set('service_hub_believe_points_transaction_fee_percentage', $validated['believe_points_transaction_fee_percentage'], 'float');
        AdminSetting::set('service_hub_monthly_advertising_fee', $validated['monthly_advertising_fee'], 'float');

        return back()->with('success', 'Service Hub fee settings updated successfully!');
    }

    /**
     * Update state sales tax rate
     */
    public function updateStateTax(Request $request, $stateId)
    {
        // Double check admin authorization
        if (Auth::user()->role !== 'admin') {
            abort(403, 'Only administrators can update sales tax settings.');
        }

        $validated = $request->validate([
            'base_sales_tax_rate' => 'required|numeric|min:0|max:100',
        ]);

        $state = StateSalesTax::findOrFail($stateId);
        $state->update([
            'base_sales_tax_rate' => $validated['base_sales_tax_rate'],
        ]);

        return back()->with('success', "Sales tax rate for {$state->state} updated successfully!");
    }

    /**
     * Bulk update state sales tax rates
     */
    public function bulkUpdateStateTaxes(Request $request)
    {
        // Double check admin authorization
        if (Auth::user()->role !== 'admin') {
            abort(403, 'Only administrators can update sales tax settings.');
        }

        $validated = $request->validate([
            'taxes' => 'required|array',
            'taxes.*.id' => 'required|exists:state_sales_taxes,id',
            'taxes.*.base_sales_tax_rate' => 'required|numeric|min:0|max:100',
        ]);

        foreach ($validated['taxes'] as $taxData) {
            StateSalesTax::where('id', $taxData['id'])->update([
                'base_sales_tax_rate' => $taxData['base_sales_tax_rate'],
            ]);
        }

        return back()->with('success', 'Sales tax rates updated successfully!');
    }
}
