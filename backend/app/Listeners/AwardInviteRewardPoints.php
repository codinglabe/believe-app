<?php

namespace App\Listeners;

use App\Models\Organization;
use App\Models\OrganizationInvite;
use Illuminate\Auth\Events\Verified;
use Illuminate\Support\Facades\Log;

class AwardInviteRewardPoints
{
    /**
     * Create the event listener.
     */
    public function __construct()
    {
        //
    }

    /**
     * Handle the event.
     */
    public function handle(Verified $event): void
    {
        $user = $event->user;

        // Only process for organization users
        if (!in_array($user->role, ['organization', 'organization_pending'])) {
            return;
        }

        try {
            // Find the organization for this user
            $organization = Organization::where('user_id', $user->id)->first();

            if (!$organization) {
                return;
            }

            // Find an accepted invite for this organization (matching email and EIN)
            $invite = OrganizationInvite::where('email', $user->email)
                ->where('ein', $organization->ein)
                ->where('status', 'accepted')
                ->whereNull('points_awarded_at') // Only award if not already awarded
                ->first();

            if (!$invite) {
                return;
            }
            
            $inviter = $invite->inviter;
            
            if (!$inviter) {
                Log::warning('Inviter not found for organization invite', [
                    'invite_id' => $invite->id,
                ]);
                return;
            }

            // Award 100 reward points to the inviter
            $inviter->increment('reward_points', 100);

            // Mark points as awarded to prevent duplicate awards
            $invite->update([
                'points_awarded_at' => now(),
            ]);

            Log::info('Reward points awarded to inviter after email verification', [
                'inviter_id' => $inviter->id,
                'inviter_name' => $inviter->name,
                'organization_id' => $organization->id,
                'organization_name' => $organization->name,
                'invite_id' => $invite->id,
                'points_awarded' => 100,
                'new_reward_points' => $inviter->fresh()->reward_points,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to award invite reward points', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
}
