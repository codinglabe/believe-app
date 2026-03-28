<?php

namespace App\Http\Controllers\CareAlliance;

use App\Http\Controllers\Controller;
use App\Models\CareAlliance;
use App\Models\CareAllianceJoinRequest;
use App\Models\Organization;
use App\Notifications\CareAllianceJoinRequestReceivedNotification;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CareAllianceOrgJoinRequestController extends Controller
{
    private function organizationForUser(Request $request): Organization
    {
        $org = Organization::forAuthUser($request->user());
        if (! $org) {
            abort(404, 'Organization profile not found.');
        }

        return $org;
    }

    private function assertOrgEligibleForCareAlliance(Organization $organization): void
    {
        if (! Organization::query()->whereKey($organization->id)->careAllianceInviteEligible()->exists()) {
            throw ValidationException::withMessages([
                'care_alliance_id' => 'Your organization must be approved and linked to a user before requesting to join an alliance.',
            ]);
        }
    }

    public function searchAlliances(Request $request)
    {
        $org = $this->organizationForUser($request);

        if (! Organization::query()->whereKey($org->id)->careAllianceInviteEligible()->exists()) {
            return response()->json([
                'alliances' => [],
                'eligible' => false,
            ]);
        }

        $q = trim((string) $request->query('q', ''));

        return response()->json([
            'alliances' => CareAlliance::searchForOrganizationJoin($org->id, (int) $request->user()->id, $q),
            'eligible' => true,
        ]);
    }

    public function store(Request $request)
    {
        $org = $this->organizationForUser($request);
        $this->assertOrgEligibleForCareAlliance($org);

        $validated = $request->validate([
            'care_alliance_id' => 'required|integer|exists:care_alliances,id',
            'message' => 'nullable|string|max:2000',
        ]);

        $alliance = CareAlliance::query()
            ->whereKey($validated['care_alliance_id'])
            ->where('status', 'active')
            ->first();

        if (! $alliance) {
            throw ValidationException::withMessages([
                'care_alliance_id' => 'That Care Alliance is not accepting requests.',
            ]);
        }

        if ((int) $alliance->creator_user_id === (int) $request->user()->id) {
            throw ValidationException::withMessages([
                'care_alliance_id' => 'You cannot request to join an alliance you operate.',
            ]);
        }

        if ($this->organizationBlockedFromAlliance($org->id, $alliance->id)) {
            throw ValidationException::withMessages([
                'care_alliance_id' => 'You already have an open invitation, membership, or pending request for this alliance.',
            ]);
        }

        $joinRequest = CareAllianceJoinRequest::create([
            'care_alliance_id' => $alliance->id,
            'organization_id' => $org->id,
            'requested_by_user_id' => $request->user()->id,
            'message' => $validated['message'] ?? null,
            'status' => 'pending',
        ]);

        $creator = $alliance->creator;
        if ($creator) {
            $creator->notify(new CareAllianceJoinRequestReceivedNotification($joinRequest->id));
        }

        return redirect()
            ->route('organization.alliance-membership', ['tab' => 'outgoing'])
            ->with('success', 'Your request to join '.$alliance->name.' has been sent.');
    }

    private function organizationBlockedFromAlliance(int $organizationId, int $careAllianceId): bool
    {
        $hasMembership = \App\Models\CareAllianceMembership::query()
            ->where('care_alliance_id', $careAllianceId)
            ->where('organization_id', $organizationId)
            ->whereIn('status', ['pending', 'active'])
            ->exists();

        if ($hasMembership) {
            return true;
        }

        $hasInvite = \App\Models\CareAllianceInvitation::query()
            ->where('care_alliance_id', $careAllianceId)
            ->where('organization_id', $organizationId)
            ->where('status', 'pending')
            ->exists();

        if ($hasInvite) {
            return true;
        }

        return CareAllianceJoinRequest::query()
            ->where('care_alliance_id', $careAllianceId)
            ->where('organization_id', $organizationId)
            ->where('status', 'pending')
            ->exists();
    }
}
