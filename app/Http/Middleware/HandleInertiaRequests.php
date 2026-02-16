<?php

namespace App\Http\Middleware;

use App\Models\AdminSetting;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        // Check if we're on livestock domain and use appropriate guard
        // For development, manually set or check domain
        $isLivestockDomain = false;
        $isMerchantDomain = false;

        if (function_exists('is_livestock_domain')) {
            $isLivestockDomain = is_livestock_domain();
        } else {
            // Fallback for development
            $isLivestockDomain = app()->environment('local') &&
                (request()->has('livestock') ||
                    str_contains(request()->url(), 'livestock'));
        }

        // Check if we're on merchant domain
        $merchantDomain = config('merchant.domain');
        $currentHost = $request->getHost();
        $isMerchantDomain = $currentHost === $merchantDomain || str_contains($currentHost, 'merchant.');

        // Get user based on domain
        if ($isMerchantDomain) {
            $user = $request->user('merchant');
        } elseif ($isLivestockDomain) {
            $user = $request->user('livestock');
        } else {
            $user = $request->user();
        }

        // Only load organization relationship if user is not a LivestockUser or Merchant
        // Load organization manually to avoid ambiguous column error with hasOneThrough
        if ($user && !$isLivestockDomain && !$isMerchantDomain && !($user instanceof \App\Models\LivestockUser) && !($user instanceof \App\Models\Merchant)) {
            // Load organization manually through board_members to avoid relationship query issues
            // This prevents the ambiguous column error when eager loading
            $boardMember = $user->boardMemberships()->first();
            if ($boardMember) {
                $organization = \App\Models\Organization::find($boardMember->organization_id);
                if ($organization) {
                    $user->setRelation('organization', $organization);
                }
            }
            $user->load("serviceSellerProfile");
        }
        // Only access roles if user is not a LivestockUser or Merchant (User model has roles via Spatie Permission)
        $role = null;
        if ($user && !($user instanceof \App\Models\LivestockUser) && !($user instanceof \App\Models\Merchant)) {
            $role = $user->roles?->first();
        }

        // Get all permissions (both role-based and direct user permissions) - only for main app users
        $permissions = [];
        $roles = [];

        if ($user && !$isLivestockDomain && !$isMerchantDomain && !($user instanceof \App\Models\LivestockUser) && !($user instanceof \App\Models\Merchant) && method_exists($user, 'getAllPermissions')) {
            $permissions = $user->getAllPermissions()->pluck('name')->toArray();
            $roles = $user->roles?->pluck('name')->toArray() ?? [];
        }

        // Build user data based on domain
        $userData = null;
        if ($user) {
            if ($isMerchantDomain || ($user instanceof \App\Models\Merchant)) {
                // Real-time check: Get subscription and refresh from Stripe
                $subscription = $user->subscriptions()
                    ->whereIn('stripe_status', ['active', 'trialing', 'canceled'])
                    ->orderBy('created_at', 'desc')
                    ->first();

                $hasActiveSubscription = false;

                if ($subscription) {
                    // Real-time check: Refresh subscription status from Stripe
                    try {
                        if ($subscription->stripe_id) {
                            $stripe = \Laravel\Cashier\Cashier::stripe();
                            $stripeSubscription = $stripe->subscriptions->retrieve($subscription->stripe_id);

                            // Update local subscription with latest data from Stripe
                            $subscription->stripe_status = $stripeSubscription->status;
                            $subscription->ends_at = $stripeSubscription->cancel_at ?
                                \Carbon\Carbon::createFromTimestamp($stripeSubscription->cancel_at) : null;
                            $subscription->trial_ends_at = $stripeSubscription->trial_end ?
                                \Carbon\Carbon::createFromTimestamp($stripeSubscription->trial_end) : null;

                            // If cancel_at is set, mark as canceled even if status is still 'active'
                            if ($stripeSubscription->cancel_at) {
                                $subscription->stripe_status = 'canceled';
                            }

                            $subscription->save();

                            // Check if subscription is truly active (not canceled)
                            $hasActiveSubscription = in_array($stripeSubscription->status, ['active', 'trialing'])
                                && $stripeSubscription->cancel_at === null;
                        }
                    } catch (\Exception $e) {
                        \Log::warning('Failed to refresh subscription status in HandleInertiaRequests', [
                            'merchant_id' => $user->id,
                            'subscription_id' => $subscription->id,
                            'error' => $e->getMessage(),
                        ]);

                        // Fallback: check local status
                        $hasActiveSubscription = in_array($subscription->stripe_status, ['active', 'trialing'])
                            && $subscription->ends_at === null;
                    }
                }

                // Merchant user data
                $userData = [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'business_name' => $user->business_name,
                    'business_description' => $user->business_description,
                    'website' => $user->website,
                    'phone' => $user->phone,
                    'address' => $user->address,
                    'city' => $user->city,
                    'state' => $user->state,
                    'zip_code' => $user->zip_code,
                    'country' => $user->country,
                    'status' => $user->status,
                    'role' => $user->role,
                    'email_verified_at' => $user->email_verified_at,
                    'joined' => $user->created_at->format('F Y'),
                    'has_active_subscription' => $hasActiveSubscription,
                ];
            } elseif ($isLivestockDomain || ($user instanceof \App\Models\LivestockUser)) {
                // Livestock user data
                $userData = [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'profile_image' => $user->profile_image ? '/storage/' . $user->profile_image : null,
                    'bio' => $user->bio,
                    'status' => $user->status,
                    'is_verified' => $user->is_verified,
                    'email_verified_at' => $user->email_verified_at,
                    'joined' => $user->created_at->format('F Y'),
                    'seller_profile' => $user->sellerProfile ? [
                        'farm_name' => $user->sellerProfile->farm_name,
                        'verification_status' => $user->sellerProfile->verification_status,
                        'rejection_reason' => $user->sellerProfile->rejection_reason,
                    ] : null,
                    'buyer_profile' => $user->buyerProfile ? [
                        'farm_name' => $user->buyerProfile->farm_name,
                        'verification_status' => $user->buyerProfile->verification_status,
                        'rejection_reason' => $user->buyerProfile->rejection_reason,
                    ] : null,
                ];
            } else {
                // Main app user data (only for regular User models)
                if (!($user instanceof \App\Models\LivestockUser) && !($user instanceof \App\Models\Merchant)) {
                    $userData = [
                        'id' => $user->id,
                        'slug' => $user->slug ?? null,
                        'name' => $user->name,
                        'email' => $user->email,
                        'phone' => $user->contact_number,
                        'role' => $user->role,
                        'organization_role' => $user->organization_role ?? null,
                        'balance'=>$user->balance,
                        'reward_points' => $user->reward_points ?? 0,
                        'believe_points' => $user->believe_points ?? 0,
                        'credits' => $user->credits ?? 0,
                        'current_plan_id' => $user->current_plan_id ?? null,
                        'current_plan_details' => $user->current_plan_details ?? null,
                        "image" => $user->role !== "organization" ? ($user->image ? '/storage/' . $user->image : null) :  ($user->organization?->user->image ? '/storage/' . $user->organization?->user->image : null),
                        'favorite_organizations_count' => $user->favoriteOrganizations()->count(),
                        "cover_img" => $user->role !== "organization" ? ($user->cover_img ? '/storage/' . $user->cover_img : null) :($user->organization?->user?->cover_img ? '/storage/' . $user->organization?->user?->cover_img : null),
                        "dob" => $user->dob,
                        'joined' => $user->created_at->format('F Y'),
                        "email_verified_at" => $user->email_verified_at,
                        "ownership_verified_at" => $user->ownership_verified_at,
                        'referral_link' => $user->referral_code ? url('/register?ref=' . $user->referral_code) : null,
                        'push_token' => $user->push_token ?? null,
                        'timezone' => $user->timezone ?? 'UTC',
                        "organization" => $user->organization ? [
                            'id' => $user->organization->id,
                            'ein' => $user->organization->ein ?? null,
                            'name' => $user->organization->name,
                            "registered_user_image" => $user->organization->registered_user_image ? '/storage/' . $user->organization->registered_user_image : null,
                            'contact_title' => $user->organization->contact_title,
                            'website' => $user->organization->website,
                            'youtube_channel_url' => $user->organization->youtube_channel_url ?? null,
                            'description' => $user->organization->description,
                            'mission' => $user->organization->mission,
                            'address' => $user->organization->street . ', ' . $user->organization->city .  ', ' .  $user->organization->state . ', ' .  $user->organization->zip,
                            'joined' => $user->created_at->format('F Y'),
                            'gift_card_terms_approved' => $user->organization->gift_card_terms_approved ?? false,
                            'gift_card_terms_approved_at' => $user->organization->gift_card_terms_approved_at ? $user->organization->gift_card_terms_approved_at->toISOString() : null,
                            'public_view_slug' => $user->slug ?? $user->id, // Use user slug for public view
                        ] : null,
                        'service_seller_profile' => $user->serviceSellerProfile ? [
                            'id' => $user->serviceSellerProfile->id,
                            'verification_status' => $user->serviceSellerProfile->verification_status,
                        ] : null,
                    ];
                }
            }
        }

        // Get footer settings
        $footerSettings = \App\Models\AdminSetting::get('footer_settings', null);
        if ($footerSettings && is_array($footerSettings)) {
            // Settings are already decoded from JSON
        } else {
            $footerSettings = null;
        }

        // SEO (from admin SEO settings) for main app only — used for social share previews (Facebook, WhatsApp, etc.)
        $seoSiteName = (!$isLivestockDomain && !$isMerchantDomain) ? \App\Services\SeoService::getSiteName() : null;
        $seoCanonical = (!$isLivestockDomain && !$isMerchantDomain) ? $request->url() : null;
        $seoDefaultImage = (!$isLivestockDomain && !$isMerchantDomain) ? \App\Services\SeoService::getDefaultShareImage() : null;

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'seoSiteName' => $seoSiteName,
            'seoCanonical' => $seoCanonical,
            'seoDefaultImage' => $seoDefaultImage,
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $userData,
                'permissions' => $permissions,
                'roles' => $roles,
            ],
            'ziggy' => fn(): array => [
                ...(new Ziggy)->toArray(),
                'location' => $request->url(),
            ],
            'csrf_token' => csrf_token(),
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'flash' => fn() => $request->session()->get('flash') ?? null,
            'browser_publish_url' => fn() => $request->session()->pull('browser_publish_url'),
            'success' => fn() => $request->session()->get('success'),
            'error' => fn() => $request->session()->get('error'),
            'info' => fn() => $request->session()->get('info'),
            'warning' => fn() => $request->session()->get('warning'),
            'isImpersonating' => $request->session()->has('impersonate_user_id'),
            'originalUserId' => $request->session()->get('impersonate_user_id'),
            'livestockDomain' => config('livestock.domain'),
            'merchantDomain' => config('merchant.domain'),
            'footerSettings' => $footerSettings,
        ];
    }
}
