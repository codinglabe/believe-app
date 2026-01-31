<?php

namespace App\Http\Controllers;

use App\Models\Donation;
use App\Models\ExcelData;
use App\Models\Order;
use App\Models\Organization;
use App\Models\UserFavoriteOrganization;
use App\Models\UserFollow;
use App\Models\RaffleTicket;
use App\Models\SupporterPosition;
use App\Models\VolunteerTimesheet;
use App\Models\JobApplication;
use App\Models\RewardPointLedger;
use App\Models\MerchantHubOfferRedemption;
use App\Models\User;
use App\Models\Post;
use App\Models\PostReaction;
use App\Models\PostComment;
use App\Services\ImpactScoreService;
use App\Services\ExcelDataTransformer;
use Carbon\Carbon;
use App\Services\PrintifyService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
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
                'dob' => $user->dob ? (is_string($user->dob) ? $user->dob : \Carbon\Carbon::parse($user->dob)->format('Y-m-d')) : null,
                'image' => $user->image ? Storage::url($user->image) : null,
                'positions' => $userPositions, // current selected
                'city' => $user->city,
                'state' => $user->state,
                'zipcode' => $user->zipcode,
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
            'timezone' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'state' => ['nullable', 'string', 'max:2'],
            'zipcode' => ['nullable', 'string', 'max:10'],
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
        $updateData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'contact_number' => $validated['phone'] ?? null,
            'dob' => $validated['dob'] ?? null,
            'image' => $validated['image'] ?? $user->image,
            'city' => $validated['city'] ?? null,
            'state' => $validated['state'] ?? null,
            'zipcode' => $validated['zipcode'] ?? null,
        ];

        // Update timezone if provided and valid
        if (isset($validated['timezone']) && !empty($validated['timezone'])) {
            if (in_array($validated['timezone'], timezone_identifiers_list())) {
                $updateData['timezone'] = $validated['timezone'];
            }
        }

        $user->update($updateData);

        // Sync supporter positions
        if (array_key_exists('positions', $validated)) {
            // If you're using many-to-many, fix the relationship first
            $user->supporterPositions()->sync($validated['positions']);
        } else {
            $user->supporterPositions()->detach();
        }

        return back()->with('success', 'Profile updated successfully!');
    }

    /**
     * Update user timezone
     */
    public function updateTimezone(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'timezone' => ['required', 'string', 'max:255'],
        ]);

        // Validate timezone
        if (!in_array($validated['timezone'], timezone_identifiers_list())) {
            return back()->with('error', 'Invalid timezone provided.');
        }

        $user->update(['timezone' => $validated['timezone']]);

        // Update session
        session(['user_timezone' => $validated['timezone']]);

        return back()->with('success', 'Timezone updated successfully!');
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

    /**
     * Show public user profile
     */
    public function show(Request $request, string $slug)
    {
        // Find user by slug or ID
        $user = User::where('slug', $slug)
            ->orWhere('id', $slug)
            ->with(['supporterPositions'])
            ->first();

        if (!$user) {
            abort(404, 'User not found');
        }

        $authUser = Auth::user();
        $isOwnProfile = $authUser && $authUser->id === $user->id;

        // Check if authenticated user is following this user
        $isFollowing = false;
        if ($authUser && !$isOwnProfile) {
            $isFollowing = UserFollow::where('follower_id', $authUser->id)
                ->where('following_id', $user->id)
                ->exists();
        }

        // Get user stats
        $postsCount = Post::where('user_id', $user->id)->count();
        $donationsCount = Donation::where('user_id', $user->id)
            ->whereIn('status', ['completed', 'active'])
            ->count();
        $totalDonated = Donation::where('user_id', $user->id)
            ->whereIn('status', ['completed', 'active'])
            ->sum('amount');

        // Get follower/following counts
        $followersCount = UserFollow::where('following_id', $user->id)->count();
        $followingCount = UserFavoriteOrganization::where('user_id', $user->id)->count();

        // Get user's chat groups count
        $groupsCount = \App\Models\ChatRoom::whereHas('members', function ($query) use ($user) {
            $query->where('user_id', $user->id);
        })
        ->where('is_active', true)
        ->count();

        // Get recent donations for Activity tab
        $recentDonations = Donation::where('user_id', $user->id)
            ->whereIn('status', ['completed', 'active'])
            ->with('organization:id,name')
            ->latest()
            ->limit(10)
            ->get()
            ->map(function ($donation) {
                return [
                    'id' => $donation->id,
                    'organization_name' => $donation->organization->name ?? 'Unknown Organization',
                    'amount' => $donation->amount,
                    'date' => $donation->donation_date ?? $donation->created_at,
                    'frequency' => $donation->frequency ?? 'one-time',
                    'payment_method' => $donation->payment_method ?? 'stripe',
                ];
            });

        // Get job applications for Activity tab
        $jobApplications = JobApplication::where('user_id', $user->id)
            ->with('jobPost:id,title,organization_id')
            ->latest()
            ->limit(10)
            ->get()
            ->map(function ($application) {
                return [
                    'id' => $application->id,
                    'job_title' => $application->jobPost->title ?? 'Unknown Job',
                    'status' => $application->status,
                    'date' => $application->created_at,
                ];
            });

        // Get enrollments for Activity tab
        $enrollments = \App\Models\Enrollment::where('user_id', $user->id)
            ->with('course:id,name')
            ->latest()
            ->limit(10)
            ->get()
            ->map(function ($enrollment) {
                return [
                    'id' => $enrollment->id,
                    'course_title' => $enrollment->course->name ?? 'Unknown Course',
                    'status' => $enrollment->status,
                    'date' => $enrollment->enrolled_at ?? $enrollment->created_at,
                ];
            });

        // Get believe points
        $believePointsBalance = (float) ($user->believe_points ?? 0);
        $believePointsEarned = (float) ($totalDonated ?? 0);
        $believePointsSpent = 0; // TODO: Calculate if needed

        // Get reward points earned and spent from ledger
        $rewardPointsEarned = (int) RewardPointLedger::where('user_id', $user->id)
            ->where('type', 'credit')
            ->sum('points');
        $rewardPointsSpent = (int) RewardPointLedger::where('user_id', $user->id)
            ->where('type', 'debit')
            ->sum('points');
        $rewardPointsBalance = (float) ($user->reward_points ?? 0);

        // Get recent posts (limit to 5 for initial load)
        $authUserId = $authUser ? $authUser->id : null;
        $postFilter = $request->get('filter', 'user'); // 'all' or 'user'

        // Build query based on filter
        // Don't eager load user.organization to avoid ambiguous column error
        // The organization will be loaded via accessor when accessed
        $postsQuery = Post::with(['user:id,name,image,slug,role'])
            ->withCount(['reactions', 'comments']);

        if ($postFilter === 'user') {
            // Only this user's posts
            $postsQuery->where('user_id', $user->id);
        } else if ($postFilter === 'all' && $authUserId) {
            // Get followed organization user IDs (registered organizations)
            $followedOrgUserIds = UserFavoriteOrganization::where('user_id', $authUserId)
                ->whereNotNull('organization_id')
                ->pluck('organization_id')
                ->map(function ($orgId) {
                    $org = \App\Models\Organization::find($orgId);
                    return $org ? $org->user_id : null;
                })
                ->filter()
                ->unique()
                ->toArray();

            // Get followed organization user IDs from excel_data_id (unregistered orgs that later registered)
            $followedUnregisteredOrgUserIds = UserFavoriteOrganization::where('user_id', $authUserId)
                ->whereNotNull('excel_data_id')
                ->pluck('excel_data_id')
                ->map(function ($excelDataId) {
                    $excelData = \App\Models\ExcelData::find($excelDataId);
                    if ($excelData) {
                        $org = \App\Models\Organization::where('ein', $excelData->ein)
                            ->where('registration_status', 'approved')
                            ->first();
                        return $org ? $org->user_id : null;
                    }
                    return null;
                })
                ->filter()
                ->unique()
                ->toArray();

            // Get followed user IDs
            $followedUserIds = \App\Models\UserFollow::where('follower_id', $authUserId)
                ->pluck('following_id')
                ->toArray();

            // Combine all IDs: profile owner + followed organizations + followed users
            $allowedUserIds = array_merge(
                [$user->id], // Profile owner
                $followedOrgUserIds,
                $followedUnregisteredOrgUserIds,
                $followedUserIds
            );

            $postsQuery->whereIn('user_id', array_unique($allowedUserIds));
        } else if ($postFilter === 'all' && !$authUserId) {
            // If not authenticated, show only profile owner's posts
            $postsQuery->where('user_id', $user->id);
        }

        $posts = $postsQuery->latest()
            ->limit(5)
            ->get()
            ->map(function ($post) use ($authUserId) {
                $image = null;
                if ($post->images && is_array($post->images) && count($post->images) > 0) {
                    $image = $post->images[0];
                }

                // Get user's reaction if authenticated
                $userReaction = null;
                if ($authUserId) {
                    $reaction = PostReaction::where('post_id', $post->id)
                        ->where('user_id', $authUserId)
                        ->first();
                    if ($reaction) {
                        $userReaction = [
                            'id' => $reaction->id,
                            'type' => $reaction->type,
                            'user_id' => $reaction->user_id,
                        ];
                    }
                }

                // Load recent reactions with user data (limit to 10 for performance)
                $reactions = PostReaction::where('post_id', $post->id)
                    ->with('user:id,name,image')
                    ->latest()
                    ->limit(10)
                    ->get()
                    ->map(function ($reaction) {
                        return [
                            'id' => $reaction->id,
                            'type' => $reaction->type,
                            'user_id' => $reaction->user_id,
                            'user' => $reaction->user ? [
                                'id' => $reaction->user->id,
                                'name' => $reaction->user->name,
                                'image' => $reaction->user->image,
                            ] : null,
                        ];
                    });

                // Load recent comments with user data (limit to 5 for initial load)
                $comments = PostComment::where('post_id', $post->id)
                    ->with('user:id,name,image')
                    ->latest()
                    ->limit(5)
                    ->get()
                    ->map(function ($comment) {
                        return [
                            'id' => $comment->id,
                            'content' => $comment->content,
                            'created_at' => $comment->created_at,
                            'user' => $comment->user ? [
                                'id' => $comment->user->id,
                                'name' => $comment->user->name,
                                'image' => $comment->user->image,
                            ] : null,
                        ];
                    });

                // Determine creator info
                $creator = null;
                $creatorType = 'user';
                $creatorName = $post->user->name ?? 'Unknown';
                $creatorSlug = $post->user->slug ?? null;
                $creatorImage = $post->user->image ? Storage::url($post->user->image) : null;

                // Check if user has an organization
                if ($post->user && $post->user->role === 'organization' && $post->user->organization) {
                    $org = $post->user->organization;
                    $creator = [
                        'id' => $org->id,
                        'name' => $org->name,
                        'slug' => $post->user->slug,
                        'image' => $post->user->image ? Storage::url($post->user->image) : null,
                    ];
                    $creatorType = 'organization';
                    $creatorName = $org->name;
                    $creatorSlug = $post->user->slug;
                    $creatorImage = $post->user->image ? Storage::url($post->user->image) : null;
                } else if ($post->user) {
                    $creator = [
                        'id' => $post->user->id,
                        'name' => $post->user->name,
                        'slug' => $post->user->slug,
                        'image' => $post->user->image ? Storage::url($post->user->image) : null,
                    ];
                }

                return [
                    'id' => $post->id,
                    'title' => null, // Post model doesn't have title field
                    'content' => $post->content,
                    'image' => $image,
                    'images' => $post->images ?? [],
                    'created_at' => $post->created_at,
                    'reactions_count' => $post->reactions_count,
                    'comments_count' => $post->comments_count,
                    'user_reaction' => $userReaction,
                    'reactions' => $reactions->toArray(),
                    'comments' => $comments->toArray(),
                    'has_more_comments' => $post->comments_count > 5,
                    'creator' => $creator,
                    'creator_type' => $creatorType,
                    'creator_name' => $creatorName,
                    'creator_slug' => $creatorSlug,
                    'creator_image' => $creatorImage,
                    'user' => $post->user ? [
                        'id' => $post->user->id,
                        'name' => $post->user->name,
                        'image' => $post->user->image ? Storage::url($post->user->image) : null,
                        'slug' => $post->user->slug,
                    ] : null,
                ];
            });

        // Get user's favorite organizations (for "Following" tab)
        $favoriteOrganizations = UserFavoriteOrganization::where('user_id', $user->id)
            ->with(['organization.user:id,slug,name,image'])
            ->latest()
            ->limit(10)
            ->get()
            ->map(function ($fav) {
                // Handle both registered and unregistered organizations
                if ($fav->organization) {
                    // Registered organization
                    return [
                        'id' => $fav->organization_id,
                        'excel_data_id' => $fav->excel_data_id,
                        'name' => $fav->organization->name,
                        'slug' => $fav->organization->user->slug ?? null,
                        'image' => $fav->organization->user->image ?? null,
                    ];
                } elseif ($fav->excel_data_id) {
                    // Unregistered organization - get from ExcelData
                    $excelData = ExcelData::find($fav->excel_data_id);
                    if ($excelData) {
                        $rowData = $excelData->row_data;
                        $transformedData = ExcelDataTransformer::transform($rowData);
                        $orgName = $transformedData[1] ?? $rowData[1] ?? 'Unknown Organization';

                        return [
                            'id' => $fav->excel_data_id,
                            'excel_data_id' => $fav->excel_data_id,
                            'name' => $orgName,
                            'slug' => null,
                            'image' => null,
                        ];
                    }
                }

                // Fallback if neither organization nor excel_data exists
                return null;
            })
            ->filter() // Remove null entries
            ->values(); // Re-index array

        // Get sidebar data (People You May Know, Trending Organizations)
        $peopleYouMayKnow = [];
        $trendingOrganizations = [];

        if ($authUser) {
            // Get other users the current user might know
            $userFavoriteOrgIds = UserFavoriteOrganization::where('user_id', $authUser->id)
                ->pluck('organization_id')
                ->toArray();

            $suggestedOrgs = Organization::where('registration_status', 'approved')
                ->whereNotIn('id', $userFavoriteOrgIds)
                ->with('user:id,slug,name,image')
                ->limit(4)
                ->get();

            if ($suggestedOrgs->isNotEmpty()) {
                $eins = $suggestedOrgs->pluck('ein')->filter()->unique()->toArray();
                $excelDataMap = ExcelData::whereIn('ein', $eins)
                    ->where('status', 'complete')
                    ->orderBy('id', 'desc')
                    ->get()
                    ->groupBy('ein')
                    ->map(function($group) {
                        return $group->first()->id;
                    });

                $peopleYouMayKnow = $suggestedOrgs->map(function($org) use ($excelDataMap) {
                    return [
                        'id' => $org->id,
                        'excel_data_id' => $excelDataMap->get($org->ein) ?? null,
                        'slug' => $org->user?->slug ?? null,
                        'name' => $org->name,
                        'org' => $org->description ? \Illuminate\Support\Str::limit($org->description, 30) : 'Organization',
                        'avatar' => $org->user?->image ? '/storage/' . $org->user->image : null,
                    ];
                })->toArray();
            }

            // Get trending organizations
            $trendingOrgs = Organization::where('registration_status', 'approved')
                ->withCount('followers')
                ->with('user:id,slug,name')
                ->orderBy('followers_count', 'desc')
                ->limit(4)
                ->get();

            if ($trendingOrgs->isNotEmpty()) {
                $eins = $trendingOrgs->pluck('ein')->filter()->unique()->toArray();
                $excelDataMap = ExcelData::whereIn('ein', $eins)
                    ->where('status', 'complete')
                    ->orderBy('id', 'desc')
                    ->get()
                    ->groupBy('ein')
                    ->map(function($group) {
                        return $group->first()->id;
                    });

                $colors = ['bg-rose-500', 'bg-cyan-500', 'bg-teal-500', 'bg-blue-500'];

                $trendingOrganizations = $trendingOrgs->map(function($org, $index) use ($excelDataMap, $colors) {
                    return [
                        'id' => $org->id,
                        'excel_data_id' => $excelDataMap->get($org->ein) ?? null,
                        'slug' => $org->user?->slug ?? null,
                        'name' => $org->name,
                        'desc' => $org->description ? \Illuminate\Support\Str::limit($org->description, 50) : 'Organization description',
                        'color' => $colors[$index % count($colors)],
                    ];
                })->toArray();
            }
        }

        // Format user data
        $userData = [
            'id' => $user->id,
            'slug' => $user->slug,
            'name' => $user->name,
            'email' => $user->email,
            'image' => $user->image ? Storage::url($user->image) : null,
            'cover_img' => $user->cover_img ? Storage::url($user->cover_img) : null,
            'bio' => $user->bio ?? null,
            'location' => $user->location ?? null,
            'phone' => $user->contact_number ?? null,
            'created_at' => $user->created_at,
            'positions' => $user->supporterPositions->pluck('name')->toArray(),
            'is_own_profile' => $isOwnProfile,
            'is_following' => $isFollowing,
        ];

        $seoDescription = $user->bio
            ? \Illuminate\Support\Str::limit($user->bio, 160)
            : 'View ' . $user->name . "'s profile on " . config('app.name');

        return Inertia::render('frontend/user/user-show', [
            'seo' => [
                'title' => $user->name,
                'description' => $seoDescription,
            ],
            'user' => $userData,
            'posts' => $posts,
            'postsCount' => $postsCount,
            'donationsCount' => $donationsCount,
            'totalDonated' => $totalDonated,
            'postFilter' => $postFilter, // Pass filter to frontend
            'followersCount' => $followersCount,
            'followingCount' => $followingCount,
            'groupsCount' => $groupsCount,
            'favoriteOrganizations' => $favoriteOrganizations,
            'peopleYouMayKnow' => $peopleYouMayKnow,
            'trendingOrganizations' => $trendingOrganizations,
            'believePointsEarned' => $believePointsEarned,
            'believePointsSpent' => $believePointsSpent,
            'believePointsBalance' => $believePointsBalance,
            'rewardPointsEarned' => $rewardPointsEarned,
            'rewardPointsSpent' => $rewardPointsSpent,
            'rewardPointsBalance' => $rewardPointsBalance,
            'recentDonations' => $recentDonations,
            'jobApplications' => $jobApplications,
            'enrollments' => $enrollments,
            'currentPage' => 'posts', // Default to posts tab
        ]);
    }

    /**
     * Get user data for tab pages
     */
    private function getUserData(string $slug): array
    {
        $user = User::where('slug', $slug)
            ->orWhere('id', $slug)
            ->with(['supporterPositions'])
            ->first();

        if (!$user) {
            abort(404, 'User not found');
        }

        $authUser = Auth::user();
        $isOwnProfile = $authUser && $authUser->id === $user->id;

        // Check if authenticated user is following this user
        $isFollowing = false;
        if ($authUser && !$isOwnProfile) {
            $isFollowing = UserFollow::where('follower_id', $authUser->id)
                ->where('following_id', $user->id)
                ->exists();
        }

        // Get user stats
        $postsCount = Post::where('user_id', $user->id)->count();
        $donationsCount = Donation::where('user_id', $user->id)
            ->whereIn('status', ['completed', 'active'])
            ->count();
        $totalDonated = Donation::where('user_id', $user->id)
            ->whereIn('status', ['completed', 'active'])
            ->sum('amount');

        $followersCount = UserFollow::where('following_id', $user->id)->count();
        $followingCount = UserFavoriteOrganization::where('user_id', $user->id)->count();

        // Get believe points
        $believePointsBalance = (float) ($user->believe_points ?? 0);
        $believePointsEarned = (float) ($totalDonated ?? 0);
        $believePointsSpent = 0;

        // Get reward points earned and spent from ledger
        $rewardPointsEarned = (int) \App\Models\RewardPointLedger::where('user_id', $user->id)
            ->where('type', 'credit')
            ->sum('points');
        $rewardPointsSpent = (int) \App\Models\RewardPointLedger::where('user_id', $user->id)
            ->where('type', 'debit')
            ->sum('points');
        $rewardPointsBalance = (float) ($user->reward_points ?? 0);

        // Get user's public chat groups count (only public groups they're a member of)
        $groupsCount = \App\Models\ChatRoom::where('type', 'public')
            ->where('is_active', true)
            ->whereHas('members', function ($query) use ($user) {
                $query->where('user_id', $user->id);
            })
            ->count();

        // Get sidebar data
        $peopleYouMayKnow = [];
        $trendingOrganizations = [];

        if ($authUser) {
            $userFavoriteOrgIds = UserFavoriteOrganization::where('user_id', $authUser->id)
                ->pluck('organization_id')
                ->toArray();

            $suggestedOrgs = Organization::where('registration_status', 'approved')
                ->whereNotIn('id', $userFavoriteOrgIds)
                ->with('user:id,slug,name,image')
                ->limit(4)
                ->get();

            if ($suggestedOrgs->isNotEmpty()) {
                $eins = $suggestedOrgs->pluck('ein')->filter()->unique()->toArray();
                $excelDataMap = \App\Models\ExcelData::whereIn('ein', $eins)
                    ->where('status', 'complete')
                    ->orderBy('id', 'desc')
                    ->get()
                    ->groupBy('ein')
                    ->map(function($group) {
                        return $group->first()->id;
                    });

                $peopleYouMayKnow = $suggestedOrgs->map(function($org) use ($excelDataMap) {
                    return [
                        'id' => $org->id,
                        'excel_data_id' => $excelDataMap->get($org->ein) ?? null,
                        'slug' => $org->user?->slug ?? null,
                        'name' => $org->name,
                        'org' => $org->description ? \Illuminate\Support\Str::limit($org->description, 30) : 'Organization',
                        'avatar' => $org->user?->image ? '/storage/' . $org->user->image : null,
                    ];
                })->toArray();
            }

            $trendingOrgs = Organization::where('registration_status', 'approved')
                ->withCount('followers')
                ->with('user:id,slug,name')
                ->orderBy('followers_count', 'desc')
                ->limit(4)
                ->get();

            if ($trendingOrgs->isNotEmpty()) {
                $eins = $trendingOrgs->pluck('ein')->filter()->unique()->toArray();
                $excelDataMap = \App\Models\ExcelData::whereIn('ein', $eins)
                    ->where('status', 'complete')
                    ->orderBy('id', 'desc')
                    ->get()
                    ->groupBy('ein')
                    ->map(function($group) {
                        return $group->first()->id;
                    });

                $colors = ['bg-rose-500', 'bg-cyan-500', 'bg-teal-500', 'bg-blue-500'];

                $trendingOrganizations = $trendingOrgs->map(function($org, $index) use ($excelDataMap, $colors) {
                    return [
                        'id' => $org->id,
                        'excel_data_id' => $excelDataMap->get($org->ein) ?? null,
                        'slug' => $org->user?->slug ?? null,
                        'name' => $org->name,
                        'color' => $colors[$index % count($colors)],
                        'followers_count' => $org->followers_count,
                    ];
                })->toArray();
            }
        }

        // Build location string from city, state, zipcode
        $locationParts = array_filter([$user->city, $user->state]);
        $location = !empty($locationParts)
            ? implode(', ', $locationParts) . ($user->zipcode ? ' ' . $user->zipcode : '')
            : ($user->location ?? null);

        $userData = [
            'id' => $user->id,
            'slug' => $user->slug,
            'name' => $user->name,
            'email' => $user->email,
            'image' => $user->image,
            'cover_img' => $user->cover_img,
            'bio' => $user->bio,
            'location' => $location,
            'is_own_profile' => $isOwnProfile,
            'is_following' => $isFollowing,
            'city' => $user->city,
            'state' => $user->state,
            'zipcode' => $user->zipcode,
            'phone' => $user->phone,
            'created_at' => $user->created_at,
            'positions' => $user->supporterPositions->pluck('name')->toArray(),
            'is_own_profile' => $isOwnProfile,
            'reward_points' => (float) ($user->reward_points ?? 0),
        ];

        $seoDescription = $user->bio
            ? \Illuminate\Support\Str::limit($user->bio, 160)
            : 'View ' . $user->name . "'s profile on " . config('app.name');

        return [
            'seo' => [
                'title' => $user->name,
                'description' => $seoDescription,
            ],
            'user' => $userData,
            'postsCount' => $postsCount,
            'donationsCount' => $donationsCount,
            'totalDonated' => $totalDonated,
            'followersCount' => $followersCount,
            'followingCount' => $followingCount,
            'groupsCount' => $groupsCount,
            'peopleYouMayKnow' => $peopleYouMayKnow,
            'trendingOrganizations' => $trendingOrganizations,
            'believePointsEarned' => $believePointsEarned,
            'believePointsSpent' => $believePointsSpent,
            'believePointsBalance' => $believePointsBalance,
            'rewardPointsEarned' => $rewardPointsEarned,
            'rewardPointsSpent' => $rewardPointsSpent,
            'rewardPointsBalance' => $rewardPointsBalance,
        ];
    }

    /**
     * Show user posts tab
     */
    public function posts(Request $request, string $slug)
    {
        $data = $this->getUserData($slug);
        $user = User::where('slug', $slug)->orWhere('id', $slug)->first();

        $authUserId = Auth::id();
        $filter = $request->get('filter', 'user'); // 'all' or 'user'

        // Build query based on filter
        // Don't eager load user.organization to avoid ambiguous column error
        // We'll load organization data manually in the map function
        $postsQuery = Post::with(['user:id,name,image,slug,role'])
            ->withCount(['reactions', 'comments']);

        if ($filter === 'user') {
            // Only this user's posts
            $postsQuery->where('user_id', $user->id);
        } else if ($filter === 'all' && $authUserId) {
            // Get followed organization user IDs (registered organizations)
            $followedOrgUserIds = UserFavoriteOrganization::where('user_id', $authUserId)
                ->whereNotNull('organization_id')
                ->pluck('organization_id')
                ->map(function ($orgId) {
                    $org = \App\Models\Organization::find($orgId);
                    return $org ? $org->user_id : null;
                })
                ->filter()
                ->unique()
                ->toArray();

            // Get followed organization user IDs from excel_data_id (unregistered orgs that later registered)
            $followedUnregisteredOrgUserIds = UserFavoriteOrganization::where('user_id', $authUserId)
                ->whereNotNull('excel_data_id')
                ->pluck('excel_data_id')
                ->map(function ($excelDataId) {
                    $excelData = \App\Models\ExcelData::find($excelDataId);
                    if ($excelData) {
                        $org = \App\Models\Organization::where('ein', $excelData->ein)
                            ->where('registration_status', 'approved')
                            ->first();
                        return $org ? $org->user_id : null;
                    }
                    return null;
                })
                ->filter()
                ->unique()
                ->toArray();

            // Get followed user IDs
            $followedUserIds = \App\Models\UserFollow::where('follower_id', $authUserId)
                ->pluck('following_id')
                ->toArray();

            // Combine all IDs: profile owner + followed organizations + followed users
            $allowedUserIds = array_merge(
                [$user->id], // Profile owner
                $followedOrgUserIds,
                $followedUnregisteredOrgUserIds,
                $followedUserIds
            );

            $postsQuery->whereIn('user_id', array_unique($allowedUserIds));
        } else if ($filter === 'all' && !$authUserId) {
            // If not authenticated, show only profile owner's posts
            $postsQuery->where('user_id', $user->id);
        }

        $posts = $postsQuery->latest()
            ->limit(20)
            ->get()
            ->map(function ($post) use ($authUserId) {
                $image = null;
                if ($post->images && is_array($post->images) && count($post->images) > 0) {
                    $image = $post->images[0];
                }

                $userReaction = null;
                if ($authUserId) {
                    $reaction = PostReaction::where('post_id', $post->id)
                        ->where('user_id', $authUserId)
                        ->first();
                    if ($reaction) {
                        $userReaction = [
                            'id' => $reaction->id,
                            'type' => $reaction->type,
                            'user_id' => $reaction->user_id,
                        ];
                    }
                }

                $reactions = PostReaction::where('post_id', $post->id)
                    ->with('user:id,name,image')
                    ->latest()
                    ->limit(10)
                    ->get()
                    ->map(function ($reaction) {
                        return [
                            'id' => $reaction->id,
                            'type' => $reaction->type,
                            'user_id' => $reaction->user_id,
                            'user' => $reaction->user ? [
                                'id' => $reaction->user->id,
                                'name' => $reaction->user->name,
                                'image' => $reaction->user->image,
                            ] : null,
                        ];
                    });

                $comments = PostComment::where('post_id', $post->id)
                    ->with('user:id,name,image')
                    ->latest()
                    ->limit(5)
                    ->get()
                    ->map(function ($comment) {
                        return [
                            'id' => $comment->id,
                            'content' => $comment->content,
                            'created_at' => $comment->created_at,
                            'user' => $comment->user ? [
                                'id' => $comment->user->id,
                                'name' => $comment->user->name,
                                'image' => $comment->user->image,
                            ] : null,
                        ];
                    });

                // Determine creator info
                $creator = null;
                $creatorType = 'user';
                $creatorName = $post->user->name ?? 'Unknown';
                $creatorSlug = $post->user->slug ?? null;
                $creatorImage = $post->user->image ? Storage::url($post->user->image) : null;

                // Check if user has an organization - load it manually to avoid relationship issues
                if ($post->user && $post->user->role === 'organization') {
                    $org = \App\Models\Organization::where('user_id', $post->user->id)->first();
                    if ($org) {
                        $creator = [
                            'id' => $org->id,
                            'name' => $org->name,
                            'slug' => $post->user->slug,
                            'image' => $post->user->image ? Storage::url($post->user->image) : null,
                        ];
                        $creatorType = 'organization';
                        $creatorName = $org->name;
                        $creatorSlug = $post->user->slug;
                        $creatorImage = $post->user->image ? Storage::url($post->user->image) : null;
                    } else {
                        // User with organization role but no organization record
                        $creator = [
                            'id' => $post->user->id,
                            'name' => $post->user->name,
                            'slug' => $post->user->slug,
                            'image' => $post->user->image ? Storage::url($post->user->image) : null,
                        ];
                    }
                } else if ($post->user) {
                    $creator = [
                        'id' => $post->user->id,
                        'name' => $post->user->name,
                        'slug' => $post->user->slug,
                        'image' => $post->user->image ? Storage::url($post->user->image) : null,
                    ];
                }

                return [
                    'id' => $post->id,
                    'title' => null,
                    'content' => $post->content,
                    'image' => $image,
                    'images' => $post->images ?? [],
                    'created_at' => $post->created_at,
                    'reactions_count' => $post->reactions_count,
                    'comments_count' => $post->comments_count,
                    'user_reaction' => $userReaction,
                    'reactions' => $reactions->toArray(),
                    'comments' => $comments->toArray(),
                    'has_more_comments' => $post->comments_count > 5,
                    'creator' => $creator,
                    'creator_type' => $creatorType,
                    'creator_name' => $creatorName,
                    'creator_slug' => $creatorSlug,
                    'creator_image' => $creatorImage,
                    'user' => $post->user ? [
                        'id' => $post->user->id,
                        'name' => $post->user->name,
                        'image' => $post->user->image ? Storage::url($post->user->image) : null,
                        'slug' => $post->user->slug,
                    ] : null,
                ];
            });

        return Inertia::render('frontend/user/user-show', array_merge($data, [
            'posts' => $posts,
            'chatGroups' => [], // Groups loaded separately in groups tab
            'currentPage' => 'posts',
            'postFilter' => $filter, // Pass filter to frontend
        ]));
    }

    /**
     * Show user about tab
     */
    public function about(Request $request, string $slug)
    {
        $data = $this->getUserData($slug);
        return Inertia::render('frontend/user/user-show', array_merge($data, [
            'chatGroups' => [], // Groups loaded separately in groups tab
            'currentPage' => 'about',
        ]));
    }

    /**
     * Show user activity tab
     */
    public function activity(Request $request, string $slug)
    {
        $data = $this->getUserData($slug);
        $user = User::where('slug', $slug)->orWhere('id', $slug)->first();

        $page = $request->get('page', 1);
        $perPage = 5;

        // Get all activities and combine them
        $donations = Donation::where('user_id', $user->id)
            ->whereIn('status', ['completed', 'active'])
            ->with('organization:id,name')
            ->get()
            ->map(function ($donation) {
                return [
                    'id' => 'donation_' . $donation->id,
                    'type' => 'donation',
                    'title' => 'Donated $' . number_format($donation->amount, 2) . ' to ' . ($donation->organization->name ?? 'Unknown Organization'),
                    'description' => ($donation->frequency ?? 'one-time') !== 'one-time' ? ucfirst($donation->frequency) . ' donation' : null,
                    'date' => $donation->donation_date ?? $donation->created_at,
                    'data' => [
                        'id' => $donation->id,
                        'organization_name' => $donation->organization->name ?? 'Unknown Organization',
                        'amount' => $donation->amount,
                        'frequency' => $donation->frequency ?? 'one-time',
                        'payment_method' => $donation->payment_method ?? 'stripe',
                    ],
                ];
            });

        $jobApplications = JobApplication::where('user_id', $user->id)
            ->with('jobPost:id,title,organization_id')
            ->get()
            ->map(function ($application) {
                return [
                    'id' => 'job_' . $application->id,
                    'type' => 'job_application',
                    'title' => 'Applied for ' . ($application->jobPost->title ?? 'Unknown Job'),
                    'description' => 'Status: ' . ucfirst($application->status),
                    'date' => $application->created_at,
                    'data' => [
                        'id' => $application->id,
                        'job_title' => $application->jobPost->title ?? 'Unknown Job',
                        'status' => $application->status,
                    ],
                ];
            });

        $enrollments = \App\Models\Enrollment::where('user_id', $user->id)
            ->with('course:id,title')
            ->get()
            ->map(function ($enrollment) {
                return [
                    'id' => 'enrollment_' . $enrollment->id,
                    'type' => 'enrollment',
                    'title' => 'Enrolled in ' . ($enrollment->course->title ?? 'Unknown Course'),
                    'description' => 'Status: ' . ucfirst($enrollment->status),
                    'date' => $enrollment->enrolled_at ?? $enrollment->created_at,
                    'data' => [
                        'id' => $enrollment->id,
                        'course_title' => $enrollment->course->title ?? 'Unknown Course',
                        'status' => $enrollment->status,
                    ],
                ];
            });

        $posts = Post::where('user_id', $user->id)
            ->get()
            ->map(function ($post) {
                return [
                    'id' => 'post_' . $post->id,
                    'type' => 'post',
                    'title' => 'Posted in community feed',
                    'description' => $post->content ? \Illuminate\Support\Str::limit($post->content, 100) : null,
                    'date' => $post->created_at,
                    'data' => [
                        'id' => $post->id,
                        'content' => $post->content,
                    ],
                ];
            });

        // Combine all activities and sort by date
        $allActivities = collect()
            ->merge($donations)
            ->merge($jobApplications)
            ->merge($enrollments)
            ->merge($posts)
            ->sortByDesc('date')
            ->values();

        // Paginate manually
        $total = $allActivities->count();
        $totalPages = ceil($total / $perPage);
        $currentPage = min(max(1, $page), $totalPages);
        $offset = ($currentPage - 1) * $perPage;
        $paginatedActivities = $allActivities->slice($offset, $perPage)->values();

        return Inertia::render('frontend/user/user-show', array_merge($data, [
            'activities' => $paginatedActivities,
            'activityPagination' => [
                'current_page' => $currentPage,
                'last_page' => $totalPages,
                'per_page' => $perPage,
                'total' => $total,
                'from' => $offset + 1,
                'to' => min($offset + $perPage, $total),
            ],
            'chatGroups' => [], // Groups loaded separately in groups tab
            'currentPage' => 'activity',
        ]));
    }

    /**
     * Show user following tab
     */
    public function following(Request $request, string $slug)
    {
        $data = $this->getUserData($slug);
        $user = User::where('slug', $slug)->orWhere('id', $slug)->first();

        $favoriteOrganizations = UserFavoriteOrganization::where('user_id', $user->id)
            ->with(['organization.user:id,slug,name,image'])
            ->latest()
            ->limit(20)
            ->get()
            ->map(function ($fav) {
                // Handle both registered and unregistered organizations
                if ($fav->organization) {
                    // Registered organization
                    return [
                        'id' => $fav->organization_id,
                        'excel_data_id' => $fav->excel_data_id,
                        'name' => $fav->organization->name,
                        'slug' => $fav->organization->user->slug ?? null,
                        'image' => $fav->organization->user->image ?? null,
                    ];
                } elseif ($fav->excel_data_id) {
                    // Unregistered organization - get from ExcelData
                    $excelData = ExcelData::find($fav->excel_data_id);
                    if ($excelData) {
                        $rowData = $excelData->row_data;
                        $transformedData = ExcelDataTransformer::transform($rowData);
                        $orgName = $transformedData[1] ?? $rowData[1] ?? 'Unknown Organization';

                        return [
                            'id' => $fav->excel_data_id,
                            'excel_data_id' => $fav->excel_data_id,
                            'name' => $orgName,
                            'slug' => null,
                            'image' => null,
                        ];
                    }
                }

                // Fallback for invalid data
                return null;
            })
            ->filter(); // Remove null entries

        return Inertia::render('frontend/user/user-show', array_merge($data, [
            'favoriteOrganizations' => $favoriteOrganizations,
            'chatGroups' => [], // Groups loaded separately in groups tab
            'currentPage' => 'following',
        ]));
    }

    /**
     * Show user groups tab: only public group chats where this profile user is a member.
     */
    public function groups(Request $request, string $slug)
    {
        $data = $this->getUserData($slug);
        $user = User::where('slug', $slug)->orWhere('id', $slug)->first();
        if (!$user) {
            abort(404, 'User not found');
        }

        // Only public group chats where this user is a member
        $chatGroups = \App\Models\ChatRoom::where('type', 'public')
            ->where('is_active', true)
            ->whereHas('members', function ($query) use ($user) {
                $query->where('user_id', $user->id);
            })
            ->with(['creator:id,name,image', 'members:id,name,image', 'topics:id,name'])
            ->withCount('members')
            ->latest()
            ->limit(50)
            ->get()
        ->map(function ($room) {
            $latestMessage = $room->latestMessage()->with('user:id,name,image')->first();

            return [
                'id' => $room->id,
                'name' => $room->name,
                'description' => $room->description,
                'type' => $room->type,
                'image' => $room->image ? '/storage/' . $room->image : null,
                'created_by' => $room->created_by,
                'creator' => $room->creator ? [
                    'id' => $room->creator->id,
                    'name' => $room->creator->name,
                    'image' => $room->creator->image ? '/storage/' . $room->creator->image : null,
                ] : null,
                'members_count' => $room->members_count,
                'topics' => $room->topics->map(function ($topic) {
                    return [
                        'id' => $topic->id,
                        'name' => $topic->name,
                    ];
                }),
                'latest_message' => $latestMessage ? [
                    'id' => $latestMessage->id,
                    'content' => $latestMessage->message ?? '',
                    'created_at' => $latestMessage->created_at,
                    'user' => $latestMessage->user ? [
                        'id' => $latestMessage->user->id,
                        'name' => $latestMessage->user->name,
                        'image' => $latestMessage->user->image ? '/storage/' . $latestMessage->user->image : null,
                    ] : null,
                ] : null,
                'created_at' => $room->created_at,
            ];
        });

        return Inertia::render('frontend/user/user-show', array_merge($data, [
            'chatGroups' => $chatGroups,
            'currentPage' => 'groups',
        ]));
    }

    /**
     * Toggle follow status for a user
     */
    public function toggleFollow(Request $request, int $id)
    {
        $user = Auth::user();
        $targetUser = User::findOrFail($id);

        // Prevent users from following themselves
        if ($user->id === $targetUser->id) {
            return response()->json(['error' => 'You cannot follow yourself'], 400);
        }

        $follow = UserFollow::where('follower_id', $user->id)
            ->where('following_id', $targetUser->id)
            ->first();

        if ($follow) {
            $follow->delete();
            $isFollowing = false;
            $message = 'Unfollowed user';
        } else {
            UserFollow::create([
                'follower_id' => $user->id,
                'following_id' => $targetUser->id,
            ]);
            $isFollowing = true;
            $message = 'Following user';
        }

        // For API requests (axios/fetch), return JSON response
        // Check if it's NOT an Inertia request (axios doesn't send X-Inertia header)
        $isAjaxRequest = $request->header('X-Requested-With') === 'XMLHttpRequest'
            && !$request->header('X-Inertia');

        if ($isAjaxRequest || $request->wantsJson() || $request->expectsJson()) {
            return response()->json([
                'success' => true,
                'is_following' => $isFollowing,
                'message' => $message,
            ]);
        }

        // For Inertia requests, redirect back
        $referer = $request->header('Referer');
        if ($referer) {
            return redirect($referer);
        }
        return redirect()->route('users.show', $targetUser->slug);
    }
}
