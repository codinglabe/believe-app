<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FractionalOffering;
use App\Models\FractionalAsset;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FractionalOfferingController extends Controller
{
    public function index()
    {
        $offerings = FractionalOffering::with('asset')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return Inertia::render('admin/fractional/OfferingIndex', [
            'offerings' => $offerings,
        ]);
    }

    public function create()
    {
        return Inertia::render('admin/fractional/OfferingCreate', [
            'assets' => FractionalAsset::select('id', 'name')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'asset_id' => ['required', 'exists:fractional_assets,id'],
            'title' => ['required', 'string', 'max:255'],
            'summary' => ['nullable', 'string'],
            'total_shares' => ['required', 'integer', 'min:1'],
            'available_shares' => ['required', 'integer', 'min:0', 'lte:total_shares'],
            'price_per_share' => ['required', 'numeric', 'min:0'],
            'token_price' => ['required', 'numeric', 'min:0'],
            'ownership_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'currency' => ['required', 'string', 'size:3'],
            'status' => ['required', 'in:draft,live,sold_out,closed'],
            'go_live_at' => ['nullable', 'date'],
            'close_at' => ['nullable', 'date', 'after:go_live_at'],
            'meta' => ['nullable', 'array'],
        ]);

        // Calculate ownership percentage automatically if not provided
        if (empty($validated['ownership_percentage']) && $validated['price_per_share'] > 0) {
            $validated['ownership_percentage'] = ($validated['token_price'] / $validated['price_per_share']) * 100;
        }

        FractionalOffering::create($validated);

        return redirect()->route('admin.fractional.offerings.index')->with('success', 'Offering created successfully.');
    }

    public function show(FractionalOffering $offering)
    {
        $offering->load(['asset', 'orders.user' => function ($query) {
            $query->select('id', 'name', 'email');
        }]);

        // Get all paid orders for this offering
        $orders = $offering->orders()
            ->where('status', 'paid')
            ->with('user:id,name,email')
            ->orderBy('paid_at', 'desc')
            ->get();

        // Calculate stats
        $totalRevenue = $orders->sum('amount');
        $totalBuyers = $orders->pluck('user_id')->unique()->count();
        
        // Only count full shares (from meta or shares field), not tokens
        $totalShares = $orders->sum(function ($order) {
            $meta = $order->meta ?? [];
            return $meta['full_shares'] ?? $order->shares ?? 0;
        });
        
        $totalTokens = $orders->sum('tokens');

        return Inertia::render('admin/fractional/OfferingShow', [
            'offering' => $offering,
            'orders' => $orders,
            'stats' => [
                'total_revenue' => $totalRevenue,
                'total_buyers' => $totalBuyers,
                'total_shares' => $totalShares,
                'total_tokens' => $totalTokens,
            ],
        ]);
    }

    public function edit(FractionalOffering $offering)
    {
        return Inertia::render('admin/fractional/OfferingEdit', [
            'offering' => $offering->load('asset'),
            'assets' => FractionalAsset::select('id', 'name')->orderBy('name')->get(),
        ]);
    }

    public function update(Request $request, FractionalOffering $offering)
    {
        $validated = $request->validate([
            'asset_id' => ['required', 'exists:fractional_assets,id'],
            'title' => ['required', 'string', 'max:255'],
            'summary' => ['nullable', 'string'],
            'total_shares' => ['required', 'integer', 'min:1'],
            'available_shares' => ['required', 'integer', 'min:0', 'lte:total_shares'],
            'price_per_share' => ['required', 'numeric', 'min:0'],
            'token_price' => ['required', 'numeric', 'min:0'],
            'ownership_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'currency' => ['required', 'string', 'size:3'],
            'status' => ['required', 'in:draft,live,sold_out,closed'],
            'go_live_at' => ['nullable', 'date'],
            'close_at' => ['nullable', 'date', 'after:go_live_at'],
            'meta' => ['nullable', 'array'],
        ]);

        // Calculate ownership percentage automatically if not provided
        if (empty($validated['ownership_percentage']) && $validated['price_per_share'] > 0) {
            $validated['ownership_percentage'] = ($validated['token_price'] / $validated['price_per_share']) * 100;
        }

        $offering->update($validated);

        return redirect()->route('admin.fractional.offerings.index')->with('success', 'Offering updated successfully.');
    }

    public function destroy(FractionalOffering $offering)
    {
        // Check if offering has any orders
        if ($offering->orders()->exists()) {
            return redirect()->back()->with('error', 'Cannot delete offering with existing orders.');
        }

        $offering->delete();

        return redirect()->route('admin.fractional.offerings.index')->with('success', 'Offering deleted successfully.');
    }
}


