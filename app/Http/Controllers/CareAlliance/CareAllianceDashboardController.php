<?php

namespace App\Http\Controllers\CareAlliance;

use App\Http\Controllers\Controller;
use App\Models\CareAlliance;
use App\Models\CareAllianceCampaign;
use App\Models\CareAllianceCampaignSplit;
use App\Models\CareAllianceInvitation;
use App\Models\CareAllianceDonation;
use App\Models\CareAllianceJoinRequest;
use App\Models\CareAllianceMembership;
use App\Models\Donation;
use App\Models\Organization;
use App\Services\CareAllianceGeneralDonationDistributionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class CareAllianceDashboardController extends Controller
{
    private const MEMBER_TABS = ['invite', 'requests', 'invitations', 'memberships'];

    private const CAMPAIGN_TABS = ['create', 'list', 'activity'];

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
        $campaign->loadCount('completedDonations');
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
                $memberships = $this->membershipsForCareAllianceWorkspace($alliance);
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
            ->with([
                'organization' => fn ($q) => $q->select('id', 'name', 'ein', 'user_id')->with([
                    'primaryActionCategories' => fn ($q) => $q->orderBy('sort_order')->orderBy('name'),
                ]),
            ])
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
                    'primary_action_categories' => $m->organization->primaryActionCategories->map(fn ($c) => [
                        'id' => $c->id,
                        'name' => $c->name,
                    ])->values()->all(),
                ] : null,
            ])
            ->values()
            ->all();
    }

    /**
     * Allocation + schedule + settlement copy for the Donation activity tab.
     *
     * @return array<string, mixed>
     */
    private function donationActivitySettlementPayload(
        CareAlliance $alliance,
        string $rowType,
        ?Donation $generalDonation = null,
        ?CareAllianceDonation $campaignDonation = null
    ): array {
        if ($rowType === 'campaign' && $campaignDonation) {
            $st = strtolower((string) $campaignDonation->status);
            $walletStatus = match ($st) {
                'completed' => 'Split applied to wallets (campaign checkout)',
                'pending' => 'Awaiting payment',
                'failed' => 'Payment failed',
                default => ucfirst($st),
            };

            return [
                'row_type' => 'campaign',
                'allocation_label' => 'Campaign split (per campaign rules)',
                'schedule_label' => 'Instant settlement',
                'allocation_method' => null,
                'distribution_frequency' => null,
                'wallet_status_label' => $walletStatus,
                'settings_completed' => null,
            ];
        }

        $allocationLabel = match ($alliance->allocation_method ?? 'proportional_equal') {
            'fixed_percentage' => 'Fixed % — member pool',
            'weighted_by_donations' => 'Weighted by donations',
            default => 'Proportional (equal among members)',
        };

        $scheduleLabel = match ($alliance->distribution_frequency ?? 'instant') {
            'weekly' => 'Weekly release pool',
            'monthly' => 'Monthly release pool',
            'quarterly' => 'Quarterly release pool',
            default => 'Instant',
        };

        $isScheduled = CareAllianceGeneralDonationDistributionService::distributionIsScheduled($alliance->distribution_frequency);
        $finOk = (bool) $alliance->financial_settings_completed_at;
        $st = $generalDonation ? strtolower((string) $generalDonation->status) : '';

        if (! $finOk) {
            $walletStatus = 'Recipient org credit only — complete Financial Settings for alliance splits';
        } elseif ($isScheduled) {
            $walletStatus = match ($st) {
                'completed', 'active' => 'Share pooled — releases on schedule (min. payout applies)',
                'pending' => 'Awaiting payment',
                'failed' => 'Payment failed',
                'canceled' => 'Canceled',
                default => ucfirst($st ?: '—'),
            };
        } else {
            $walletStatus = match ($st) {
                'completed', 'active' => 'Released to wallets (instant settlement)',
                'pending' => 'Awaiting payment',
                'failed' => 'Payment failed',
                'canceled' => 'Canceled',
                default => ucfirst($st ?: '—'),
            };
        }

        return [
            'row_type' => 'general',
            'allocation_label' => $allocationLabel,
            'schedule_label' => $scheduleLabel,
            'allocation_method' => $alliance->allocation_method ?? 'proportional_equal',
            'distribution_frequency' => $alliance->distribution_frequency ?? 'instant',
            'wallet_status_label' => $walletStatus,
            'settings_completed' => $finOk,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function donationActivityRow(CareAllianceDonation $d, CareAlliance $alliance): array
    {
        $snapshot = $d->split_snapshot ?? [];
        $splitLines = [];
        foreach (is_array($snapshot) ? $snapshot : [] as $line) {
            if (! is_array($line)) {
                continue;
            }
            $splitLines[] = [
                'type' => isset($line['type']) ? (string) $line['type'] : null,
                'label' => isset($line['label']) ? (string) $line['label'] : null,
                'cents' => (int) ($line['cents'] ?? 0),
                'percent_bps' => isset($line['percent_bps']) ? (int) $line['percent_bps'] : null,
                'organization_id' => isset($line['organization_id']) ? (int) $line['organization_id'] : null,
            ];
        }

        $campaign = $d->campaign;
        $donor = $d->donor;

        return [
            'row_key' => 'cad-'.$d->id,
            'id' => $d->id,
            'amount_cents' => $d->amount_cents,
            'currency' => $d->currency,
            'status' => $d->status,
            'created_at' => $d->created_at?->toIso8601String(),
            'payment_reference' => $d->payment_reference,
            'campaign' => $campaign ? [
                'id' => $campaign->id,
                'slug' => $campaign->slug,
                'name' => $campaign->name,
            ] : [
                'id' => 0,
                'slug' => '',
                'name' => '—',
            ],
            'donor' => $donor ? [
                'id' => $donor->id,
                'name' => $donor->name,
            ] : null,
            'split_lines' => $splitLines,
            'settlement' => $this->donationActivitySettlementPayload($alliance, 'campaign', null, $d),
        ];
    }

    /**
     * Normal /donate (and modal) gifts: same activity card shape as campaign donations; split lines follow current financial rules.
     *
     * @return list<array{type: string|null, label: string|null, cents: int, percent_bps: int|null, organization_id: int|null}>
     */
    private function generalDonationSplitLines(CareAlliance $alliance, Donation $donation, int $amountCents): array
    {
        if ($amountCents < 1) {
            return [];
        }

        if (! $alliance->financial_settings_completed_at) {
            $donation->loadMissing('organization');
            $org = $donation->organization;

            return [[
                'type' => 'organization',
                'label' => $org?->name ?? 'Recipient organization',
                'cents' => $amountCents,
                'percent_bps' => 10000,
                'organization_id' => $org ? (int) $org->id : null,
            ]];
        }

        $svc = app(CareAllianceGeneralDonationDistributionService::class);
        $dist = $svc->computeDistribution($alliance, $amountCents);
        $lines = [];

        if ($dist['fee_cents'] > 0) {
            $label = ($alliance->name !== '' && $alliance->name !== null)
                ? $alliance->name.' (Alliance)'
                : 'Alliance';
            $lines[] = [
                'type' => 'alliance',
                'label' => $label,
                'cents' => $dist['fee_cents'],
                'percent_bps' => (int) round(10000 * $dist['fee_cents'] / $amountCents),
                'organization_id' => null,
            ];
        }

        $orgIds = array_values(array_unique(array_filter(array_map(
            fn ($row) => (int) ($row['organization_id'] ?? 0),
            $dist['org_shares']
        ))));
        $orgs = $orgIds === []
            ? collect()
            : Organization::query()->whereIn('id', $orgIds)->get()->keyBy('id');

        foreach ($dist['org_shares'] as $share) {
            $oid = (int) ($share['organization_id'] ?? 0);
            $cents = (int) ($share['cents'] ?? 0);
            if ($oid < 1 || $cents < 1) {
                continue;
            }
            $org = $orgs->get($oid);
            $lines[] = [
                'type' => 'organization',
                'label' => $org?->name ?? 'Member organization',
                'cents' => $cents,
                'percent_bps' => (int) round(10000 * $cents / $amountCents),
                'organization_id' => $oid,
            ];
        }

        return $lines;
    }

    /**
     * @return array<string, mixed>
     */
    private function generalDonationActivityRow(Donation $d, CareAlliance $alliance): array
    {
        $amountCents = (int) round((float) $d->amount * 100);
        $donor = $d->user;

        return [
            'row_key' => 'don-'.$d->id,
            'id' => $d->id,
            'amount_cents' => $amountCents,
            'currency' => 'USD',
            'status' => (string) $d->status,
            'created_at' => $d->created_at?->toIso8601String()
                ?? $d->donation_date?->toIso8601String(),
            'payment_reference' => $d->transaction_id !== null && $d->transaction_id !== ''
                ? (string) $d->transaction_id
                : null,
            'campaign' => [
                'id' => 0,
                'slug' => '',
                'name' => 'General donation',
            ],
            'donor' => $donor ? [
                'id' => (int) $donor->id,
                'name' => (string) $donor->name,
            ] : null,
            'split_lines' => $this->generalDonationSplitLines($alliance, $d, $amountCents),
            'settlement' => $this->donationActivitySettlementPayload($alliance, 'general', $d, null),
        ];
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
            'donations_count' => (int) $c->completed_donations_count,
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
                ->withCount('completedDonations')
                ->with([
                    'primaryActionCategories:id,name',
                    'splits' => fn ($q) => $q->orderBy('id')->with(['organization:id,name,ein']),
                ])
                ->orderByDesc('created_at')
                ->get()
                ->map(fn (CareAllianceCampaign $c) => $this->campaignToWorkspaceArray($c, $alliance));
        }

        $donationActivity = [];
        $donationActivityPagination = null;
        if ($tab === 'activity') {
            $perPage = (int) $request->query('activity_per_page', 15);
            $perPage = min(50, max(5, $perPage));

            $campaignActivityQuery = CareAllianceDonation::query()
                ->select([
                    DB::raw("'campaign' as activity_kind"),
                    'care_alliance_donations.id as activity_source_id',
                    'care_alliance_donations.created_at as activity_at',
                ])
                ->whereHas('campaign', fn ($q) => $q->where('care_alliance_id', $alliance->id));

            $generalActivityQuery = Donation::query()
                ->select([
                    DB::raw("'general' as activity_kind"),
                    'donations.id as activity_source_id',
                    DB::raw('COALESCE(donations.created_at, donations.donation_date) as activity_at'),
                ])
                ->where('care_alliance_id', $alliance->id);

            $union = $campaignActivityQuery->toBase()->unionAll($generalActivityQuery->toBase());
            $merged = DB::query()->fromSub($union, 'donation_activity_union')->orderByDesc('activity_at');

            $paginator = $merged->paginate($perPage, ['*'], 'activity_page');

            $cadIds = [];
            $donIds = [];
            foreach ($paginator->items() as $row) {
                $kind = (string) ($row->activity_kind ?? '');
                $sid = (int) ($row->activity_source_id ?? 0);
                if ($sid < 1) {
                    continue;
                }
                if ($kind === 'campaign') {
                    $cadIds[] = $sid;
                } elseif ($kind === 'general') {
                    $donIds[] = $sid;
                }
            }

            $cadById = $cadIds === [] ? collect() : CareAllianceDonation::query()
                ->whereIn('id', array_values(array_unique($cadIds)))
                ->with([
                    'campaign:id,care_alliance_id,slug,name',
                    'donor:id,name',
                ])
                ->get()
                ->keyBy('id');

            $donById = $donIds === [] ? collect() : Donation::query()
                ->whereIn('id', array_values(array_unique($donIds)))
                ->with(['user:id,name'])
                ->get()
                ->keyBy('id');

            $donationActivity = [];
            foreach ($paginator->items() as $row) {
                $kind = (string) ($row->activity_kind ?? '');
                $sid = (int) ($row->activity_source_id ?? 0);
                if ($kind === 'campaign' && ($d = $cadById->get($sid)) instanceof CareAllianceDonation) {
                    $donationActivity[] = $this->donationActivityRow($d, $alliance);
                } elseif ($kind === 'general' && ($d = $donById->get($sid)) instanceof Donation) {
                    $donationActivity[] = $this->generalDonationActivityRow($d, $alliance);
                }
            }

            $donationActivityPagination = [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ];
        }

        return [
            'campaignsTab' => $tab,
            'campaignsCount' => $campaignsCount,
            'alliance' => $this->allianceToArray($alliance),
            'memberships' => $memberships,
            'invitations' => [],
            'joinRequests' => [],
            'campaigns' => $campaigns,
            'donationActivity' => $donationActivity,
            'donationActivityPagination' => $donationActivityPagination,
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
