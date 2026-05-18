<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\StateSalesTax;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class StateSalesTaxController extends Controller
{
    /**
     * Display a listing of all state sales tax rates
     */
    public function index(Request $request): Response
    {
        // Allow both admin and organization roles
        if (!in_array(Auth::user()->role, ['admin', 'organization'])) {
            abort(403, 'Unauthorized access.');
        }
        $query = StateSalesTax::orderBy('state');

        // Filter by rate mode
        if ($request->has('rate_mode') && $request->rate_mode !== 'all') {
            $query->where('rate_mode', $request->rate_mode);
        }

        // Filter by sales tax status
        if ($request->has('sales_tax_status') && $request->sales_tax_status !== 'all') {
            $query->where('sales_tax_status', $request->sales_tax_status);
        }

        // Filter by requires exemption certificate
        if ($request->has('requires_certificate') && $request->requires_certificate !== 'all') {
            $query->where('requires_exemption_certificate', $request->requires_certificate === 'yes');
        }

        // Search by state name or code
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('state', 'like', "%{$search}%")
                  ->orWhere('state_code', 'like', "%{$search}%");
            });
        }

        $states = $query->paginate(50)->through(function ($state) {
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

        $isAdmin = Auth::user()->role === 'admin';
        $viewPath = $isAdmin ? 'admin/state-sales-tax/Index' : 'settings/state-sales-tax';

        return Inertia::render($viewPath, [
            'states' => $states,
            'filters' => [
                'rate_mode' => $request->rate_mode ?? 'all',
                'sales_tax_status' => $request->sales_tax_status ?? 'all',
                'requires_certificate' => $request->requires_certificate ?? 'all',
                'search' => $request->search ?? '',
            ],
        ]);
    }

    /**
     * Display the specified state sales tax details
     */
    public function show(StateSalesTax $stateSalesTax): Response
    {
        // Allow both admin and organization roles
        if (!in_array(Auth::user()->role, ['admin', 'organization'])) {
            abort(403, 'Unauthorized access.');
        }

        $isAdmin = Auth::user()->role === 'admin';
        $viewPath = $isAdmin ? 'admin/state-sales-tax/Show' : 'settings/state-sales-tax-show';

        return Inertia::render($viewPath, [
            'state' => [
                'id' => $stateSalesTax->id,
                'state' => $stateSalesTax->state,
                'state_code' => $stateSalesTax->state_code,
                'base_sales_tax_rate' => (float) $stateSalesTax->base_sales_tax_rate,
                'rate_mode' => $stateSalesTax->rate_mode,
                'local_rates_apply' => $stateSalesTax->local_rates_apply,
                'last_updated' => $stateSalesTax->last_updated,
                'notes' => $stateSalesTax->notes,
                'sales_tax_status' => $stateSalesTax->sales_tax_status,
                'services_vs_goods' => $stateSalesTax->services_vs_goods,
                'charitable_vs_resale' => $stateSalesTax->charitable_vs_resale,
                'requires_exemption_certificate' => $stateSalesTax->requires_exemption_certificate,
                'certificate_type_allowed' => $stateSalesTax->certificate_type_allowed,
                'site_to_apply_for_certificate' => $stateSalesTax->site_to_apply_for_certificate,
            ],
        ]);
    }

    /**
     * Update state sales tax rate (Admin only)
     */
    public function update(Request $request, StateSalesTax $stateSalesTax)
    {
        if (Auth::user()->role !== 'admin') {
            abort(403, 'Only administrators can update sales tax rates.');
        }

        $validated = $request->validate([
            'base_sales_tax_rate' => 'required|numeric|min:0|max:100',
            'notes' => 'nullable|string|max:1000',
        ]);

        $stateSalesTax->update([
            'base_sales_tax_rate' => $validated['base_sales_tax_rate'],
            'notes' => $validated['notes'] ?? $stateSalesTax->notes,
            'last_updated' => now()->format('Y-m'),
        ]);

        return back()->with('success', "Sales tax rate for {$stateSalesTax->state} updated successfully!");
    }
}
