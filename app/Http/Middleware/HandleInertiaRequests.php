<?php

namespace App\Http\Middleware;

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
        $isLivestockDomain = is_livestock_domain();
        $user = $isLivestockDomain 
            ? $request->user('livestock')
            : $request->user()?->load("organization");
        $role = $user?->roles?->first();

        // Get all permissions (both role-based and direct user permissions) - only for main app users
        $permissions = [];
        $roles = [];
        
        if ($user && !$isLivestockDomain) {
            $permissions = $user->getAllPermissions()->pluck('name')->toArray();
            $roles = $user->roles?->pluck('name')->toArray() ?? [];
        }

        // Build user data based on domain
        $userData = null;
        if ($user) {
            if ($isLivestockDomain) {
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
                // Main app user data
                $userData = [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->contact_number,
                    'role' => $user->role,
                    'organization_role' => $user->organization_role ?? null,
                    'balance'=>$user->balance,
                    'reward_points' => $user->reward_points ?? 0,
                    'credits' => $user->credits ?? 0,
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
                        'name' => $user->organization->name,
                        "registered_user_image" => $user->organization->registered_user_image ? '/storage/' . $user->organization->registered_user_image : null,
                        'contact_title' => $user->organization->contact_title,
                        'website' => $user->organization->website,
                        'description' => $user->organization->description,
                        'mission' => $user->organization->mission,
                        'address' => $user->organization->street . ', ' . $user->organization->city .  ', ' .  $user->organization->state . ', ' .  $user->organization->zip,
                        'joined' => $user->created_at->format('F Y'),
                    ] : null,
                ];
            }
        }
        
        return [
            ...parent::share($request),
            'name' => config('app.name'),
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
            'success' => fn() => $request->session()->get('success'),
            'error' => fn() => $request->session()->get('error'),
            'info' => fn() => $request->session()->get('info'),
            'warning' => fn() => $request->session()->get('warning'),
            'isImpersonating' => $request->session()->has('impersonate_user_id'),
            'originalUserId' => $request->session()->get('impersonate_user_id'),
            'livestockDomain' => config('livestock.domain'),
        ];
    }
}
