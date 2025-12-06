<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\BaseController;
use App\Models\Plan;
use App\Models\PlanFeature;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Laravel\Cashier\Cashier;

class PlanController extends BaseController
{
    /**
     * Display a listing of plans.
     */
    public function index(Request $request)
    {
        $this->authorizeRole($request, 'admin');

        $plans = Plan::with('features')
            ->ordered()
            ->get();

        return Inertia::render('admin/Plans/Index', [
            'plans' => $plans,
        ]);
    }

    /**
     * Show the form for creating a new plan.
     */
    public function create(Request $request)
    {
        $this->authorizeRole($request, 'admin');

        return Inertia::render('admin/Plans/Create');
    }

    /**
     * Store a newly created plan.
     */
    public function store(Request $request)
    {
        $this->authorizeRole($request, 'admin');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'frequency' => 'required|string|in:monthly,yearly,weekly,one-time',
            'price' => 'required|numeric|min:0',
            'stripe_price_id' => 'nullable|string|max:255',
            'stripe_product_id' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'is_popular' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
            'trial_days' => 'nullable|integer|min:0|max:365',
            'custom_fields' => 'nullable|array',
            'custom_fields.*.key' => 'required|string',
            'custom_fields.*.label' => 'required|string|max:255',
            'custom_fields.*.value' => 'required|string',
            'custom_fields.*.type' => 'required|string|in:text,number,currency,boolean',
            'custom_fields.*.icon' => 'nullable|string|max:255',
            'custom_fields.*.description' => 'nullable|string|max:500',
            'features' => 'nullable|array',
            'features.*.name' => 'required|string|max:255',
            'features.*.description' => 'nullable|string',
            'features.*.icon' => 'nullable|string|max:255',
            'features.*.is_unlimited' => 'boolean',
            'features.*.sort_order' => 'nullable|integer|min:0',
        ]);

        try {
            // Create Stripe product and price dynamically if not provided
            if (config('cashier.key')) {
                $stripe = Cashier::stripe();
                
                // Create product if not provided
                if (empty($validated['stripe_product_id'])) {
                    $product = $stripe->products->create([
                        'name' => $validated['name'],
                        'description' => $validated['description'] ?? '',
                    ]);
                    $validated['stripe_product_id'] = $product->id;
                }

                // Create price if not provided
                if (empty($validated['stripe_price_id'])) {
                    $priceData = [
                        'product' => $validated['stripe_product_id'],
                        'unit_amount' => (int)($validated['price'] * 100), // Convert to cents
                        'currency' => 'usd',
                    ];

                    // Add recurring interval for subscription plans
                    if ($validated['frequency'] !== 'one-time') {
                        $interval = 'month';
                        if ($validated['frequency'] === 'yearly') {
                            $interval = 'year';
                        } elseif ($validated['frequency'] === 'weekly') {
                            $interval = 'week';
                        }
                        
                        $priceData['recurring'] = [
                            'interval' => $interval,
                        ];
                    }

                    $price = $stripe->prices->create($priceData);
                    $validated['stripe_price_id'] = $price->id;
                }
            }

            $plan = Plan::create($validated);

            // Create features if provided
            if (!empty($validated['features'])) {
                foreach ($validated['features'] as $index => $feature) {
                    PlanFeature::create([
                        'plan_id' => $plan->id,
                        'name' => $feature['name'],
                        'description' => $feature['description'] ?? null,
                        'icon' => $feature['icon'] ?? null,
                        'is_unlimited' => $feature['is_unlimited'] ?? false,
                        'sort_order' => $feature['sort_order'] ?? $index,
                    ]);
                }
            }

            return redirect()->route('admin.plans.index')
                ->with('success', 'Plan created successfully.');
        } catch (\Exception $e) {
            Log::error('Plan creation error: ' . $e->getMessage());
            return redirect()->back()
                ->withInput()
                ->with('error', 'Failed to create plan: ' . $e->getMessage());
        }
    }

    /**
     * Display the specified plan.
     */
    public function show(Request $request, Plan $plan)
    {
        $this->authorizeRole($request, 'admin');

        $plan->load('features');

        return Inertia::render('admin/Plans/Show', [
            'plan' => $plan,
        ]);
    }

    /**
     * Show the form for editing the specified plan.
     */
    public function edit(Request $request, Plan $plan)
    {
        $this->authorizeRole($request, 'admin');

        $plan->load('features');

        return Inertia::render('admin/Plans/Edit', [
            'plan' => $plan,
        ]);
    }

    /**
     * Update the specified plan.
     */
    public function update(Request $request, Plan $plan)
    {
        $this->authorizeRole($request, 'admin');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'frequency' => 'required|string|in:monthly,yearly,weekly,one-time',
            'price' => 'required|numeric|min:0',
            'stripe_price_id' => 'nullable|string|max:255',
            'stripe_product_id' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'is_popular' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
            'trial_days' => 'nullable|integer|min:0|max:365',
            'custom_fields' => 'nullable|array',
            'custom_fields.*.key' => 'required|string',
            'custom_fields.*.label' => 'required|string|max:255',
            'custom_fields.*.value' => 'required|string',
            'custom_fields.*.type' => 'required|string|in:text,number,currency,boolean',
            'custom_fields.*.icon' => 'nullable|string|max:255',
            'custom_fields.*.description' => 'nullable|string|max:500',
        ]);

        try {
            // Create or update Stripe product and price dynamically if needed
            if (config('cashier.key')) {
                $stripe = Cashier::stripe();
                
                // Create or update product if not provided or changed
                if (empty($validated['stripe_product_id'])) {
                    $product = $stripe->products->create([
                        'name' => $validated['name'],
                        'description' => $validated['description'] ?? '',
                    ]);
                    $validated['stripe_product_id'] = $product->id;
                } elseif ($plan->stripe_product_id !== $validated['stripe_product_id'] || $plan->name !== $validated['name']) {
                    // Update existing product if name changed
                    try {
                        $stripe->products->update($validated['stripe_product_id'], [
                            'name' => $validated['name'],
                            'description' => $validated['description'] ?? '',
                        ]);
                    } catch (\Exception $e) {
                        // If product doesn't exist, create a new one
                        $product = $stripe->products->create([
                            'name' => $validated['name'],
                            'description' => $validated['description'] ?? '',
                        ]);
                        $validated['stripe_product_id'] = $product->id;
                    }
                }

                // Create new price if price or frequency changed, or if price_id is empty
                $needsNewPrice = empty($validated['stripe_price_id']) || 
                                $plan->price != $validated['price'] || 
                                $plan->frequency !== $validated['frequency'] ||
                                $plan->stripe_price_id !== $validated['stripe_price_id'];

                if ($needsNewPrice) {
                    $priceData = [
                        'product' => $validated['stripe_product_id'],
                        'unit_amount' => (int)($validated['price'] * 100), // Convert to cents
                        'currency' => 'usd',
                    ];

                    // Add recurring interval for subscription plans
                    if ($validated['frequency'] !== 'one-time') {
                        $interval = 'month';
                        if ($validated['frequency'] === 'yearly') {
                            $interval = 'year';
                        } elseif ($validated['frequency'] === 'weekly') {
                            $interval = 'week';
                        }
                        
                        $priceData['recurring'] = [
                            'interval' => $interval,
                        ];
                    }

                    $price = $stripe->prices->create($priceData);
                    $validated['stripe_price_id'] = $price->id;
                }
            }

            $plan->update($validated);

            return redirect()->route('admin.plans.index')
                ->with('success', 'Plan updated successfully.');
        } catch (\Exception $e) {
            Log::error('Plan update error: ' . $e->getMessage());
            return redirect()->back()
                ->withInput()
                ->with('error', 'Failed to update plan: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified plan.
     */
    public function destroy(Request $request, Plan $plan)
    {
        $this->authorizeRole($request, 'admin');

        try {
            $plan->delete();

            return redirect()->route('admin.plans.index')
                ->with('success', 'Plan deleted successfully.');
        } catch (\Exception $e) {
            Log::error('Plan deletion error: ' . $e->getMessage());
            return redirect()->back()
                ->with('error', 'Failed to delete plan: ' . $e->getMessage());
        }
    }

    /**
     * Store a feature for a plan.
     */
    public function storeFeature(Request $request, Plan $plan)
    {
        $this->authorizeRole($request, 'admin');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'icon' => 'nullable|string|max:255',
            'is_unlimited' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $plan->features()->create($validated);

        return redirect()->back()
            ->with('success', 'Feature added successfully.');
    }

    /**
     * Update a feature.
     */
    public function updateFeature(Request $request, Plan $plan, PlanFeature $feature)
    {
        $this->authorizeRole($request, 'admin');

        if ($feature->plan_id !== $plan->id) {
            abort(404);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'icon' => 'nullable|string|max:255',
            'is_unlimited' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $feature->update($validated);

        return redirect()->back()
            ->with('success', 'Feature updated successfully.');
    }

    /**
     * Delete a feature.
     */
    public function destroyFeature(Request $request, Plan $plan, PlanFeature $feature)
    {
        $this->authorizeRole($request, 'admin');

        if ($feature->plan_id !== $plan->id) {
            abort(404);
        }

        $feature->delete();

        return redirect()->back()
            ->with('success', 'Feature deleted successfully.');
    }

    /**
     * Display all subscribers (users with active or cancelled plans).
     */
    public function subscribers(Request $request)
    {
        $this->authorizeRole($request, 'admin');

        $search = $request->query('search', '');
        $planFilter = $request->query('plan', 'all');
        $statusFilter = $request->query('status', 'all'); // all, active, cancelled

        // Get all users who have either:
        // 1. Active subscription (current_plan_id is not null), OR
        // 2. Plan purchase transaction (including cancelled ones)
        $userIdsWithActivePlans = User::whereNotNull('current_plan_id')->pluck('id');
        $userIdsWithPlanTransactions = Transaction::where('related_type', Plan::class)
            ->whereIn('type', ['purchase', 'cancellation'])
            ->distinct()
            ->pluck('user_id');
        
        $allSubscriberIds = $userIdsWithActivePlans->merge($userIdsWithPlanTransactions)->unique();

        $query = User::with('currentPlan')
            ->whereIn('id', $allSubscriberIds);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($planFilter !== 'all') {
            // Filter by plan - check both current_plan_id and transaction meta
            $query->where(function ($q) use ($planFilter) {
                $q->where('current_plan_id', $planFilter)
                  ->orWhereHas('transactions', function ($tq) use ($planFilter) {
                      $tq->where('related_type', Plan::class)
                         ->where('related_id', $planFilter);
                  });
            });
        }

        // Filter by status
        if ($statusFilter === 'active') {
            $query->whereNotNull('current_plan_id');
        } elseif ($statusFilter === 'cancelled') {
            $query->whereNull('current_plan_id')
                  ->whereHas('transactions', function ($tq) {
                      $tq->where('related_type', Plan::class)
                         ->where('type', 'cancellation');
                  });
        }

        $subscribers = $query->latest('updated_at')
            ->paginate(15)
            ->withQueryString();

        // Get all plans for filter dropdown
        $plans = Plan::active()->ordered()->get();

        // Transform subscribers data
        $subscribers->getCollection()->transform(function ($user) {
            // Determine subscription status
            $isActive = $user->current_plan_id !== null;
            
            // Get plan info from current plan or transaction
            $planData = null;
            $subscribedAt = null;
            $cancelledAt = null;

            if ($isActive && $user->currentPlan) {
                $planData = [
                    'id' => $user->currentPlan->id,
                    'name' => $user->currentPlan->name,
                    'price' => (float) $user->currentPlan->price,
                    'frequency' => $user->currentPlan->frequency,
                ];
                // Get subscription date from transaction or user updated_at
                $purchaseTransaction = Transaction::where('user_id', $user->id)
                    ->where('related_type', Plan::class)
                    ->where('type', 'purchase')
                    ->where('related_id', $user->currentPlan->id)
                    ->orderBy('created_at', 'desc')
                    ->first();
                $subscribedAt = $purchaseTransaction?->created_at ?? $user->updated_at;
            } else {
                // Get plan info from latest purchase transaction
                $purchaseTransaction = Transaction::where('user_id', $user->id)
                    ->where('related_type', Plan::class)
                    ->where('type', 'purchase')
                    ->orderBy('created_at', 'desc')
                    ->first();
                
                if ($purchaseTransaction && $purchaseTransaction->related_id) {
                    $plan = Plan::find($purchaseTransaction->related_id);
                    if ($plan) {
                        $planData = [
                            'id' => $plan->id,
                            'name' => $plan->name,
                            'price' => (float) $plan->price,
                            'frequency' => $plan->frequency,
                        ];
                        $subscribedAt = $purchaseTransaction->created_at;
                    }
                }

                // Get cancellation date
                $cancellationTransaction = Transaction::where('user_id', $user->id)
                    ->where('related_type', Plan::class)
                    ->where('type', 'cancellation')
                    ->orderBy('created_at', 'desc')
                    ->first();
                $cancelledAt = $cancellationTransaction?->created_at;
            }

            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'current_plan' => $planData,
                'status' => $isActive ? 'active' : 'cancelled',
                'subscribed_at' => $subscribedAt?->format('Y-m-d H:i:s'),
                'cancelled_at' => $cancelledAt?->format('Y-m-d H:i:s'),
                'credits' => $user->credits ?? 0,
            ];
        });

        return Inertia::render('admin/Plans/Subscribers', [
            'subscribers' => $subscribers,
            'plans' => $plans,
            'filters' => [
                'search' => $search,
                'plan' => $planFilter,
                'status' => $statusFilter,
            ],
        ]);
    }
}
