<?php

namespace App\Http\Controllers\CareAlliance;

use App\Http\Controllers\Controller;
use App\Models\CareAlliance;
use App\Models\CareAllianceCampaign;
use App\Models\CareAllianceCampaignSplit;
use App\Models\CareAllianceInvitation;
use App\Models\CareAllianceJoinRequest;
use App\Models\CareAllianceMembership;
use App\Models\Organization;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CareAllianceDashboardController extends Controller
{
    private const MEMBER_TABS = ['invite', 'requests', 'invitations', 'memberships'];

    private const CAMPAIGN_TABS = ['create', 'list'];

    private function allianceForUser(Request $request): CareAlliance
    {
        $user = $request->user();
        $alliance = CareAlliance::where('creator_user_id', $user->id)->first();
        if (! $alliance) {
            abort(404, 'Care Alliance not found for this account.');
        }

        return $alliance;
    }

    /**
     * @return array<string, mixed>
     */
    private function allianceToArray(CareAlliance $alliance): array
    {
        return [
            'id' => $alliance->id,
            'slug' => $alliance->slug,
            'name' => $alliance->name,
            'description' => $alliance->description,
            'city' => $alliance->city,
            'state' => $alliance->state,
            'website' => $alliance->website,
            'ein' => $alliance->ein,
            'management_fee_bps' => $alliance->management_fee_bps,
            'fund_model' => $alliance->fund_model,
            'status' => $alliance->status,
            'balance_cents' => $alliance->balance_cents,
            'categories' => $alliance->primaryActionCategories->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
            ]),
        ];
    }

    public function index(Request $request)
    {
        return redirect()->route('care-alliance.workspace.members');
    }

    public function workspaceOverview(Request $request)
    {
        return redirect()->route('care-alliance.workspace.members');
    }

    public function workspaceMembers(Request $request)
    {
        return Inertia::render('care-alliance/workspace/Members', $this->membersPagePayload($request));
    }

    public function workspaceCampaigns(Request $request)
    {
        return Inertia::render('care-alliance/workspace/Campaigns', $this->campaignsPagePayload($request));
    }

    public function workspaceCampaignEdit(Request $request, CareAllianceCampaign $campaign)
    {
        $alliance = $this->allianceForUser($request);
        if ((int) $campaign->care_alliance_id !== (int) $alliance->id) {
            abort(404);
        }

        $alliance->load(['primaryActionCategories:id,name']);
        $campaign->loadCount('donations');
        $campaign->load([
            'primaryActionCategories:id,name',
            'splits' => fn ($q) => $q->orderBy('id')->with(['organization:id,name,ein']),
        ]);

        return Inertia::render('care-alliance/workspace/CampaignEdit', [
            'alliance' => $this->allianceToArray($alliance),
            'memberships' => $this->membershipsForCareAllianceWorkspace($alliance),
            'primaryActionCategories' => $alliance->primaryActionCategories->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
            ])->values()->all(),
            'campaign' => $this->campaignToWorkspaceArray($campaign, $alliance),
        ]);
    }

    public function workspaceSettings(Request $request)
    {
        return redirect()->route('profile.edit');
    }

    /**
     * Members workspace: one tab’s data loaded per request.
     *
     * @return array<string, mixed>
     */
    private function membersPagePayload(Request $request): array
    {
        $alliance = $this->allianceForUser($request);
        $alliance->load(['primaryActionCategories:id,name']);

        $tab = in_array($request->query('tab'), self::MEMBER_TABS, true)
            ? $request->query('tab')
            : 'invite';

        $membersSearchQuery = trim((string) $request->query('q', ''));

        $pendingJoinRequestsCount = CareAllianceJoinRequest::query()
            ->where('care_alliance_id', $alliance->id)
            ->where('status', 'pending')
            ->count();

        $memberships = [];
        $invitations = [];
        $joinRequests = [];
        $organizationSearchResults = [];

        switch ($tab) {
            case 'invite':
                if (strlen($membersSearchQuery) >= 2) {
                    $organizationSearchResults = Organization::careAllianceSearchResults($membersSearchQuery, $alliance->id);
                }
                break;
            case 'requests':
                $joinRequests = CareAllianceJoinRequest::query()
                    ->where('care_alliance_id', $alliance->id)
                    ->where('status', 'pending')
                    ->with(['organization:id,name,ein', 'requestedBy:id,name,email'])
                    ->orderByDesc('created_at')
                    ->get()
                    ->map(fn (CareAllianceJoinRequest $r) => [
                        'id' => $r->id,
                        'message' => $r->message,
                        'created_at' => $r->created_at?->toIso8601String(),
                        'organization' => $r->organization ? [
                            'id' => $r->organization->id,
                            'name' => $r->organization->name,
                            'ein' => $r->organization->ein,
                        ] : null,
                        'requested_by' => $r->requestedBy ? [
                            'name' => $r->requestedBy->name,
                            'email' => $r->requestedBy->email,
                        ] : null,
                    ]);
                break;
            case 'invitations':
                $invitations = CareAllianceInvitation::query()
                    ->where('care_alliance_id', $alliance->id)
                    ->with(['organization:id,name,ein'])
                    ->orderByDesc('created_at')
                    ->get()
                    ->map(fn (CareAllianceInvitation $i) => [
                        'id' => $i->id,
                        'status' => $i->status,
                        'email' => $i->email,
                        'token' => $i->token,
                        'expires_at' => $i->expires_at?->toIso8601String(),
                        'organization' => $i->organization ? [
                            'id' => $i->organization->id,
                            'name' => $i->organization->name,
                            'ein' => $i->organization->ein,
                        ] : null,
                    ]);
                break;
            case 'memberships':
                $memberships = CareAllianceMembership::query()
                    ->where('care_alliance_id', $alliance->id)
                    ->with(['organization:id,name,ein,user_id'])
                    ->orderByDesc('created_at')
                    ->get()
                    ->map(fn (CareAllianceMembership $m) => [
                        'id' => $m->id,
                        'status' => $m->status,
                        'invited_at' => $m->invited_at?->toIso8601String(),
                        'responded_at' => $m->responded_at?->toIso8601String(),
                        'organization' => $m->organization ? [
                            'id' => $m->organization->id,
                            'name' => $m->organization->name,
                            'ein' => $m->organization->ein,
                        ] : null,
                    ]);
                break;
        }

        $categoryOptions = $alliance->primaryActionCategories->map(fn ($c) => [
            'id' => $c->id,
            'name' => $c->name,
        ])->values()->all();

        return [
            'activeTab' => $tab,
            'alliance' => $this->allianceToArray($alliance),
            'pendingJoinRequestsCount' => $pendingJoinRequestsCount,
            'memberships' => $memberships,
            'invitations' => $invitations,
            'joinRequests' => $joinRequests,
            'campaigns' => [],
            'primaryActionCategories' => $categoryOptions,
            'membersSearchQuery' => $membersSearchQuery,
            'organizationSearchResults' => $organizationSearchResults,
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function membershipsForCareAllianceWorkspace(CareAlliance $alliance): array
    {
        return CareAllianceMembership::query()
            ->where('care_alliance_id', $alliance->id)
            ->with(['organization:id,name,ein,user_id'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (CareAllianceMembership $m) => [
                'id' => $m->id,
                'status' => $m->status,
                'invited_at' => $m->invited_at?->toIso8601String(),
                'responded_at' => $m->responded_at?->toIso8601String(),
                'organization' => $m->organization ? [
                    'id' => $m->organization->id,
                    'name' => $m->organization->name,
                    'ein' => $m->organization->ein,
                ] : null,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function campaignToWorkspaceArray(CareAllianceCampaign $c, CareAlliance $alliance): array
    {
        return [
            'id' => $c->id,
            'slug' => $c->slug,
            'name' => $c->name,
            'description' => $c->description,
            'status' => $c->status,
            'alliance_fee_bps_override' => $c->alliance_fee_bps_override,
            'donations_count' => $c->donations_count,
            'public_donate_url' => route('care-alliance.campaigns.donate', [
                'allianceSlug' => $alliance->slug,
                'campaign' => $c->slug,
            ]),
            'primary_action_categories' => $c->primaryActionCategories->map(fn ($cat) => [
                'id' => $cat->id,
                'name' => $cat->name,
            ])->values()->all(),
            'splits' => $c->splits->map(fn (CareAllianceCampaignSplit $s) => [
                'is_alliance_fee' => $s->is_alliance_fee,
                'percent_bps' => $s->percent_bps,
                'organization' => $s->is_alliance_fee || ! $s->organization ? null : [
                    'id' => $s->organization->id,
                    'name' => $s->organization->name,
                    'ein' => $s->organization->ein,
                ],
            ])->values()->all(),
        ];
    }

    /**
     * Campaigns workspace: memberships + campaigns (splits UI needs active members).
     *
     * @return array<string, mixed>
     */
    private function campaignsPagePayload(Request $request): array
    {
        $alliance = $this->allianceForUser($request);
        $alliance->load(['primaryActionCategories:id,name']);

        $tab = in_array($request->query('tab'), self::CAMPAIGN_TABS, true)
            ? $request->query('tab')
            : 'create';

        $memberships = $this->membershipsForCareAllianceWorkspace($alliance);

        $campaignsCount = CareAllianceCampaign::query()
            ->where('care_alliance_id', $alliance->id)
            ->count();

        $campaigns = [];
        if ($tab === 'list') {
            $campaigns = CareAllianceCampaign::query()
                ->where('care_alliance_id', $alliance->id)
                ->withCount('donations')
                ->with([
                    'primaryActionCategories:id,name',
                    'splits' => fn ($q) => $q->orderBy('id')->with(['organization:id,name,ein']),
                ])
                ->orderByDesc('created_at')
                ->get()
                ->map(fn (CareAllianceCampaign $c) => $this->campaignToWorkspaceArray($c, $alliance));
        }

        return [
            'campaignsTab' => $tab,
            'campaignsCount' => $campaignsCount,
            'alliance' => $this->allianceToArray($alliance),
            'memberships' => $memberships,
            'invitations' => [],
            'joinRequests' => [],
            'campaigns' => $campaigns,
            'primaryActionCategories' => $alliance->primaryActionCategories->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
            ])->values()->all(),
        ];
    }

    public function updateSettings(Request $request)
    {
        $alliance = $this->allianceForUser($request);

        $validated = $request->validate([
            'description' => 'nullable|string|max:5000',
            'city' => 'nullable|string|max:128',
            'state' => 'nullable|string|max:64',
            'website' => 'nullable|url|max:500',
            'ein' => 'nullable|string|max:32',
            'management_fee_percent' => 'nullable|numeric|min:0|max:100',
            'fund_model' => 'nullable|in:direct,campaign_split',
            'primary_action_category_ids' => 'nullable|array|max:8',
            'primary_action_category_ids.*' => 'integer|exists:primary_action_categories,id',
        ]);

        if (isset($validated['management_fee_percent'])) {
            $alliance->management_fee_bps = $validated['management_fee_percent'] !== null
                ? (int) round((float) $validated['management_fee_percent'] * 100)
                : null;
        }
        if (array_key_exists('description', $validated)) {
            $alliance->description = $validated['description'];
        }
        if (array_key_exists('city', $validated)) {
            $alliance->city = $validated['city'];
        }
        if (array_key_exists('state', $validated)) {
            $alliance->state = $validated['state'];
        }
        if (array_key_exists('website', $validated)) {
            $alliance->website = $validated['website'];
        }
        if (array_key_exists('ein', $validated)) {
            $ein = $validated['ein'] !== null && $validated['ein'] !== ''
                ? $validated['ein']
                : null;
            $alliance->ein = $ein;
            $digits = $ein ? preg_replace('/\D/', '', $ein) : '';
            if (strlen($digits) === 9) {
                $org = Organization::query()->where('user_id', $alliance->creator_user_id)->first();
                if ($org) {
                    $org->ein = substr($digits, 0, 9);
                    $org->save();
                }
            }
        }
        if (array_key_exists('fund_model', $validated) && $validated['fund_model']) {
            $alliance->fund_model = $validated['fund_model'];
        }
        $alliance->save();

        if (! empty($validated['primary_action_category_ids'])) {
            $alliance->primaryActionCategories()->sync($validated['primary_action_category_ids']);
        }

        return redirect()->route('profile.edit')->with('success', 'Alliance Settings saved.');
    }
}
