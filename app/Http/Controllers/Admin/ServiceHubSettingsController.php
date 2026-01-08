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
        $this->middleware('role:admin|organization');
    }

    /**
     * Display Service Hub settings page
     */
    public function index(): Response
    {
        $user = Auth::user();
        $isAdmin = $user->role === 'admin';

        // Get current settings (only for admin)
        $settings = null;
        if ($isAdmin) {
            $settings = [
                'platform_fee_percentage' => ServiceHubFeeService::getPlatformFeePercentage(),
                'stripe_transaction_fee_percentage' => ServiceHubFeeService::getStripeTransactionFeePercentage(),
                'believe_points_transaction_fee_percentage' => ServiceHubFeeService::getBelievePointsTransactionFeePercentage(),
                'monthly_advertising_fee' => ServiceHubFeeService::getMonthlyAdvertisingFee(),
            ];
        }

        // Get all states for sales tax management (for admin) or viewing (for organizations)
        $states = StateSalesTax::orderBy('state')->get()->map(function ($state) {
            return [
                'id' => $state->id,
                'state' => $state->state,
                'state_code' => $state->state_code,
                'base_sales_tax_rate' => (float) $state->base_sales_tax_rate,
                'rate_mode' => $state->rate_mode,
                'sales_tax_status' => $state->sales_tax_status,
                'services_vs_goods' => $state->services_vs_goods,
                'charitable_vs_resale' => $state->charitable_vs_resale,
                'requires_exemption_certificate' => $state->requires_exemption_certificate,
                'certificate_type_allowed' => $state->certificate_type_allowed,
                'site_to_apply_for_certificate' => $state->site_to_apply_for_certificate,
                'local_rates_apply' => $state->local_rates_apply,
                'last_updated' => $state->last_updated,
                'notes' => $state->notes,
            ];
        });

        return Inertia::render('admin/service-hub-settings', [
            'settings' => $settings,
            'states' => $states,
            'isAdmin' => $isAdmin,
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
