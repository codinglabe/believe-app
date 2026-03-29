<?php

namespace App\Http\Controllers\CareAlliance;

use App\Http\Controllers\Controller;
use App\Jobs\SendCareAllianceInvitationEmail;
use App\Models\CareAlliance;
use App\Models\CareAllianceInvitation;
use App\Models\CareAllianceMembership;
use App\Models\Organization;
use App\Notifications\CareAllianceInvitationNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CareAllianceInvitationController extends Controller
{
    private function alliance(Request $request): CareAlliance
    {
        $alliance = CareAlliance::where('creator_user_id', $request->user()->id)->firstOrFail();

        return $alliance;
    }

    public function searchOrganizations(Request $request)
    {
        $alliance = $this->alliance($request);

        $q = trim((string) $request->query('q', ''));

        return response()->json([
            'organizations' => Organization::careAllianceSearchResults($q, $alliance->id),
        ]);
    }

    public function store(Request $request)
    {
        $alliance = $this->alliance($request);

        $validated = $request->validate([
            'invites' => 'nullable|array|max:50',
            'invites.*.organization_id' => 'required|integer|exists:organizations,id',
            'invites.*.email' => 'required|email|max:190',
            'email' => 'nullable|email|max:190',
        ]);

        $invites = array_values(array_filter(
            $validated['invites'] ?? [],
            static fn ($row) => is_array($row) && isset($row['organization_id'], $row['email'])
        ));

        if ($invites !== []) {
            return $this->storeInvitesFromRows($request, $alliance, $invites);
        }

        if (empty($validated['email'])) {
            throw ValidationException::withMessages([
                'invite' => 'Select at least one organization or provide an email address.',
            ]);
        }

        $organization = Organization::where('email', $validated['email'])->first()
            ?? Organization::whereHas('user', fn ($q) => $q->where('email', $validated['email']))->first();

        if (! $organization) {
            throw ValidationException::withMessages([
                'invite' => 'No organization found for this invite. Ask them to register first, or pick an organization from search.',
            ]);
        }

        if (! $this->isEligibleInviteOrganization($organization)) {
            throw ValidationException::withMessages([
                'invite' => 'Only approved organizations with a linked user can be invited to a Care Alliance.',
            ]);
        }

        $existingMember = CareAllianceMembership::where('care_alliance_id', $alliance->id)
            ->where('organization_id', $organization->id)
            ->whereIn('status', ['pending', 'active'])
            ->first();
        if ($existingMember) {
            throw ValidationException::withMessages([
                'invite' => 'This organization is already invited or a member.',
            ]);
        }

        $pendingInvite = CareAllianceInvitation::where('care_alliance_id', $alliance->id)
            ->where('organization_id', $organization->id)
            ->where('status', 'pending')
            ->first();
        if ($pendingInvite) {
            throw ValidationException::withMessages([
                'invite' => 'A pending invitation already exists for this organization.',
            ]);
        }

        DB::beginTransaction();
        try {
            $invitation = CareAllianceInvitation::create([
                'care_alliance_id' => $alliance->id,
                'invited_by_user_id' => $request->user()->id,
                'token' => Str::random(40),
                'email' => $validated['email'] ?? $organization->email,
                'organization_id' => $organization->id,
                'status' => 'pending',
                'expires_at' => now()->addDays(30),
            ]);

            $this->notifyCareAllianceInvitationRecipients($organization, $invitation->id);

            DB::commit();

            SendCareAllianceInvitationEmail::dispatch($invitation->id);
        } catch (\Throwable $e) {
            DB::rollBack();

            throw ValidationException::withMessages([
                'invite' => 'Could not send invitation.',
            ]);
        }

        return redirect()->route('care-alliance.workspace.members', ['tab' => 'invite'])->with('success', 'Invitation sent.');
    }

    /**
     * @param  array<int, array{organization_id: int, email: string}>  $invites
     */
    private function storeInvitesFromRows(Request $request, CareAlliance $alliance, array $invites): \Illuminate\Http\RedirectResponse
    {
        $sent = 0;
        $skipped = [];

        foreach ($invites as $row) {
            $id = (int) $row['organization_id'];
            $email = trim((string) $row['email']);

            $organization = Organization::find($id);
            if (! $organization) {
                continue;
            }

            if (! $this->isEligibleInviteOrganization($organization)) {
                $skipped[] = $organization->name.': not eligible';

                continue;
            }

            $existingMember = CareAllianceMembership::where('care_alliance_id', $alliance->id)
                ->where('organization_id', $organization->id)
                ->whereIn('status', ['pending', 'active'])
                ->first();
            if ($existingMember) {
                $skipped[] = $organization->name.': already a member or invited';

                continue;
            }

            $pendingInvite = CareAllianceInvitation::where('care_alliance_id', $alliance->id)
                ->where('organization_id', $organization->id)
                ->where('status', 'pending')
                ->first();
            if ($pendingInvite) {
                $skipped[] = $organization->name.': pending invitation already exists';

                continue;
            }

            try {
                DB::beginTransaction();

                $invitation = CareAllianceInvitation::create([
                    'care_alliance_id' => $alliance->id,
                    'invited_by_user_id' => $request->user()->id,
                    'token' => Str::random(40),
                    'email' => $email,
                    'organization_id' => $organization->id,
                    'status' => 'pending',
                    'expires_at' => now()->addDays(30),
                ]);

                $this->notifyCareAllianceInvitationRecipients($organization, $invitation->id);

                DB::commit();

                SendCareAllianceInvitationEmail::dispatch($invitation->id);
                $sent++;
            } catch (\Throwable $e) {
                DB::rollBack();
                $skipped[] = $organization->name.': could not send invitation';
            }
        }

        if ($sent === 0 && $skipped === []) {
            return redirect()->route('care-alliance.workspace.members', ['tab' => 'invite'])->with('error', 'No invitations sent.');
        }

        if ($sent === 0) {
            return redirect()->route('care-alliance.workspace.members', ['tab' => 'invite'])->with(
                'error',
                'No invitations sent. '.implode('; ', $skipped)
            );
        }

        $message = $sent === 1 ? '1 invitation sent.' : "{$sent} invitations sent.";
        if ($skipped !== []) {
            $message .= ' Skipped: '.implode('; ', $skipped);
        }

        return redirect()->route('care-alliance.workspace.members', ['tab' => 'invite'])->with('success', $message);
    }

    public function resend(Request $request, CareAllianceInvitation $invitation)
    {
        $alliance = $this->alliance($request);
        if ((int) $invitation->care_alliance_id !== (int) $alliance->id) {
            abort(403);
        }
        if ($invitation->status !== 'pending') {
            throw ValidationException::withMessages([
                'invite' => 'Only pending invitations can be resent.',
            ]);
        }

        $invitation->loadMissing('organization');
        if ($invitation->organization) {
            $this->notifyCareAllianceInvitationRecipients($invitation->organization, $invitation->id);
        }

        SendCareAllianceInvitationEmail::dispatch($invitation->id);

        return redirect()->route('care-alliance.workspace.members', ['tab' => 'invitations'])->with('success', 'Invitation email queued again.');
    }

    public function destroy(Request $request, CareAllianceInvitation $invitation)
    {
        $alliance = $this->alliance($request);
        if ((int) $invitation->care_alliance_id !== (int) $alliance->id) {
            abort(403);
        }
        if ($invitation->status !== 'pending') {
            return redirect()->route('care-alliance.workspace.members', ['tab' => 'invitations'])->with('error', 'Only pending invitations can be cancelled.');
        }
        $invitation->update(['status' => 'expired']);

        return redirect()->route('care-alliance.workspace.members', ['tab' => 'invitations'])->with('success', 'Invitation cancelled.');
    }

    private function isEligibleInviteOrganization(Organization $organization): bool
    {
        return Organization::query()
            ->whereKey($organization->id)
            ->careAllianceInviteEligible()
            ->exists();
    }

    private function notifyCareAllianceInvitationRecipients(Organization $organization, int $invitationId): void
    {
        foreach ($organization->careAllianceInvitationNotifyUsers() as $user) {
            $user->notify(new CareAllianceInvitationNotification($invitationId));
        }
    }
}
