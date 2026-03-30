<?php

namespace App\Http\Controllers\CareAlliance;

use App\Http\Controllers\Controller;
use App\Models\CareAlliance;
use App\Models\CareAllianceInvitation;
use App\Models\CareAllianceJoinRequest;
use App\Models\CareAllianceMembership;
use App\Models\Organization;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CareAllianceOrgMembershipController extends Controller
{
    private const TABS = ['join', 'outgoing', 'invitations', 'membership', 'activity'];

    /**
     * @return list<array{id: int, amount: float, role: string|null, care_alliance_id: int|null, care_alliance_name: string|null, created_at: string|null}>
     */
    private function allianceWalletActivityRows(Organization $org, int $limit = 25): array
    {
        if (! $org->user_id) {
            return [];
        }

        return Transaction::query()
            ->where('user_id', (int) $org->user_id)
            ->where('payment_method', 'care_alliance_split')
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->map(function (Transaction $t) {
                $meta = is_array($t->meta) ? $t->meta : [];

                return [
                    'id' => $t->id,
                    'amount' => (float) $t->amount,
                    'role' => isset($meta['role']) ? (string) $meta['role'] : null,
                    'care_alliance_id' => isset($meta['care_alliance_id']) ? (int) $meta['care_alliance_id'] : null,
                    'care_alliance_name' => isset($meta['care_alliance_name']) ? (string) $meta['care_alliance_name'] : null,
                    'created_at' => $t->created_at?->toIso8601String(),
                ];
            })
            ->values()
            ->all();
    }

    private function organizationForUser(Request $request): Organization
    {
        $org = Organization::forAuthUser($request->user());
        if (! $org) {
            abort(404, 'Organization profile not found.');
        }

        return $org;
    }

    public function index(Request $request)
    {
        $org = $this->organizationForUser($request);

        $tab = in_array($request->query('tab'), self::TABS, true)
            ? $request->query('tab')
            : 'join';

        $allianceSearchQuery = trim((string) $request->query('q', ''));

        $pendingInvitationsCount = CareAllianceInvitation::query()
            ->where('organization_id', $org->id)
            ->where('status', 'pending')
            ->count();

        $canRequestAllianceJoin = Organization::query()
            ->whereKey($org->id)
            ->careAllianceInviteEligible()
            ->exists();

        $invitations = [];
        $memberships = [];
        $joinRequests = [];
        $allianceSearchResults = [];
        $allianceWalletActivity = [];

        switch ($tab) {
            case 'join':
                if ($canRequestAllianceJoin && strlen($allianceSearchQuery) >= 2) {
                    $allianceSearchResults = CareAlliance::searchForOrganizationJoin(
                        $org->id,
                        (int) $request->user()->id,
                        $allianceSearchQuery
                    );
                }
                break;
            case 'outgoing':
                $joinRequests = CareAllianceJoinRequest::query()
                    ->where('organization_id', $org->id)
                    ->with('careAlliance:id,name,slug')
                    ->orderByDesc('created_at')
                    ->get()
                    ->map(fn (CareAllianceJoinRequest $r) => [
                        'id' => $r->id,
                        'status' => $r->status,
                        'message' => $r->message,
                        'created_at' => $r->created_at?->toIso8601String(),
                        'reviewed_at' => $r->reviewed_at?->toIso8601String(),
                        'alliance' => [
                            'id' => $r->care_alliance_id,
                            'name' => $r->careAlliance?->name,
                            'slug' => $r->careAlliance?->slug,
                        ],
                    ]);
                break;
            case 'invitations':
                $invitations = CareAllianceInvitation::query()
                    ->where('organization_id', $org->id)
                    ->where('status', 'pending')
                    ->with('careAlliance:id,name,slug')
                    ->orderByDesc('created_at')
                    ->get()
                    ->map(fn (CareAllianceInvitation $i) => [
                        'id' => $i->id,
                        'token' => $i->token,
                        'email' => $i->email,
                        'alliance' => [
                            'id' => $i->care_alliance_id,
                            'name' => $i->careAlliance?->name,
                            'slug' => $i->careAlliance?->slug,
                        ],
                        'expires_at' => $i->expires_at?->toIso8601String(),
                    ]);
                break;
            case 'membership':
                $memberships = CareAllianceMembership::query()
                    ->where('organization_id', $org->id)
                    ->with('careAlliance:id,name,slug')
                    ->orderByDesc('updated_at')
                    ->get()
                    ->map(fn (CareAllianceMembership $m) => [
                        'id' => $m->id,
                        'status' => $m->status,
                        'invited_at' => $m->invited_at?->toIso8601String(),
                        'responded_at' => $m->responded_at?->toIso8601String(),
                        'alliance' => [
                            'id' => $m->care_alliance_id,
                            'name' => $m->careAlliance?->name,
                            'slug' => $m->careAlliance?->slug,
                        ],
                    ]);
                break;
            case 'activity':
                $allianceWalletActivity = $this->allianceWalletActivityRows($org, 50);
                break;
        }

        return Inertia::render('organization/AllianceMembership/Index', [
            'activeTab' => $tab,
            'pendingInvitationsCount' => $pendingInvitationsCount,
            'organization' => [
                'id' => $org->id,
                'name' => $org->name,
            ],
            'canRequestAllianceJoin' => $canRequestAllianceJoin,
            'allianceSearchQuery' => $allianceSearchQuery,
            'allianceSearchResults' => $allianceSearchResults,
            'invitations' => $invitations,
            'memberships' => $memberships,
            'joinRequests' => $joinRequests,
            'allianceWalletActivity' => $allianceWalletActivity,
        ]);
    }
}
