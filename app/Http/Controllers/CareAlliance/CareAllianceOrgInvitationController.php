<?php

namespace App\Http\Controllers\CareAlliance;

use App\Http\Controllers\Controller;
use App\Models\CareAllianceInvitation;
use App\Models\CareAllianceMembership;
use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CareAllianceOrgInvitationController extends Controller
{
    private function organizationForUser(Request $request): Organization
    {
        $org = Organization::forAuthUser($request->user());
        if (! $org) {
            abort(404, 'Organization profile not found.');
        }

        return $org;
    }

    public function pending(Request $request)
    {
        $org = $this->organizationForUser($request);

        $invites = CareAllianceInvitation::query()
            ->where('organization_id', $org->id)
            ->where('status', 'pending')
            ->with('careAlliance:id,name,slug')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (CareAllianceInvitation $i) => [
                'id' => $i->id,
                'token' => $i->token,
                'alliance' => [
                    'id' => $i->care_alliance_id,
                    'name' => $i->careAlliance?->name,
                    'slug' => $i->careAlliance?->slug,
                ],
                'expires_at' => $i->expires_at?->toIso8601String(),
            ]);

        return response()->json(['invitations' => $invites]);
    }

    public function accept(Request $request, CareAllianceInvitation $invitation)
    {
        $org = $this->organizationForUser($request);
        $this->assertInviteForOrg($invitation, $org);

        if ($invitation->status !== 'pending') {
            return $this->invitationRespondError($request, 'Invitation is no longer pending.', 422);
        }
        if ($invitation->expires_at && $invitation->expires_at->isPast()) {
            $invitation->update(['status' => 'expired']);

            return $this->invitationRespondError($request, 'Invitation has expired.', 422);
        }

        DB::beginTransaction();
        try {
            $membership = CareAllianceMembership::updateOrCreate(
                [
                    'care_alliance_id' => $invitation->care_alliance_id,
                    'organization_id' => $org->id,
                ],
                [
                    'status' => 'active',
                    'invited_at' => $invitation->created_at,
                    'responded_at' => now(),
                ]
            );

            $invitation->update([
                'status' => 'accepted',
            ]);

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();

            return $this->invitationRespondError($request, 'Could not accept invitation.', 500);
        }

        return $this->invitationRespondSuccess($request, 'You joined the Care Alliance.', [
            'membership_id' => $membership->id,
        ]);
    }

    public function decline(Request $request, CareAllianceInvitation $invitation)
    {
        $org = $this->organizationForUser($request);
        $this->assertInviteForOrg($invitation, $org);

        if ($invitation->status !== 'pending') {
            return $this->invitationRespondError($request, 'Invitation is no longer pending.', 422);
        }

        DB::beginTransaction();
        try {
            CareAllianceMembership::updateOrCreate(
                [
                    'care_alliance_id' => $invitation->care_alliance_id,
                    'organization_id' => $org->id,
                ],
                [
                    'status' => 'declined',
                    'invited_at' => $invitation->created_at,
                    'responded_at' => now(),
                ]
            );

            $invitation->update(['status' => 'declined']);

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();

            return $this->invitationRespondError($request, 'Could not decline invitation.', 500);
        }

        return $this->invitationRespondSuccess($request, 'Invitation declined.');
    }

    private function wantsInertiaVisit(Request $request): bool
    {
        return (bool) $request->header('X-Inertia');
    }

    /**
     * @param  array<string, mixed>  $jsonExtra
     * @return \Illuminate\Http\RedirectResponse|\Illuminate\Http\JsonResponse
     */
    private function invitationRespondSuccess(Request $request, string $message, array $jsonExtra = [])
    {
        if ($this->wantsInertiaVisit($request)) {
            return redirect()
                ->route('organization.alliance-membership', ['tab' => 'membership'])
                ->with('success', $message);
        }

        return response()->json(array_merge(['success' => true], $jsonExtra));
    }

    /**
     * @param  \Illuminate\Http\RedirectResponse|\Illuminate\Http\JsonResponse  $redirectOrJson
     */
    private function invitationRespondError(Request $request, string $message, int $status = 422)
    {
        if ($this->wantsInertiaVisit($request)) {
            return redirect()
                ->route('organization.alliance-membership', ['tab' => 'invitations'])
                ->with('error', $message);
        }

        return response()->json(['success' => false, 'message' => $message], $status);
    }

    private function assertInviteForOrg(CareAllianceInvitation $invitation, Organization $org): void
    {
        if ((int) $invitation->organization_id !== (int) $org->id) {
            abort(403);
        }
    }
}
