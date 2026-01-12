<?php

namespace App\Http\Controllers\Merchant;

use App\Http\Controllers\Controller;
use App\Models\MerchantHubOffer;
use App\Models\MerchantHubCategory;
use App\Models\MerchantHubOfferRedemption;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Stripe\Stripe;
use Stripe\Checkout\Session as StripeSession;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class HubController extends Controller
{
    /**
     * Display a listing of offers for the public hub.
     */
    public function index(Request $request): Response
    {
        $query = MerchantHubOffer::with(['merchant', 'category'])
            ->where('status', 'active')
            ->where(function ($q) {
                $q->whereNull('starts_at')
                    ->orWhere('starts_at', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('ends_at')
                    ->orWhere('ends_at', '>=', now());
            });

        // Category filter
        if ($request->has('category') && $request->category) {
            $category = MerchantHubCategory::where('slug', $request->category)->first();
            if ($category) {
                $query->where('merchant_hub_category_id', $category->id);
            }
        }

        // Merchant filter
        if ($request->has('merchant') && $request->merchant) {
            $query->whereHas('merchant', function ($q) use ($request) {
                $q->where('slug', $request->merchant);
            });
        }

        // Search filter
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'LIKE', "%{$search}%")
                    ->orWhere('short_description', 'LIKE', "%{$search}%")
                    ->orWhere('description', 'LIKE', "%{$search}%")
                    ->orWhereHas('merchant', function ($q) use ($search) {
                        $q->where('name', 'LIKE', "%{$search}%");
                    });
            });
        }

        // Points filter
        if ($request->has('min_points') && $request->min_points) {
            $query->where('points_required', '>=', $request->min_points);
        }
        if ($request->has('max_points') && $request->max_points) {
            $query->where('points_required', '<=', $request->max_points);
        }

        // Cash required filter
        if ($request->has('has_cash') && $request->has_cash) {
            $query->whereNotNull('cash_required');
        }

        // Sorting
        $sort = $request->get('sort', 'newest');
        switch ($sort) {
            case 'points_asc':
                $query->orderBy('points_required', 'asc');
                break;
            case 'points_desc':
                $query->orderBy('points_required', 'desc');
                break;
            case 'cash_asc':
                $query->orderBy('cash_required', 'asc')->whereNotNull('cash_required');
                break;
            case 'cash_desc':
                $query->orderBy('cash_required', 'desc')->whereNotNull('cash_required');
                break;
            case 'newest':
            default:
                $query->orderBy('created_at', 'desc');
                break;
        }

        $perPage = $request->get('per_page', 12);
        $offers = $query->paginate($perPage)->withQueryString();

        // Transform offers for frontend
        $transformedOffers = $offers->through(function ($offer) {
            $imageUrl = $offer->image_url;
            if ($imageUrl && !filter_var($imageUrl, FILTER_VALIDATE_URL)) {
                $imageUrl = Storage::disk('public')->url($imageUrl);
            }

            return [
                'id' => (string) $offer->id,
                'slug' => $offer->slug,
                'title' => $offer->title,
                'image' => $imageUrl ?: '/placeholder.jpg',
                'pointsRequired' => $offer->points_required,
                'cashRequired' => $offer->cash_required ? (float) $offer->cash_required : null,
                'currency' => $offer->currency,
                'merchantName' => $offer->merchant->name,
                'merchantSlug' => $offer->merchant->slug,
                'category' => $offer->category->name,
                'categorySlug' => $offer->category->slug,
                'description' => $offer->short_description ?: $offer->description,
            ];
        });

        // Get categories with counts
        $categories = MerchantHubCategory::where('is_active', true)
            ->withCount(['offers' => function ($query) {
                $query->where('status', 'active')
                    ->where(function ($q) {
                        $q->whereNull('starts_at')
                            ->orWhere('starts_at', '<=', now());
                    })
                    ->where(function ($q) {
                        $q->whereNull('ends_at')
                            ->orWhere('ends_at', '>=', now());
                    });
            }])
            ->get()
            ->map(function ($category) {
                return [
                    'id' => $category->id,
                    'name' => $category->name,
                    'slug' => $category->slug,
                    'offers_count' => $category->offers_count,
                ];
            });

        return Inertia::render('merchant/Hub/Index', [
            'offers' => $transformedOffers,
            'categories' => $categories,
            'filters' => [
                'category' => $request->get('category'),
                'merchant' => $request->get('merchant'),
                'search' => $request->get('search'),
                'min_points' => $request->get('min_points'),
                'max_points' => $request->get('max_points'),
                'has_cash' => $request->get('has_cash'),
                'sort' => $sort,
                'per_page' => (int) $perPage,
            ],
        ]);
    }

    /**
     * Create Stripe checkout session for offer redemption
     */
    public function checkout(Request $request)
    {
        $request->validate([
            'offer_id' => 'required|integer|exists:merchant_hub_offers,id',
        ]);

        // Check both web and merchant guards - get authenticated user from either guard
        $user = Auth::user();
        $merchant = Auth::guard('merchant')->user();

        // Determine which user we're working with
        $userModel = null;
        $isMerchant = false;

        if ($user && $user instanceof \App\Models\User) {
            // Regular user logged in via web guard
            $userModel = $user;
        } elseif ($merchant) {
            // Merchant logged in - find or create linked User account
            $isMerchant = true;
            $linkedUser = \App\Models\User::where('email', $merchant->email)->first();

            if (!$linkedUser) {
                // Automatically create a User account for the merchant
                $linkedUser = \App\Models\User::create([
                    'name' => $merchant->name,
                    'email' => $merchant->email,
                    'password' => bcrypt(Str::random(32)), // Random password since merchant uses different auth
                    'role' => 'user',
                    'believe_points' => 0, // Start with 0 points
                    'email_verified_at' => $merchant->email_verified_at ?? now(),
                ]);
            }

            $userModel = $linkedUser;
        }

        if (!$userModel) {
            return response()->json([
                'success' => false,
                'error' => 'You must be logged in to redeem offers.'
            ], 401);
        }

        // Use the User model for all operations
        $user = $userModel;

        DB::beginTransaction();

        try {
            $offer = MerchantHubOffer::with(['merchant', 'category'])->findOrFail($request->offer_id);

            // Validate offer is available
            if (!$offer->isAvailable()) {
                return response()->json([
                    'success' => false,
                    'error' => 'This offer is no longer available.'
                ], 400);
            }

            // No points check - if logged in, can redeem
            // For merchants, allow redemption without points requirement
            $userPoints = $user->currentBelievePoints();
            $pointsToDeduct = 0; // Don't deduct points - allow free redemption for logged in users

            // If user has enough points and wants to use them, allow it
            if ($userPoints >= $offer->points_required && !$isMerchant) {
                $pointsToDeduct = $offer->points_required;
            }

            // Generate unique receipt code
            $receiptCode = 'RED-' . strtoupper(Str::random(8));

            // Calculate cash required (0 if not required)
            $cashRequired = $offer->cash_required ?? 0;

            // Create redemption record with pending status
            $redemption = MerchantHubOfferRedemption::create([
                'merchant_hub_offer_id' => $offer->id,
                'user_id' => $user->id,
                'points_spent' => $pointsToDeduct,
                'cash_spent' => $cashRequired,
                'status' => 'pending',
                'receipt_code' => $receiptCode,
            ]);

            // Deduct points only if user has them and wants to use them
            if ($pointsToDeduct > 0) {
                if (!$user->deductBelievePoints($pointsToDeduct)) {
                    // If points deduction fails, continue without points (allow free redemption)
                    $pointsToDeduct = 0;
                }
            }

            // Create Stripe checkout session if cash is required, otherwise approve immediately
            if ($cashRequired > 0) {
                // Set Stripe API key
                Stripe::setApiKey(config('services.stripe.secret'));

                // Create line items for Stripe
                $lineItems = [
                    [
                        'price_data' => [
                            'currency' => strtolower($offer->currency ?? 'usd'),
                            'product_data' => [
                                'name' => $offer->title,
                                'description' => 'Merchant Hub Offer Redemption - ' . $offer->merchant->name,
                            ],
                            'unit_amount' => (int)($cashRequired * 100), // Convert to cents
                        ],
                        'quantity' => 1,
                    ],
                ];

                $session = StripeSession::create([
                    'payment_method_types' => ['card'],
                    'line_items' => $lineItems,
                    'mode' => 'payment',
                    'customer_email' => $user->email,
                    'success_url' => route('hub.offer.success') . '?session_id={CHECKOUT_SESSION_ID}',
                    'cancel_url' => route('hub.offer.show', $offer->slug),
                    'metadata' => [
                        'redemption_id' => $redemption->id,
                        'user_id' => $user->id,
                        'offer_id' => $offer->id,
                        'type' => 'merchant_hub_redemption',
                        'is_merchant' => $isMerchant ? 'true' : 'false',
                    ],
                ]);

                DB::commit();

                return response()->json([
                    'success' => true,
                    'url' => $session->url,
                ]);
            } else {
                // No cash required, approve immediately
                $redemption->update(['status' => 'approved']);

                // Create transaction record
                Transaction::create([
                    'user_id' => $user->id,
                    'related_id' => $redemption->id,
                    'related_type' => MerchantHubOfferRedemption::class,
                    'type' => 'purchase',
                    'status' => 'completed',
                    'amount' => 0,
                    'fee' => 0,
                    'currency' => $offer->currency ?? 'USD',
                    'payment_method' => 'points',
                    'meta' => [
                        'points_spent' => $pointsToDeduct,
                        'offer_id' => $offer->id,
                        'receipt_code' => $receiptCode,
                        'is_merchant_redemption' => $isMerchant,
                    ],
                    'processed_at' => now(),
                ]);

                DB::commit();

                return response()->json([
                    'success' => true,
                    'url' => route('hub.offer.success', ['code' => $receiptCode]),
                ]);
            }

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Offer redemption checkout error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'An error occurred during checkout. Please try again.'
            ], 500);
        }
    }

    /**
     * Handle successful payment from Stripe
     */
    public function success(Request $request)
    {
        $sessionId = $request->get('session_id');
        $code = $request->get('code');

        if (!$sessionId && !$code) {
            return redirect()->route('hub.index')
                ->with('error', 'Invalid session.');
        }

        DB::beginTransaction();

        try {
            if ($sessionId) {
                // Handle Stripe payment success
                Stripe::setApiKey(config('services.stripe.secret'));
                $session = StripeSession::retrieve($sessionId);

                if ($session->payment_status !== 'paid') {
                    return redirect()->route('hub.index')
                        ->with('error', 'Payment was not completed.');
                }

                $metadata = $session->metadata ?? [];
                $redemptionId = $metadata->redemption_id ?? null;

                if (!$redemptionId) {
                    return redirect()->route('hub.index')
                        ->with('error', 'Invalid redemption session.');
                }

                $redemption = MerchantHubOfferRedemption::with(['offer', 'user'])->findOrFail($redemptionId);

                // Update redemption status
                $redemption->update([
                    'status' => 'approved',
                ]);

                // Create transaction record
                Transaction::create([
                    'user_id' => $redemption->user_id,
                    'related_id' => $redemption->id,
                    'related_type' => MerchantHubOfferRedemption::class,
                    'type' => 'purchase',
                    'status' => 'completed',
                    'amount' => $redemption->cash_spent,
                    'fee' => 0,
                    'currency' => $redemption->offer->currency ?? 'USD',
                    'payment_method' => 'stripe',
                    'transaction_id' => $session->payment_intent,
                    'meta' => [
                        'stripe_session_id' => $sessionId,
                        'points_spent' => $redemption->points_spent,
                        'offer_id' => $redemption->offer->id,
                        'receipt_code' => $redemption->receipt_code,
                    ],
                    'processed_at' => now(),
                ]);

                DB::commit();

                // Generate QR code URL
                $qrCodeUrl = route('merchant-hub.redemption.qr-code', ['code' => $redemption->receipt_code]);

                // Render success page instead of redirecting to avoid loop
                $redemptionData = [
                    'id' => $redemption->id,
                    'code' => $redemption->receipt_code,
                    'points_used' => $redemption->points_spent,
                    'cash_paid' => $redemption->cash_spent,
                    'offer' => [
                        'id' => $redemption->offer->id,
                        'title' => $redemption->offer->title,
                        'image' => $redemption->offer->image_url ?: '/placeholder.jpg',
                    ],
                    'status' => $redemption->status,
                    'redeemed_at' => $redemption->created_at->toIso8601String(),
                    'qr_code_url' => $qrCodeUrl,
                ];

                return Inertia::render('merchant/RedemptionConfirmed', [
                    'redemption' => $redemptionData,
                ]);
            } else {
                // Handle points-only redemption (no cash)
                $redemption = MerchantHubOfferRedemption::with(['offer', 'user'])
                    ->where('receipt_code', $code)
                    ->firstOrFail();

                DB::commit();

                // Generate QR code URL
                $qrCodeUrl = route('merchant-hub.redemption.qr-code', ['code' => $redemption->receipt_code]);

                // Render success page instead of redirecting
                $redemptionData = [
                    'id' => $redemption->id,
                    'code' => $redemption->receipt_code,
                    'points_used' => $redemption->points_spent,
                    'cash_paid' => $redemption->cash_spent,
                    'offer' => [
                        'id' => $redemption->offer->id,
                        'title' => $redemption->offer->title,
                        'image' => $redemption->offer->image_url ?: '/placeholder.jpg',
                    ],
                    'status' => $redemption->status,
                    'redeemed_at' => $redemption->created_at->toIso8601String(),
                    'qr_code_url' => $qrCodeUrl,
                ];

                return Inertia::render('merchant/RedemptionConfirmed', [
                    'redemption' => $redemptionData,
                ]);
            }
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Offer redemption success handler error: ' . $e->getMessage());
            return redirect()->route('hub.index')
                ->with('error', 'An error occurred while processing your redemption. Please contact support.');
        }
    }
}

