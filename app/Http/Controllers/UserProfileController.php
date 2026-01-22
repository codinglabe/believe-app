<?php

namespace App\Http\Controllers;

use App\Models\Donation;
use App\Models\ExcelData;
use App\Models\Order;
use App\Models\Organization;
use App\Models\UserFavoriteOrganization;
use App\Models\RaffleTicket;
use App\Models\SupporterPosition;
use App\Models\VolunteerTimesheet;
use App\Models\JobApplication;
use App\Models\RewardPointLedger;
use App\Models\MerchantHubOfferRedemption;
use App\Services\ImpactScoreService;
use Carbon\Carbon;
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
        $user = auth()->user();

        // সব active positions + ইউজারের বর্তমান positions
        $positions = SupporterPosition::where('is_active', 1)
            ->orderBy('sort_order')
            ->get(['id', 'name']);

        $userPositions = $user->supporterPositions->pluck('id')->toArray();

        return Inertia::render('frontend/user-profile/edit', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->contact_number,
                'dob' => $user->dob?->format('Y-m-d'),
                'image' => $user->image ? Storage::url($user->image) : null,
                'positions' => $userPositions, // current selected
            ],
            'availablePositions' => $positions,
        ]);
    }


    public function update(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'phone' => ['nullable', 'string', 'max:20'],
            'dob' => ['nullable', 'date'],
            'image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif', 'max:2048'],
            'positions' => ['sometimes', 'array'],
            'positions.*' => ['exists:supporter_positions,id'],
        ]);

        // Email changed? Send verification
        if ($user->email !== $validated['email']) {
            $validated['email_verified_at'] = null;
            $user->sendEmailVerificationNotification();
        }

        // Handle image upload
        if ($request->hasFile('image')) {
            if ($user->image) {
                Storage::disk('public')->delete($user->image);
            }

            $filename = 'profile-' . $user->id . '-' . time() . '.' . $request->file('image')->extension();
            $path = $request->file('image')->storeAs('profile-photos', $filename, 'public');
            $validated['image'] = $path;
        }

        // Update basic info
        $user->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'contact_number' => $validated['phone'] ?? null,
            'dob' => $validated['dob'] ?? null,
            'image' => $validated['image'] ?? $user->image,
        ]);

        // Sync supporter positions
        if (array_key_exists('positions', $validated)) {
            // If you're using many-to-many, fix the relationship first
            $user->supporterPositions()->sync($validated['positions']);
        } else {
            $user->supporterPositions()->detach();
        }

        return back()->with('success', 'Profile updated successfully!');
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

    public function donations(Request $request)
    {
        $user = auth()->user();

        // Get search and filter parameters
        $search = $request->get('search', '');
        $statusFilter = $request->get('status', '');
        $perPage = $request->get('per_page', 4);

        // Build query
        $query = Donation::where('user_id', $user->id)
            ->with('organization:id,name');

        // Apply search filter
        if ($search) {
            $query->whereHas('organization', function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%');
            });
        }

        // Apply status filter
        if ($statusFilter && $statusFilter !== 'all') {
            $query->where('status', $statusFilter);
        }

        // Order by date
        $query->orderBy('donation_date', 'desc')
            ->orderBy('created_at', 'desc');

        // Paginate results
        $donationsPaginated = $query->paginate($perPage);

        // Transform donations
        $donations = $donationsPaginated->getCollection()->map(function ($donation) {
            // Map status correctly - 'active' for recurring donations should be shown as 'completed'
            $displayStatus = $donation->status;
            if ($donation->status === 'active') {
                // Recurring donations with 'active' status are successfully paid
                $displayStatus = 'completed';
            } elseif (!in_array($donation->status, ['completed', 'pending', 'failed', 'canceled', 'active'])) {
                // If status is unknown or 'processing', check if payment was actually completed
                // For now, if it's not pending/failed/canceled, assume it's completed
                $displayStatus = 'completed';
            }

            return [
                'id' => $donation->id,
                'organization_name' => $donation->organization->name ?? 'Unknown Organization',
                'amount' => number_format($donation->amount, 2),
                'date' => $donation->donation_date ? $donation->donation_date->toDateString() : $donation->created_at->toDateString(),
                'status' => $displayStatus,
                'frequency' => $donation->frequency ?? 'one-time',
                'payment_method' => $donation->payment_method ?? null,
                'impact' => $donation->messages ?? null,
                'receipt_url' => null, // Add receipt URL if available
            ];
        });

        // Calculate stats (always from all donations, not filtered)
        // Include both 'completed' and 'active' statuses as successful donations
        $totalDonated = Donation::where('user_id', $user->id)
            ->whereIn('status', ['completed', 'active'])
            ->sum('amount');

        $thisYearDonated = Donation::where('user_id', $user->id)
            ->whereIn('status', ['completed', 'active'])
            ->whereYear('donation_date', now()->year)
            ->sum('amount');

        $organizationsSupported = Donation::where('user_id', $user->id)
            ->whereIn('status', ['completed', 'active'])
            ->distinct('organization_id')
            ->count('organization_id');

        return Inertia::render('frontend/user-profile/donations', [
            'donations' => $donations,
            'pagination' => [
                'current_page' => $donationsPaginated->currentPage(),
                'last_page' => $donationsPaginated->lastPage(),
                'per_page' => $donationsPaginated->perPage(),
                'total' => $donationsPaginated->total(),
                'from' => $donationsPaginated->firstItem(),
                'to' => $donationsPaginated->lastItem(),
            ],
            'filters' => [
                'search' => $search,
                'status' => $statusFilter,
            ],
            'totalDonated' => (float) $totalDonated,
            'thisYearDonated' => (float) $thisYearDonated,
            'organizationsSupported' => (int) $organizationsSupported,
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
                    'payment_method' => $order->payment_method ?? null,
                    'total_amount' => $order->total_amount,
                    'item_count' => $order->items->count(),
                    'printify_order_id' => $order->printify_order_id,
                    'printify_status' => $order->printify_status,
                    'items' => $order->items->take(2)->map(function ($item) {
                        return [
                            'id' => $item->id,
                            'name' => $item->product->name,
                            'primary_image' => $item->primary_image,
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
     * Show user's job applications
     */
    public function jobApplications(): Response
    {
        $user = auth()->user();

        $applications = JobApplication::where('user_id', $user->id)
            ->with(['jobPost.organization:id,name'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($application) {
                $metadata = $application->metadata ?? [];
                return [
                    'id' => $application->id,
                    'status' => $application->status,
                    'job_post_id' => $application->job_post_id,
                    'created_at' => $application->created_at->toISOString(),
                    'updated_at' => $application->updated_at->toISOString(),
                    'completion_requested' => $metadata['completion_requested'] ?? false,
                    'completion_requested_at' => $metadata['completion_requested_at'] ?? null,
                    'job_status' => $metadata['job_status'] ?? null,
                    'job_post' => $application->jobPost ? [
                        'id' => $application->jobPost->id,
                        'title' => $application->jobPost->title,
                        'type' => $application->jobPost->type,
                        'location_type' => $application->jobPost->location_type,
                        'city' => $application->jobPost->city,
                        'state' => $application->jobPost->state,
                        'organization' => $application->jobPost->organization ? [
                            'id' => $application->jobPost->organization->id,
                            'name' => $application->jobPost->organization->name,
                        ] : null,
                    ] : null,
                ];
            });

        return Inertia::render('frontend/user-profile/job-applications', [
            'applications' => $applications,
        ]);
    }

    /**
     * Show individual job application details
     */
    public function showJobApplication($id): Response
    {
        $user = auth()->user();

        $application = JobApplication::where('user_id', $user->id)
            ->with(['jobPost.organization:id,name,email,phone'])
            ->findOrFail($id);

        $metadata = $application->metadata ?? [];

        // Get the last completion request timesheet to check its status
        $lastCompletionRequest = VolunteerTimesheet::where('job_application_id', $application->id)
            ->where('is_completion_request', true)
            ->orderBy('created_at', 'desc')
            ->first();

        $applicationData = [
            'id' => $application->id,
            'status' => $application->status,
            'job_post_id' => $application->job_post_id,
            'created_at' => $application->created_at->toISOString(),
            'updated_at' => $application->updated_at->toISOString(),
            'completion_requested' => $metadata['completion_requested'] ?? false,
            'completion_requested_at' => $metadata['completion_requested_at'] ?? null,
            'job_status' => $metadata['job_status'] ?? null,
            'last_completion_request_status' => $lastCompletionRequest ? $lastCompletionRequest->status : null,
            'job_post' => $application->jobPost ? [
                'id' => $application->jobPost->id,
                'title' => $application->jobPost->title,
                'description' => $application->jobPost->description,
                'type' => $application->jobPost->type,
                'location_type' => $application->jobPost->location_type,
                'city' => $application->jobPost->city,
                'state' => $application->jobPost->state,
                'pay_rate' => $application->jobPost->pay_rate,
                'currency' => $application->jobPost->currency,
                'points' => $application->jobPost->points,
                'organization' => $application->jobPost->organization ? [
                    'id' => $application->jobPost->organization->id,
                    'name' => $application->jobPost->organization->name,
                    'email' => $application->jobPost->organization->email,
                    'phone' => $application->jobPost->organization->phone,
                ] : null,
            ] : null,
        ];

        return Inertia::render('frontend/user-profile/job-application-show', [
            'application' => $applicationData,
        ]);
    }

    /**
     * Request job completion - creates a timesheet entry
     */
    public function requestJobCompletion(Request $request, $id)
    {
        $user = auth()->user();

        $application = JobApplication::where('user_id', $user->id)
            ->where('status', 'accepted')
            ->with('jobPost')
            ->findOrFail($id);

        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'notes' => 'required|string|min:10|max:5000',
        ]);

        // Check if organization exists
        if (!$application->jobPost || !$application->jobPost->organization_id) {
            return redirect()->back()->withErrors(['error' => 'Job post or organization not found.']);
        }

        // Calculate hours from start_date to end_date
        $startDate = Carbon::parse($request->start_date);
        $endDate = Carbon::parse($request->end_date);
        $daysDiff = $startDate->diffInDays($endDate) + 1; // Include both start and end days
        $hours = $daysDiff * 8; // Assuming 8 hours per day (can be adjusted)

        // Create timesheet entry as completion request
        VolunteerTimesheet::create([
            'job_application_id' => $application->id,
            'organization_id' => $application->jobPost->organization_id,
            'created_by' => $user->id,
            'work_date' => $endDate->toDateString(), // Use end_date as work_date
            'start_date' => $startDate->toDateString(),
            'end_date' => $endDate->toDateString(),
            'hours' => $hours,
            'description' => $request->notes,
            'notes' => 'Completion request submitted by volunteer',
            'status' => 'pending',
            'is_completion_request' => true,
        ]);

        // Update application metadata
        $metadata = $application->metadata ?? [];
        $metadata['completion_requested'] = true;
        $metadata['completion_requested_at'] = now()->toISOString();
        $metadata['completion_notes'] = $request->notes;

        $application->metadata = $metadata;
        $application->save();

        // TODO: Send notification to organization about completion request

        return redirect()->back()->with('success', 'Completion request submitted successfully! The organization will review your request.');
    }

    /**
     * Fetch timesheets for a job application
     */
    public function getJobApplicationTimesheets($id)
    {
        $user = auth()->user();

        $application = JobApplication::where('user_id', $user->id)
            ->with(['jobPost.organization:id,name,email,phone'])
            ->findOrFail($id);

        $timesheets = VolunteerTimesheet::where('job_application_id', $application->id)
            ->with('assessment')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($timesheet) {
                $assessment = $timesheet->assessment;
                return [
                    'id' => $timesheet->id,
                    'work_date' => $timesheet->work_date->toDateString(),
                    'start_date' => $timesheet->start_date ? $timesheet->start_date->toDateString() : null,
                    'end_date' => $timesheet->end_date ? $timesheet->end_date->toDateString() : null,
                    'hours' => $timesheet->hours,
                    'description' => $timesheet->description,
                    'notes' => $timesheet->notes,
                    'status' => $timesheet->status,
                    'is_completion_request' => $timesheet->is_completion_request ?? false,
                    'created_at' => $timesheet->created_at->toISOString(),
                    'assessment' => $assessment ? [
                        'final_points' => $assessment->final_points,
                        'grade' => $assessment->grade,
                        'review_notes' => $assessment->review_notes,
                    ] : null,
                ];
            });

        $metadata = $application->metadata ?? [];

        // Get the last completion request timesheet to check its status
        $lastCompletionRequest = VolunteerTimesheet::where('job_application_id', $application->id)
            ->where('is_completion_request', true)
            ->orderBy('created_at', 'desc')
            ->first();

        $applicationData = [
            'id' => $application->id,
            'status' => $application->status,
            'job_post_id' => $application->job_post_id,
            'created_at' => $application->created_at->toISOString(),
            'updated_at' => $application->updated_at->toISOString(),
            'completion_requested' => $metadata['completion_requested'] ?? false,
            'completion_requested_at' => $metadata['completion_requested_at'] ?? null,
            'job_status' => $metadata['job_status'] ?? null,
            'last_completion_request_status' => $lastCompletionRequest ? $lastCompletionRequest->status : null,
            'timesheets' => $timesheets,
            'job_post' => $application->jobPost ? [
                'id' => $application->jobPost->id,
                'title' => $application->jobPost->title,
                'description' => $application->jobPost->description,
                'type' => $application->jobPost->type,
                'location_type' => $application->jobPost->location_type,
                'city' => $application->jobPost->city,
                'state' => $application->jobPost->state,
                'pay_rate' => $application->jobPost->pay_rate,
                'currency' => $application->jobPost->currency,
                'points' => $application->jobPost->points,
                'organization' => $application->jobPost->organization ? [
                    'id' => $application->jobPost->organization->id,
                    'name' => $application->jobPost->organization->name,
                    'email' => $application->jobPost->organization->email,
                    'phone' => $application->jobPost->organization->phone,
                ] : null,
            ] : null,
        ];

        return Inertia::render('frontend/user-profile/job-application-show', [
            'application' => $applicationData,
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
            'subtotal' => $order->subtotal,
            'shipping_cost' => $order->shipping_cost,
            'tax_amount' => $order->tax_amount,
            'platform_fee' => $order->platform_fee,
            'donation_amount' => $order->donation_amount,
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
                // Safely decode variant_data for manual and Printify products
                $variantData = null;
                if ($item->variant_data) {
                    $decoded = json_decode($item->variant_data, true);
                    if (is_array($decoded) && isset($decoded['size'])) {
                        $variantData = $decoded['size'];
                    } elseif (is_object($decoded) && isset($decoded->size)) {
                        $variantData = $decoded->size;
                    }
                }

                return [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'name' => $item->product->name,
                    'description' => $item->product->description,
                    'primary_image' => $item->primary_image,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'subtotal' => $item->subtotal,
                    'printify_variant_id' => $item->printify_variant_id,
                    'variant_data' => $variantData,
                    'is_manual_product' => empty($item->product->printify_product_id),
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

        // Get wallet status - check if user has wallet subscription instead of wallet_access_token
        // For regular users, check subscription; for org users, always connected
        $isOrgUser = in_array($user->role, ['organization', 'organization_pending']);
        $walletConnected = $isOrgUser || ($user->current_plan_id !== null);
        $walletExpired = false; // Subscription-based, not token-based

        // Fetch actual wallet balance
        $walletBalance = (float) ($user->balance ?? 0);
        try {
            $walletController = new \App\Http\Controllers\WalletController();
            $balanceResponse = $walletController->getBalance($request);
            $balanceData = $balanceResponse->getData(true);
            if (isset($balanceData['success']) && $balanceData['success']) {
                $walletBalance = (float) ($balanceData['balance'] ?? $balanceData['local_balance'] ?? $walletBalance);
            }
        } catch (\Exception $e) {
            // Use local balance if API call fails
            \Log::warning('Failed to fetch wallet balance in billing page', ['error' => $e->getMessage()]);
        }

        // Get paginated transactions
        $perPage = $request->get('per_page', 10);
        $transactions = $user->transactions()
            ->orderBy('created_at', 'desc')
            ->paginate($perPage)
            ->withQueryString();

        // Transform transactions to include proper data structure
        $transactions->getCollection()->transform(function ($transaction) {
            $meta = is_array($transaction->meta) ? $transaction->meta : (is_string($transaction->meta) ? json_decode($transaction->meta, true) : []);

            return [
                'id' => $transaction->id,
                'type' => $transaction->type,
                'status' => $transaction->status,
                'amount' => (float) $transaction->amount,
                'fee' => (float) ($transaction->fee ?? 0),
                'currency' => $transaction->currency ?? 'USD',
                'payment_method' => $transaction->payment_method,
                'transaction_id' => $transaction->transaction_id,
                'processed_at' => $transaction->processed_at?->toIso8601String(),
                'created_at' => $transaction->created_at->toIso8601String(),
                'meta' => $meta,
                // Include plan details if it's a plan purchase
                'plan_name' => $meta['plan_name'] ?? null,
                'plan_frequency' => $meta['plan_frequency'] ?? null,
                'credits_added' => $meta['credits_added'] ?? null,
                'description' => $meta['description'] ?? $transaction->description ?? null,
            ];
        });

        return Inertia::render('frontend/user-profile/billing', [
            'wallet' => [
                'connected' => $walletConnected,
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

    /**
     * Show reward points ledger (transaction history)
     */
    public function rewardPointsLedger(Request $request): Response
    {
        $user = auth()->user();

        $perPage = $request->get('per_page', 20);
        $page = $request->get('page', 1);

        $ledgerEntries = RewardPointLedger::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page)
            ->withQueryString()
            ->through(function ($entry) {
                return [
                    'id' => $entry->id,
                    'source' => $entry->source,
                    'type' => $entry->type,
                    'points' => $entry->points,
                    'description' => $entry->description,
                    'metadata' => $entry->metadata,
                    'created_at' => $entry->created_at->toISOString(),
                ];
            });

        // Get current balance
        $currentBalance = (float) ($user->reward_points ?? 0);

        // Calculate summary statistics
        $totalCredits = (float) RewardPointLedger::where('user_id', $user->id)
            ->where('type', 'credit')
            ->sum('points');

        $totalDebits = (float) RewardPointLedger::where('user_id', $user->id)
            ->where('type', 'debit')
            ->sum('points');

        return Inertia::render('frontend/user-profile/reward-points-ledger', [
            'ledgerEntries' => $ledgerEntries,
            'currentBalance' => $currentBalance,
            'summary' => [
                'total_credits' => $totalCredits,
                'total_debits' => $totalDebits,
                'net_points' => $totalCredits - $totalDebits,
            ],
            'filters' => [
                'per_page' => $perPage,
                'page' => $page,
            ],
        ]);
    }

    /**
     * Show user redemptions
     */
    public function redemptions(Request $request): Response
    {
        $user = auth()->user();

        $perPage = $request->get('per_page', 20);
        $page = $request->get('page', 1);

        $redemptions = MerchantHubOfferRedemption::where('user_id', $user->id)
            ->with(['offer.merchant', 'offer.category', 'eligibleItem'])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page)
            ->withQueryString()
            ->through(function ($redemption) {
                // Calculate pricing breakdown - ALWAYS use offer's cash_required as regular price
                $pricingBreakdown = null;
                if ($redemption->offer->cash_required && $redemption->offer->cash_required > 0) {
                    // cash_required on the offer is the REGULAR PRICE (before discount)
                    $discountPercentage = $redemption->offer->discount_percentage ?? 10.0;
                    $regularPrice = (float) $redemption->offer->cash_required;
                    $discountAmount = ($regularPrice * $discountPercentage) / 100;

                    // Apply discount cap if set
                    if ($redemption->offer->discount_cap && $discountAmount > $redemption->offer->discount_cap) {
                        $discountAmount = (float) $redemption->offer->discount_cap;
                    }

                    $discountPrice = $regularPrice - $discountAmount;

                    $pricingBreakdown = [
                        'regularPrice' => round($regularPrice, 2),
                        'discountPercentage' => round($discountPercentage, 2),
                        'discountAmount' => round($discountAmount, 2),
                        'discountPrice' => round($discountPrice, 2),
                    ];
                }

                return [
                    'id' => $redemption->id,
                    'receipt_code' => $redemption->receipt_code,
                    'points_spent' => $redemption->points_spent,
                    'cash_spent' => $redemption->cash_spent,
                    'status' => $redemption->status,
                    'used_at' => $redemption->used_at?->toISOString(),
                    'created_at' => $redemption->created_at->toISOString(),
                    'qr_code_url' => route('merchant-hub.redemption.qr-code', ['code' => $redemption->receipt_code]),
                    'verification_url' => route('merchant-hub.redemption.verify-page', ['code' => $redemption->receipt_code]),
                    'pricingBreakdown' => $pricingBreakdown,
                    'offer' => [
                        'id' => $redemption->offer->id,
                        'title' => $redemption->offer->title,
                        'image_url' => $redemption->offer->image_url,
                        'cash_required' => $redemption->offer->cash_required ? (float) $redemption->offer->cash_required : null,
                        'discount_percentage' => $redemption->offer->discount_percentage ? (float) $redemption->offer->discount_percentage : null,
                        'merchant' => [
                            'id' => $redemption->offer->merchant->id,
                            'name' => $redemption->offer->merchant->name,
                        ],
                        'category' => $redemption->offer->category ? [
                            'id' => $redemption->offer->category->id,
                            'name' => $redemption->offer->category->name,
                        ] : null,
                    ],
                    'eligible_item' => $redemption->eligibleItem ? [
                        'id' => $redemption->eligibleItem->id,
                        'item_name' => $redemption->eligibleItem->item_name,
                    ] : null,
                ];
            });

        return Inertia::render('frontend/user-profile/redemptions', [
            'redemptions' => $redemptions,
            'filters' => [
                'per_page' => $perPage,
                'page' => $page,
            ],
        ]);
    }
}
