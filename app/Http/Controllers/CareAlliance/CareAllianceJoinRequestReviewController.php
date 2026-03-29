<?php

namespace App\Http\Controllers\CareAlliance;

use App\Http\Controllers\Controller;
use App\Models\CareAlliance;
use App\Models\CareAllianceJoinRequest;
use App\Models\CareAllianceMembership;
use App\Notifications\CareAllianceJoinRequestDecisionNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CareAllianceJoinRequestReviewController extends Controller
{
    private function allianceForUser(Request $request): CareAlliance
    {
        $alliance = CareAlliance::where('creator_user_id', $request->user()->id)->first();
        if (! $alliance) {
            abort(404, 'Care Alliance not found for this account.');
        }

        return $alliance;
    }

    private function joinRequestForAlliance(CareAlliance $alliance, CareAllianceJoinRequest $joinRequest): CareAllianceJoinRequest
    {
        if ((int) $joinRequest->care_alliance_id !== (int) $alliance->id) {
            abort(404);
        }

        return $joinRequest;
    }

    public function approve(Request $request, CareAllianceJoinRequest $joinRequest)
    {
        $alliance = $this->allianceForUser($request);
        $joinRequest = $this->joinRequestForAlliance($alliance, $joinRequest);

        if ($joinRequest->status !== 'pending') {
            return redirect()
                ->route('care-alliance.workspace.members', ['tab' => 'requests'])
                ->with('error', 'This request is no longer pending.');
        }

        DB::beginTransaction();
        try {
            CareAllianceMembership::updateOrCreate(
                [
                    'care_alliance_id' => $joinRequest->care_alliance_id,
                    'organization_id' => $joinRequest->organization_id,
                ],
                [
                    'status' => 'active',
                    'invited_at' => $joinRequest->created_at,
                    'responded_at' => now(),
                ]
            );

            $joinRequest->update([
                'status' => 'approved',
                'reviewed_at' => now(),
                'reviewed_by_user_id' => $request->user()->id,
            ]);

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();

            return redirect()
                ->route('care-alliance.workspace.members', ['tab' => 'requests'])
                ->with('error', 'Could not approve the request. Try again.');
        }

        $joinRequest->load('organization');
        if ($joinRequest->organization) {
            foreach ($joinRequest->organization->careAllianceInvitationNotifyUsers() as $user) {
                $user->notify(new CareAllianceJoinRequestDecisionNotification($joinRequest->id, 'approved'));
            }
        }

        return redirect()
            ->route('care-alliance.workspace.members', ['tab' => 'memberships'])
            ->with('success', 'Membership request approved.');
    }

    public function decline(Request $request, CareAllianceJoinRequest $joinRequest)
    {
        $alliance = $this->allianceForUser($request);
        $joinRequest = $this->joinRequestForAlliance($alliance, $joinRequest);

        if ($joinRequest->status !== 'pending') {
            return redirect()
                ->route('care-alliance.workspace.members', ['tab' => 'requests'])
                ->with('error', 'This request is no longer pending.');
        }

        $joinRequest->update([
            'status' => 'declined',
            'reviewed_at' => now(),
            'reviewed_by_user_id' => $request->user()->id,
        ]);

        $joinRequest->load('organization');
        if ($joinRequest->organization) {
            foreach ($joinRequest->organization->careAllianceInvitationNotifyUsers() as $user) {
                $user->notify(new CareAllianceJoinRequestDecisionNotification($joinRequest->id, 'declined'));
            }
        }

        return redirect()
            ->route('care-alliance.workspace.members', ['tab' => 'requests'])
            ->with('success', 'Membership request declined.');
    }
}
