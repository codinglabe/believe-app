<?php

namespace App\Http\Controllers;

use App\Models\ExcelData;
use App\Models\Order;
use App\Models\Organization;
use App\Models\UserFavoriteOrganization;
use App\Models\RaffleTicket;
use App\Models\VolunteerTimesheet;
use App\Services\ImpactScoreService;
use App\Services\PrintifyService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class UserProfileController extends Controller
{
    protected $impactScoreService;

    public function __construct(ImpactScoreService $impactScoreService)
    {
        $this->impactScoreService = $impactScoreService;
    }

    public function index(Request $request)
    {
        // Load the user and their interested topics
        $user = $request->user();

        // Get recent donations (you'll need to adjust based on your donation model)
        $recentDonations = collect([]); // Replace with actual donation query

        // Get wallet status
        $walletConnected = !empty($user->wallet_access_token);
        $walletExpired = $walletConnected && $user->wallet_token_expires_at && $user->wallet_token_expires_at->isPast();

        // Fetch actual wallet balance from WalletController
        $walletBalance = 0;
        if ($walletConnected && !$walletExpired) {
            $walletController = new \App\Http\Controllers\WalletController();
            $balanceResponse = $walletController->getBalance($request);
            $balanceData = $balanceResponse->getData(true); // Get array from JSON response
            if ($balanceData['success']) {
                $walletBalance = $balanceData['balance'];
            }
        }

        // Get impact score
        $impactScore = $this->impactScoreService->calculateImpactScore($user, 'monthly');
        $impactBreakdown = $this->impactScoreService->getPointsBreakdown($user, 'monthly');

        return Inertia::render('frontend/user-profile/index', [
            'recentDonations' => $recentDonations,
            'wallet' => [
                'connected' => $walletConnected && !$walletExpired,
                'expired' => $walletExpired,
                'connected_at' => $user->wallet_connected_at?->toIso8601String(),
                'expires_at' => $user->wallet_token_expires_at?->toIso8601String(),
                'wallet_user_id' => $user->wallet_user_id,
                'balance' => $walletBalance,
            ],
            'reward_points' => (float) ($user->reward_points ?? 0),
            'impact_score' => $impactScore,
            'impact_breakdown' => $impactBreakdown,
        ]);
    }


    public function edit()
    {
        return Inertia::render('frontend/user-profile/edit');
    }


    public function update(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email,' . $request->user()->id],
            'phone' => ['nullable', 'string', 'max:20'],
            'dob' => ['nullable', 'date'],
            'image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif', 'max:2048'],
        ]);

        // If email is changed, reset email verification
        if ($request->user()->email !== $validated['email']) {
            $validated['email_verified_at'] = null;

            $request->user()->sendEmailVerificationNotification();
        }



        // Handle image upload
        if ($request->hasFile('image')) {
            // Delete old image
            if ($request->user()->image) {
                Storage::disk('public')->delete($request->user()->image);
            }

            $filename = 'profile-' . $request->user()->id . '-' . time() . '.' . $request->file('image')->getClientOriginalExtension();
            $path = $request->file('image')->storeAs('profile-photos', $filename, 'public');

            $validated['image'] = $path;

            $request->user()->update([
                "image" => $validated['image'],
            ]);
        }

        $request->user()->update([
            "name" => $validated['name'],
            "email" => $validated['email'],
            "dob" => $validated['dob'],
            "contact_number" => $validated['phone'] ?? null,
        ]);


        return to_route('user.profile.edit');
    }



    public function changePasswordForm()
    {
        return Inertia::render('frontend/user-profile/change-password');
    }

    public function favorites(Request $request)
    {
        $user = $request->user();

        // Eager-load donations sum for this user on each favorite org
        $favoriteOrganizations = $user->favoriteOrganizations()
            ->with(['user', 'nteeCode'])
            ->withSum([
                'donations as total_donated' => function ($query) use ($user) {
                    $query->where('user_id', $user->id)
                        ->where('status', 'completed');
                }
            ], 'amount')
            ->get()
            ->map(function ($org) use ($user) {
                // Get the latest donation date
                $latestDonation = $org->donations()
                    ->where('user_id', $user->id)
                    ->where('status', 'completed')
                    ->latest()
                    ->first();

                // Get EIN data
                $einData = ExcelData::where('ein', $org->ein)->first();

                return [
                    'id' => $org->id,
                    'name' => $org->name,
                    'description' => $org->description,
                    'mission' => $org->mission,
                    'ein' => $org->ein,
                    'slug' => $org->user->slug ?? null,
                    'user' => [
                        'image' => $org->user->image ?? null,
                    ],
                    'nteeCode' => $org->nteeCode ? [
                        'category' => $org->nteeCode->broad_category ?? 'Nonprofit',
                        'description' => $org->nteeCode->description ?? '',
                    ] : null,
                    'excel_data_id' => $einData->id ?? null,
                ];
            });

        return Inertia::render('frontend/user-profile/favorites', [
            'favoriteOrganizations' => $favoriteOrganizations,
        ]);
    }

    public function donations()
    {
        // Get user's donation history
        $donations = collect([]); // Replace with actual query

        return Inertia::render('frontend/user-profile/donations', [
            'donations' => $donations,
        ]);
    }

    public function orders(): Response
    {
        $orders = Order::where('user_id', auth()->id())
            ->with(['items.product', 'shippingInfo'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($order) {
                return [
                    'id' => $order->id,
                    'order_number' => 'ORD-' . str_pad($order->id, 6, '0', STR_PAD_LEFT),
                    'date' => $order->created_at->format('M d, Y'),
                    'datetime' => $order->created_at->toISOString(),
                    'status' => $order->status,
                    'payment_status' => $order->payment_status,
                    'total_amount' => $order->total_amount,
                    'item_count' => $order->items->count(),
                    'printify_order_id' => $order->printify_order_id,
                    'printify_status' => $order->printify_status,
                    'items' => $order->items->take(2)->map(function ($item) {
                        return [
                            'id' => $item->id,
                            'name' => $item->product->name,
                            'image' => $item->product->image,
                            'quantity' => $item->quantity,
                            'unit_price' => $item->unit_price,
                            'subtotal' => $item->subtotal,
                        ];
                    }),
                ];
            });

        return Inertia::render('frontend/user-profile/orders', [
            'orders' => $orders,
        ]);
    }
    /**
     * Single order details
     */
    public function orderDetails($id): Response
    {
        $order = Order::where('user_id', auth()->id())
            ->with(['items.product', 'shippingInfo'])
            ->findOrFail($id);

        $orderData = [
            'id' => $order->id,
            'order_number' => 'ORD-' . str_pad($order->id, 6, '0', STR_PAD_LEFT),
            'date' => $order->created_at->format('M d, Y'),
            'datetime' => $order->created_at->toISOString(),
            'status' => $order->status,
            'payment_status' => $order->payment_status,
            'subtotal' => $order->total_amount - ($order->tax_amount + $order->shipping_cost),
            'shipping_cost' => $order->shipping_cost,
            'tax_amount' => $order->tax_amount,
            'total_amount' => $order->total_amount,
            'printify_status' => $order->printify_status,
            'paid_at' => $order->paid_at?->format('M d, Y h:i A'),
            'shipping_method' => $order->shipping_method,
            'shipping_info' => $order->shippingInfo ? [
                'first_name' => $order->shippingInfo->first_name,
                'last_name' => $order->shippingInfo->last_name,
                'email' => $order->shippingInfo->email,
                'phone' => $order->shippingInfo->phone,
                'address' => $order->shippingInfo->shipping_address,
                'city' => $order->shippingInfo->city,
                'state' => $order->shippingInfo->state,
                'zip' => $order->shippingInfo->zip,
                'country' => $order->shippingInfo->country,
            ] : null,
            'items' => $order->items->map(function ($item) {
                return [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'name' => $item->product->name,
                    'description' => $item->product->description,
                    'image' => $item->product->image,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'subtotal' => $item->subtotal,
                    'printify_variant_id' => $item->printify_variant_id,
                    'variant_data' => json_decode($item->variant_data)->size,
                ];
            }),
        ];

        // Get Printify order details if available
        if ($order->printify_order_id) {
            try {
                $printifyOrder = (new PrintifyService)->getOrder($order->printify_order_id);
                $orderData['printify_details'] = $printifyOrder;
            } catch (\Exception $e) {
                \Log::error('Error fetching Printify order: ' . $e->getMessage());
                $orderData['printify_details'] = null;
            }
        }

        return Inertia::render('frontend/user-profile/order-details', [
            'order' => $orderData,
        ]);
    }


    public function removeFavorite(int $id)
    {
        $user = Auth::user();
        $favorite = UserFavoriteOrganization::where('user_id', $user->id)->where('organization_id', $id)->first();

        if ($favorite) {
            $favorite->delete();
        }

        return redirect()->route('user.profile.favorites');
    }

    public function raffleTickets(Request $request)
    {
        $user = $request->user();

        $raffleTickets = RaffleTicket::with([
            'raffle.organization',
            'raffle.winners.ticket'
        ])
        ->where('user_id', $user->id)
        ->orderBy('created_at', 'desc')
        ->get();

        return Inertia::render('frontend/user-profile/raffle-tickets', [
            'raffleTickets' => $raffleTickets,
        ]);
    }

    public function billing(Request $request)
    {
        $user = $request->user();

        // Get wallet status
        $walletConnected = !empty($user->wallet_access_token);
        $walletExpired = $walletConnected && $user->wallet_token_expires_at && $user->wallet_token_expires_at->isPast();

        // Fetch actual wallet balance from WalletController
        $walletBalance = 0;
        if ($walletConnected && !$walletExpired) {
            $walletController = new \App\Http\Controllers\WalletController();
            $balanceResponse = $walletController->getBalance($request);
            $balanceData = $balanceResponse->getData(true); // Get array from JSON response
            if ($balanceData['success']) {
                $walletBalance = $balanceData['balance'];
            }
        }

        // Get paginated transactions
        $perPage = $request->get('per_page', 10);
        $transactions = $user->transactions()
            ->orderBy('created_at', 'desc')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('frontend/user-profile/billing', [
            'wallet' => [
                'connected' => $walletConnected && !$walletExpired,
                'expired' => $walletExpired,
                'connected_at' => $user->wallet_connected_at?->toIso8601String(),
                'expires_at' => $user->wallet_token_expires_at?->toIso8601String(),
                'wallet_user_id' => $user->wallet_user_id,
                'balance' => $walletBalance,
            ],
            'transactions' => $transactions,
        ]);
    }

    /**
     * Display user's volunteer timesheet entries.
     */
    public function timesheet(Request $request)
    {
        $user = $request->user();

        $perPage = (int) $request->get('per_page', 10);
        $page = (int) $request->get('page', 1);
        $search = $request->get('search', '');
        $workDate = $request->get('work_date', '');

        $query = VolunteerTimesheet::with(['jobApplication.jobPost', 'organization', 'createdBy'])
            ->whereHas('jobApplication', function ($q) use ($user) {
                $q->where('user_id', $user->id);
            });

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->whereHas('jobApplication.jobPost', function ($q) use ($search) {
                    $q->where('title', 'LIKE', '%' . $search . '%');
                })
                    ->orWhere('description', 'LIKE', '%' . $search . '%');
            });
        }

        if (!empty($workDate)) {
            $query->where('work_date', $workDate);
        }

        $timesheets = $query->orderByDesc('work_date')
            ->orderByDesc('created_at')
            ->paginate($perPage, ['*'], 'page', $page)
            ->withQueryString();

        // Calculate total hours and reward points
        $totalHours = VolunteerTimesheet::whereHas('jobApplication', function ($q) use ($user) {
            $q->where('user_id', $user->id);
        })->sum('hours');

        $hourlyRate = (float) \App\Models\AdminSetting::get('volunteer_hourly_reward_points', 10.00);
        $totalRewardPoints = $totalHours * $hourlyRate;

        return Inertia::render('frontend/user-profile/timesheet', [
            'timesheets' => $timesheets,
            'reward_points' => (float) ($user->reward_points ?? 0),
            'total_hours' => (float) $totalHours,
            'total_reward_points' => $totalRewardPoints,
            'hourly_rate' => $hourlyRate,
            'filters' => [
                'per_page' => $perPage,
                'page' => $page,
                'search' => $search,
                'work_date' => $workDate,
            ],
        ]);
    }
}
