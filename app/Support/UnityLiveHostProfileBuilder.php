<?php

namespace App\Support;

use App\Models\Organization;
use App\Models\OrganizationLivestream;
use App\Models\User;
use App\Models\UserFavoriteOrganization;
use App\Models\UserFollow;
use App\Models\UserLivestream;
use Illuminate\Support\Facades\Auth;

final class UnityLiveHostProfileBuilder
{
    /**
     * @return array<string, mixed>
     */
    public static function forLivestream(OrganizationLivestream|UserLivestream $livestream): array
    {
        if ($livestream instanceof OrganizationLivestream) {
            return self::forOrganizationLivestream($livestream);
        }

        return self::forUserLivestream($livestream);
    }

    /**
     * @return array<string, mixed>
     */
    private static function forOrganizationLivestream(OrganizationLivestream $livestream): array
    {
        $livestream->loadMissing('organization.user:id,slug,name,email,image,cover_img,is_verified');

        $org = $livestream->organization;
        $user = $org?->user;
        $isFollowing = false;
        $isOwnProfile = false;

        if (Auth::check()) {
            $authUser = Auth::user();
            $authOrg = Organization::forAuthUser($authUser);
            $isOwnProfile = $authOrg !== null && $org !== null && (int) $authOrg->id === (int) $org->id;

            if (! $isOwnProfile && $org !== null) {
                $isFollowing = UserFavoriteOrganization::query()
                    ->where('user_id', $authUser->id)
                    ->where('organization_id', $org->id)
                    ->exists();
            }
        }

        $avatarUrl = null;
        if ($user?->image) {
            $avatarUrl = asset('storage/'.$user->image);
        } elseif ($org?->registered_user_image) {
            $avatarUrl = asset('storage/'.$org->registered_user_image);
        }

        $profileSlug = $user?->slug;
        $profileUrl = $profileSlug ? route('organizations.show', $profileSlug) : null;

        return [
            'hostType' => 'organization',
            'hostId' => $org?->id,
            'hostUserId' => $user?->id,
            'name' => $org?->name ?? 'Organization',
            'tagline' => $org?->mission ? trim((string) $org->mission) : null,
            'avatarUrl' => $avatarUrl,
            'profileUrl' => $profileUrl,
            'profileSlug' => $profileSlug,
            'isVerified' => (bool) ($user?->is_verified ?? false),
            'isFollowing' => $isFollowing,
            'isOwnProfile' => $isOwnProfile,
            'canFollow' => $org !== null && ! $isOwnProfile,
            'canDonate' => $org !== null && $org->registration_status === 'approved' && ! $isOwnProfile,
            'donationOrganization' => self::donationOrganizationPayload($org),
            'followOrganization' => $org !== null ? [
                'id' => $org->id,
                'toggle_favorite_id' => $org->id,
                'toggle_favorite_context' => 'organization',
                'is_registered' => true,
                'name' => $org->name,
            ] : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function forUserLivestream(UserLivestream $livestream): array
    {
        $livestream->loadMissing('user:id,slug,name,email,image,is_verified,role');

        $user = $livestream->user;
        $isFollowing = false;
        $isOwnProfile = false;
        $linkedOrg = null;

        if (Auth::check()) {
            $authUser = Auth::user();
            $isOwnProfile = $user !== null && (int) $authUser->id === (int) $user->id;

            if (! $isOwnProfile && $user !== null) {
                $isFollowing = UserFollow::query()
                    ->where('follower_id', $authUser->id)
                    ->where('following_id', $user->id)
                    ->exists();
            }

            if ($user !== null) {
                $linkedOrg = Organization::forAuthUser($user);
            }
        }

        $avatarUrl = $user?->avatar_url ?? null;
        $profileSlug = $user?->slug;
        $profileUrl = $profileSlug ? route('users.show', $profileSlug) : null;

        $canDonate = $linkedOrg !== null
            && $linkedOrg->registration_status === 'approved'
            && ! $isOwnProfile;

        return [
            'hostType' => 'supporter',
            'hostId' => $user?->id,
            'hostUserId' => $user?->id,
            'name' => $user?->name ?? 'Host',
            'tagline' => null,
            'avatarUrl' => $avatarUrl,
            'profileUrl' => $profileUrl,
            'profileSlug' => $profileSlug,
            'isVerified' => (bool) ($user?->is_verified ?? false),
            'isFollowing' => $isFollowing,
            'isOwnProfile' => $isOwnProfile,
            'canFollow' => $user !== null && ! $isOwnProfile,
            'canDonate' => $canDonate,
            'donationOrganization' => self::donationOrganizationPayload($linkedOrg),
            'followOrganization' => null,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private static function donationOrganizationPayload(?Organization $org): ?array
    {
        if ($org === null || $org->registration_status !== 'approved') {
            return null;
        }

        $org->loadMissing('user:id,slug,name,email,image');

        return [
            'id' => $org->id,
            'name' => $org->name,
            'description' => $org->description,
            'mission' => $org->mission,
            'registered_organization' => [
                'id' => $org->id,
                'name' => $org->name,
                'user' => $org->user ? [
                    'id' => $org->user->id,
                    'slug' => $org->user->slug,
                    'name' => $org->user->name,
                    'email' => $org->user->email,
                    'image' => $org->user->image,
                ] : null,
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function earnSaveLinks(): array
    {
        return [
            'brpCampaigns' => route('frontend.brp-campaigns.index'),
            'feedbackCampaigns' => route('feedback-campaigns.index'),
            'merchantDeals' => route('merchant-hub.index'),
            'marketplace' => route('marketplace.index'),
            'donate' => url('/donate'),
            'believePoints' => route('believe-points.index'),
        ];
    }
}
