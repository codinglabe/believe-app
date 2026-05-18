<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\BaseController;
use App\Models\WalletPlan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Laravel\Cashier\Cashier;

class WalletPlanController extends BaseController
{
    /**
     * Display a listing of wallet plans.
     */
    public function index(Request $request)
    {
        $this->authorizePermission($request, 'wallet.plan.read');

        $plans = WalletPlan::ordered()->get();

        return Inertia::render('admin/WalletPlans/Index', [
            'plans' => $plans,
        ]);
    }

    /**
     * Show the form for creating a new wallet plan.
     */
    public function create(Request $request)
    {
        $this->authorizePermission($request, 'wallet.plan.create');

        return Inertia::render('admin/WalletPlans/Create');
    }

    /**
     * Store a newly created wallet plan.
     */
    public function store(Request $request)
    {
        $this->authorizePermission($request, 'wallet.plan.create');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'frequency' => 'required|string|in:monthly,annually',
            'price' => 'required|numeric|min:0',
            'one_time_fee' => 'nullable|numeric|min:0',
            'stripe_price_id' => 'nullable|string|max:255',
            'stripe_product_id' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'trial_days' => 'nullable|integer|min:0|max:365',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        try {
            // Create Stripe product and price dynamically if not provided
            if (config('cashier.key')) {
                $stripe = Cashier::stripe();
                
                // Create product if not provided
                if (empty($validated['stripe_product_id'])) {
                    $product = $stripe->products->create([
                        'name' => $validated['name'],
                        'description' => $validated['description'] ?? 'Wallet Subscription Plan',
                    ]);
                    $validated['stripe_product_id'] = $product->id;
                }

                // Create price if not provided
                if (empty($validated['stripe_price_id'])) {
                    $interval = $validated['frequency'] === 'annually' ? 'year' : 'month';
                    
                    $price = $stripe->prices->create([
                        'product' => $validated['stripe_product_id'],
                        'unit_amount' => (int)($validated['price'] * 100), // Convert to cents
                        'currency' => 'usd',
                        'recurring' => [
                            'interval' => $interval,
                        ],
                    ]);
                    $validated['stripe_price_id'] = $price->id;
                }
            }

            WalletPlan::create($validated);

            return redirect()->route('admin.wallet-plans.index')
                ->with('success', 'Wallet plan created successfully.');
        } catch (\Exception $e) {
            Log::error('Wallet plan creation error: ' . $e->getMessage());
            return redirect()->back()
                ->withInput()
                ->with('error', 'Failed to create wallet plan: ' . $e->getMessage());
        }
    }

    /**
     * Show the form for editing the specified wallet plan.
     */
    public function edit(Request $request, WalletPlan $walletPlan)
    {
        $this->authorizePermission($request, 'wallet.plan.edit');

        return Inertia::render('admin/WalletPlans/Edit', [
            'plan' => $walletPlan,
        ]);
    }

    /**
     * Update the specified wallet plan.
     */
    public function update(Request $request, WalletPlan $walletPlan)
    {
        $this->authorizePermission($request, 'wallet.plan.update');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'frequency' => 'required|string|in:monthly,annually',
            'price' => 'required|numeric|min:0',
            'one_time_fee' => 'nullable|numeric|min:0',
            'stripe_price_id' => 'nullable|string|max:255',
            'stripe_product_id' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'trial_days' => 'nullable|integer|min:0|max:365',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        try {
            // Create or update Stripe product and price dynamically if needed
            if (config('cashier.key')) {
                $stripe = Cashier::stripe();
                
                // Create or update product if not provided or changed
                if (empty($validated['stripe_product_id'])) {
                    $product = $stripe->products->create([
                        'name' => $validated['name'],
                        'description' => $validated['description'] ?? 'Wallet Subscription Plan',
                    ]);
                    $validated['stripe_product_id'] = $product->id;
                } elseif ($walletPlan->stripe_product_id !== $validated['stripe_product_id'] || $walletPlan->name !== $validated['name']) {
                    // Update existing product if name changed
                    try {
                        $stripe->products->update($validated['stripe_product_id'], [
                            'name' => $validated['name'],
                            'description' => $validated['description'] ?? 'Wallet Subscription Plan',
                        ]);
                    } catch (\Exception $e) {
                        // If product doesn't exist, create a new one
                        $product = $stripe->products->create([
                            'name' => $validated['name'],
                            'description' => $validated['description'] ?? 'Wallet Subscription Plan',
                        ]);
                        $validated['stripe_product_id'] = $product->id;
                    }
                }

                // Create new price if price or frequency changed, or if price_id is empty
                $needsNewPrice = empty($validated['stripe_price_id']) || 
                                $walletPlan->price != $validated['price'] || 
                                $walletPlan->frequency !== $validated['frequency'] ||
                                $walletPlan->stripe_price_id !== $validated['stripe_price_id'];

                if ($needsNewPrice) {
                    $interval = $validated['frequency'] === 'annually' ? 'year' : 'month';
                    
                    $price = $stripe->prices->create([
                        'product' => $validated['stripe_product_id'],
                        'unit_amount' => (int)($validated['price'] * 100), // Convert to cents
                        'currency' => 'usd',
                        'recurring' => [
                            'interval' => $interval,
                        ],
                    ]);
                    $validated['stripe_price_id'] = $price->id;
                }
            }

            $walletPlan->update($validated);

            return redirect()->route('admin.wallet-plans.index')
                ->with('success', 'Wallet plan updated successfully.');
        } catch (\Exception $e) {
            Log::error('Wallet plan update error: ' . $e->getMessage());
            return redirect()->back()
                ->withInput()
                ->with('error', 'Failed to update wallet plan: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified wallet plan.
     */
    public function destroy(Request $request, WalletPlan $walletPlan)
    {
        $this->authorizePermission($request, 'wallet.plan.delete');

        try {
            $walletPlan->delete();

            return redirect()->route('admin.wallet-plans.index')
                ->with('success', 'Wallet plan deleted successfully.');
        } catch (\Exception $e) {
            Log::error('Wallet plan deletion error: ' . $e->getMessage());
            return redirect()->back()
                ->with('error', 'Failed to delete wallet plan: ' . $e->getMessage());
        }
    }
}
