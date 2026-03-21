<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\SupporterActivity;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SupporterActivityController extends BaseController
{
    /** @var list<string> */
    private const PERIODS = ['7', '30', 'all'];

    /** @var list<string> */
    private const METRICS = [
        'active_supporters',
        'donors',
        'buyers',
        'course_participants',
        'event_participants',
        'volunteers',
    ];

    public function index(Request $request): Response
    {
        $this->authorizePermission($request, 'dashboard.read');

        $isAdmin = $request->user()->hasRole('admin');
        $organization = $this->resolveOrganization($request);

        $period = $this->normalizePeriod($request->query('period'));
        $metric = $this->normalizeMetric($request->query('metric'));
        $from = $this->periodStart($period);

        if (!$organization) {
            return Inertia::render('supporter-activity/index', array_merge($this->emptyPayload(), [
                'isAdmin' => $isAdmin,
                'organizationOptions' => $isAdmin ? $this->adminOrganizationOptions() : [],
                'selectedOrganizationId' => null,
                'period' => $period,
                'metric' => null,
            ]));
        }

        $orgId = $organization->id;

        $summary = $this->buildSummary($orgId, $from);

        $activeSupporters = $this->buildActiveSupporters($orgId, $from);

        $topSupporters = $this->buildTopSupporters($orgId, $from);

        $recentActivity = $this->buildRecentActivityFeed($orgId, $from);

        $metricDrilldown = $metric
            ? $this->buildMetricDrilldown($orgId, $metric, $from)
            : [];

        $metricLabels = $this->metricLabels();

        return Inertia::render('supporter-activity/index', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'summary' => $summary,
            'activeSupporters' => $activeSupporters,
            'topSupporters' => $topSupporters,
            'recentActivity' => $recentActivity,
            'metricDrilldown' => $metricDrilldown,
            'metric' => $metric,
            'metricLabels' => $metricLabels,
            'period' => $period,
            'periodLabels' => [
                '7' => 'Last 7 days',
                '30' => 'Last 30 days',
                'all' => 'All time',
            ],
            'isAdmin' => $isAdmin,
            'organizationOptions' => $isAdmin ? $this->adminOrganizationOptions() : [],
            'selectedOrganizationId' => $organization->id,
        ]);
    }

    public function show(Request $request, int $supporterId): Response
    {
        $this->authorizePermission($request, 'dashboard.read');

        $organization = $this->resolveOrganization($request);
        if (!$organization) {
            abort(404);
        }

        $orgId = $organization->id;

        $exists = SupporterActivity::where('organization_id', $orgId)
            ->where('supporter_id', $supporterId)
            ->exists();

        if (!$exists) {
            abort(404);
        }

        $dashboardPeriod = $this->normalizePeriod($request->query('period'));

        $supporter = User::findOrFail($supporterId);

        $timeline = SupporterActivity::where('organization_id', $orgId)
            ->where('supporter_id', $supporterId)
            ->orderByDesc('created_at')
            ->get(['id', 'event_type', 'created_at', 'amount_cents', 'believe_points'])
            ->map(function (SupporterActivity $row) {
                return [
                    'id' => $row->id,
                    'event_type' => $row->event_type,
                    'created_at' => $row->created_at?->toIso8601String(),
                    'money_display' => $this->formatMoneyFromCents($row->amount_cents),
                    'believe_points' => $row->believe_points,
                ];
            })
            ->values()
            ->all();

        return Inertia::render('supporter-activity/show', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'supporter' => [
                'id' => $supporter->id,
                'name' => $supporter->name,
            ],
            'timeline' => $timeline,
            'isAdmin' => $request->user()->hasRole('admin'),
            'dashboardPeriod' => $dashboardPeriod,
            'periodLabels' => [
                '7' => 'Last 7 days',
                '30' => 'Last 30 days',
                'all' => 'All time',
            ],
        ]);
    }

    private function normalizePeriod(mixed $value): string
    {
        $v = is_string($value) ? $value : '30';
        if (!in_array($v, self::PERIODS, true)) {
            return '30';
        }

        return $v;
    }

    private function normalizeMetric(mixed $value): ?string
    {
        if (!is_string($value) || $value === '') {
            return null;
        }
        if (!in_array($value, self::METRICS, true)) {
            return null;
        }

        return $value;
    }

    private function periodStart(string $period): ?Carbon
    {
        return match ($period) {
            '7' => now()->subDays(7)->startOfDay(),
            '30' => now()->subDays(30)->startOfDay(),
            default => null,
        };
    }

    /**
     * @return array<string, string>
     */
    private function metricLabels(): array
    {
        return [
            'active_supporters' => 'Active supporters',
            'donors' => 'Donors',
            'buyers' => 'Buyers',
            'course_participants' => 'Course participants',
            'event_participants' => 'Event participants',
            'volunteers' => 'Volunteers',
        ];
    }

    private function resolveOrganization(Request $request): ?Organization
    {
        $user = $request->user();
        if ($user->hasRole('organization')) {
            return Organization::where('user_id', $user->id)->first();
        }
        if ($user->hasRole('admin')) {
            $id = $request->integer('organization_id');
            if ($id > 0) {
                return Organization::find($id);
            }

            return Organization::query()->orderBy('name')->first();
        }

        return null;
    }

    /**
     * @return list<array{id: int, name: string}>
     */
    private function adminOrganizationOptions(): array
    {
        return Organization::query()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Organization $o) => ['id' => $o->id, 'name' => $o->name])
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function emptyPayload(): array
    {
        return [
            'organization' => null,
            'summary' => [
                'active_supporters' => 0,
                'donors' => 0,
                'buyers' => 0,
                'course_participants' => 0,
                'event_participants' => 0,
                'volunteers' => 0,
            ],
            'activeSupporters' => [],
            'topSupporters' => [],
            'recentActivity' => [],
            'metricDrilldown' => [],
            'metric' => null,
            'metricLabels' => $this->metricLabels(),
            'period' => '30',
            'periodLabels' => [
                '7' => 'Last 7 days',
                '30' => 'Last 30 days',
                'all' => 'All time',
            ],
            'isAdmin' => false,
            'organizationOptions' => [],
            'selectedOrganizationId' => null,
        ];
    }

    /**
     * @return array<string, int>
     */
    private function buildSummary(int $orgId, ?Carbon $from): array
    {
        $scoped = fn () => SupporterActivity::query()->where('organization_id', $orgId)
            ->when($from, fn ($q) => $q->where('created_at', '>=', $from));

        $activeSupporters = $scoped()
            ->distinct()
            ->count('supporter_id');

        $donors = $scoped()
            ->where('event_type', SupporterActivity::EVENT_DONATION_COMPLETED)
            ->distinct()
            ->count('supporter_id');

        $buyers = $scoped()
            ->where('event_type', SupporterActivity::EVENT_PURCHASE_COMPLETED)
            ->distinct()
            ->count('supporter_id');

        $courseParticipants = $scoped()
            ->where('event_type', SupporterActivity::EVENT_COURSES_COMPLETED)
            ->distinct()
            ->count('supporter_id');

        $eventParticipants = $scoped()
            ->where('event_type', SupporterActivity::EVENT_EVENTS_COMPLETED)
            ->distinct()
            ->count('supporter_id');

        $volunteers = $scoped()
            ->where('event_type', SupporterActivity::EVENT_VOLUNTEER_SIGNUP)
            ->distinct()
            ->count('supporter_id');

        return [
            'active_supporters' => $activeSupporters,
            'donors' => $donors,
            'buyers' => $buyers,
            'course_participants' => $courseParticipants,
            'event_participants' => $eventParticipants,
            'volunteers' => $volunteers,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildActiveSupporters(int $orgId, ?Carbon $from): array
    {
        $rows = SupporterActivity::query()
            ->where('organization_id', $orgId)
            ->when($from, fn ($q) => $q->where('created_at', '>=', $from))
            ->select([
                'supporter_id',
                DB::raw('MAX(created_at) as last_activity_at'),
                DB::raw('MAX(CASE WHEN event_type = "' . SupporterActivity::EVENT_DONATION_COMPLETED . '" THEN 1 ELSE 0 END) as has_donation'),
                DB::raw('MAX(CASE WHEN event_type = "' . SupporterActivity::EVENT_PURCHASE_COMPLETED . '" THEN 1 ELSE 0 END) as has_purchase'),
                DB::raw('MAX(CASE WHEN event_type = "' . SupporterActivity::EVENT_COURSES_COMPLETED . '" THEN 1 ELSE 0 END) as has_course'),
                DB::raw('MAX(CASE WHEN event_type = "' . SupporterActivity::EVENT_EVENTS_COMPLETED . '" THEN 1 ELSE 0 END) as has_event'),
                DB::raw('MAX(CASE WHEN event_type = "' . SupporterActivity::EVENT_VOLUNTEER_SIGNUP . '" THEN 1 ELSE 0 END) as has_volunteer'),
            ])
            ->groupBy('supporter_id')
            ->orderByDesc('last_activity_at')
            ->limit(50)
            ->get();

        $ids = $rows->pluck('supporter_id')->all();
        $names = User::whereIn('id', $ids)->pluck('name', 'id');

        return $rows->map(function ($row) use ($names) {
            return [
                'supporter_id' => (int) $row->supporter_id,
                'name' => $names[$row->supporter_id] ?? 'User #' . $row->supporter_id,
                'donation' => (bool) $row->has_donation,
                'purchase' => (bool) $row->has_purchase,
                'course' => (bool) $row->has_course,
                'event' => (bool) $row->has_event,
                'volunteer' => (bool) $row->has_volunteer,
                'last_activity' => $row->last_activity_at
                    ? Carbon::parse($row->last_activity_at)->format('M j, Y')
                    : '',
            ];
        })->values()->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildTopSupporters(int $orgId, ?Carbon $from): array
    {
        $counts = SupporterActivity::query()
            ->where('organization_id', $orgId)
            ->when($from, fn ($q) => $q->where('created_at', '>=', $from))
            ->select([
                'supporter_id',
                DB::raw('SUM(CASE WHEN event_type = "' . SupporterActivity::EVENT_DONATION_COMPLETED . '" THEN 1 ELSE 0 END) as donations'),
                DB::raw('SUM(CASE WHEN event_type = "' . SupporterActivity::EVENT_PURCHASE_COMPLETED . '" THEN 1 ELSE 0 END) as purchases'),
                DB::raw('SUM(CASE WHEN event_type = "' . SupporterActivity::EVENT_COURSES_COMPLETED . '" THEN 1 ELSE 0 END) as courses'),
                DB::raw('SUM(CASE WHEN event_type = "' . SupporterActivity::EVENT_EVENTS_COMPLETED . '" THEN 1 ELSE 0 END) as events'),
                DB::raw('SUM(CASE WHEN event_type = "' . SupporterActivity::EVENT_VOLUNTEER_SIGNUP . '" THEN 1 ELSE 0 END) as volunteers'),
                DB::raw('COUNT(*) as engagement_total'),
                DB::raw('COALESCE(SUM(amount_cents), 0) as total_amount_cents'),
                DB::raw('COALESCE(SUM(believe_points), 0) as total_believe_points'),
            ])
            ->groupBy('supporter_id')
            ->orderByDesc('engagement_total')
            ->limit(25)
            ->get();

        $ids = $counts->pluck('supporter_id')->all();
        $names = User::whereIn('id', $ids)->pluck('name', 'id');

        return $counts->values()->map(function ($row, $idx) use ($names) {
            $cents = (int) $row->total_amount_cents;
            $pts = (int) $row->total_believe_points;

            return [
                'rank' => $idx + 1,
                'supporter_id' => (int) $row->supporter_id,
                'name' => $names[$row->supporter_id] ?? 'User #' . $row->supporter_id,
                'donations' => (int) $row->donations,
                'purchases' => (int) $row->purchases,
                'courses' => (int) $row->courses,
                'events' => (int) $row->events,
                'volunteers' => (int) $row->volunteers,
                'total_amount_cents' => $cents,
                'total_believe_points' => $pts,
                'money_display' => $this->formatMoneyFromCents($cents > 0 ? $cents : null),
                'points_display' => $pts > 0 ? (string) $pts : '—',
            ];
        })->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildRecentActivityFeed(int $orgId, ?Carbon $from): array
    {
        $rows = SupporterActivity::query()
            ->where('organization_id', $orgId)
            ->when($from, fn ($q) => $q->where('created_at', '>=', $from))
            ->with(['supporter:id,name', 'organization:id,name'])
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        return $rows->map(function (SupporterActivity $row) {
            return [
                'id' => $row->id,
                'supporter_id' => $row->supporter_id,
                'supporter_name' => $row->supporter->name ?? ('User #' . $row->supporter_id),
                'event_type' => $row->event_type,
                'organization_name' => $row->organization->name ?? '',
                'date_display' => $row->created_at?->timezone(config('app.timezone'))->format('M j, Y g:i A') ?? '',
                'money_display' => $this->formatMoneyFromCents($row->amount_cents),
                'believe_points' => $row->believe_points,
                'points_display' => $row->believe_points !== null && (int) $row->believe_points > 0
                    ? (string) $row->believe_points
                    : '—',
            ];
        })->values()->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildMetricDrilldown(int $orgId, string $metric, ?Carbon $from): array
    {
        $query = SupporterActivity::query()
            ->where('organization_id', $orgId)
            ->when($from, fn ($q) => $q->where('created_at', '>=', $from));

        if ($metric === 'active_supporters') {
            // Any engagement in window
        } else {
            $eventType = match ($metric) {
                'donors' => SupporterActivity::EVENT_DONATION_COMPLETED,
                'buyers' => SupporterActivity::EVENT_PURCHASE_COMPLETED,
                'course_participants' => SupporterActivity::EVENT_COURSES_COMPLETED,
                'event_participants' => SupporterActivity::EVENT_EVENTS_COMPLETED,
                'volunteers' => SupporterActivity::EVENT_VOLUNTEER_SIGNUP,
                default => null,
            };
            if ($eventType) {
                $query->where('event_type', $eventType);
            }
        }

        $rows = $query
            ->select([
                'supporter_id',
                DB::raw('COUNT(*) as txn_count'),
                DB::raw('COALESCE(SUM(amount_cents), 0) as sum_amount_cents'),
                DB::raw('COALESCE(SUM(believe_points), 0) as sum_believe_points'),
                DB::raw('MAX(created_at) as last_at'),
            ])
            ->groupBy('supporter_id')
            ->orderByDesc('last_at')
            ->limit(150)
            ->get();

        $ids = $rows->pluck('supporter_id')->all();
        $names = User::whereIn('id', $ids)->pluck('name', 'id');

        return $rows->map(function ($row) use ($names) {
            $cents = (int) $row->sum_amount_cents;
            $pts = (int) $row->sum_believe_points;

            return [
                'supporter_id' => (int) $row->supporter_id,
                'name' => $names[$row->supporter_id] ?? 'User #' . $row->supporter_id,
                'transaction_count' => (int) $row->txn_count,
                'money_display' => $this->formatMoneyFromCents($cents > 0 ? $cents : null),
                'points_display' => $pts > 0 ? (string) $pts : '—',
                'last_activity' => $row->last_at
                    ? Carbon::parse($row->last_at)->format('M j, Y')
                    : '',
            ];
        })->values()->all();
    }

    private function formatMoneyFromCents(?int $cents): string
    {
        if ($cents === null || $cents === 0) {
            return '—';
        }

        return '$' . number_format($cents / 100, 2);
    }
}
