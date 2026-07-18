<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\SupporterActivity;
use App\Models\SupporterPrimaryOrganizationChange;
use App\Models\User;
use App\Models\UserFavoriteOrganization;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class OrganizationSupporterLedgerService
{
    public const HEADERS = [
        'Supporter Name',
        'Email',
        'Join Date',
        'Depart Date',
        'Current Status',
        'Join Type',
        'Primary Organization',
        'Last Organization',
        'Amount Donated',
        'Purchases',
        'Volunteer Hours',
        'Total Engagement',
        'Last Activity Date',
    ];

    /**
     * @return array{
     *   membership: string,
     *   join_type: string,
     *   search: string,
     *   date_from: ?Carbon,
     *   date_to: ?Carbon,
     *   min_donation: ?float,
     *   max_donation: ?float,
     *   min_purchases: ?float,
     *   max_purchases: ?float,
     *   page: int,
     *   per_page: int,
     * }
     */
    public function parseFilters(Request $request): array
    {
        $membership = (string) $request->input('membership', 'all');
        if (! in_array($membership, ['all', 'primary', 'secondary', 'departed'], true)) {
            $membership = 'all';
        }

        $joinType = (string) $request->input('join_type', 'all');
        if (! in_array($joinType, ['all', 'self', 'organization_link', 'admin_added'], true)) {
            $joinType = 'all';
        }

        $search = trim((string) $request->input('q', ''));
        if (strlen($search) > 100) {
            $search = substr($search, 0, 100);
        }

        $dateFrom = $this->parseDate($request->input('date_from'));
        $dateTo = $this->parseDate($request->input('date_to'), endOfDay: true);

        return [
            'membership' => $membership,
            'join_type' => $joinType,
            'search' => $search,
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'min_donation' => $this->parseMoney($request->input('min_donation')),
            'max_donation' => $this->parseMoney($request->input('max_donation')),
            'min_purchases' => $this->parseMoney($request->input('min_purchases')),
            'max_purchases' => $this->parseMoney($request->input('max_purchases')),
            'page' => max(1, (int) $request->input('page', 1)),
            'per_page' => min(100, max(10, (int) $request->input('per_page', 25))),
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array{
     *   rows: list<array<string, mixed>>,
     *   total: int,
     *   page: int,
     *   per_page: int,
     *   last_page: int,
     *   summary: array{primary: int, secondary: int, departed: int, total_donated: float, total_purchases: float},
     * }
     */
    public function ledger(Organization $organization, array $filters, bool $paginate = true): array
    {
        $orgId = (int) $organization->id;
        $orgOwnerId = (int) $organization->user_id;

        $allRows = $this->buildRows($organization, $orgOwnerId);
        $filtered = $this->applyFilters($allRows, $filters);

        $summary = [
            'primary' => $allRows->where('current_status', 'primary')->count(),
            'secondary' => $allRows->where('current_status', 'secondary')->count(),
            'departed' => $allRows->where('current_status', 'departed')->count(),
            'total_donated' => round($filtered->sum('amount_donated'), 2),
            'total_purchases' => round($filtered->sum('purchases'), 2),
        ];

        $total = $filtered->count();
        $perPage = (int) $filters['per_page'];
        $page = (int) $filters['page'];
        $lastPage = max(1, (int) ceil($total / $perPage));

        $rows = $paginate
            ? $filtered->slice(($page - 1) * $perPage, $perPage)->values()->all()
            : $filtered->values()->all();

        $rows = array_map(function (array $row): array {
            $row['action_links'] = $this->actionLinksForRow($row);

            return $row;
        }, $rows);

        return [
            'rows' => $rows,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'last_page' => $lastPage,
            'summary' => $summary,
        ];
    }

    /**
     * @return array{
     *   row: array<string, mixed>,
     *   timeline: list<array<string, mixed>>,
     *   action_links: list<array{key: string, label: string, href: string, external: bool}>,
     * }
     */
    public function supporterDetail(Organization $organization, int $supporterId): array
    {
        $orgOwnerId = (int) $organization->user_id;
        $row = $this->buildRows($organization, $orgOwnerId)
            ->firstWhere('supporter_id', $supporterId);

        if ($row === null) {
            abort(404);
        }

        $timeline = SupporterActivity::query()
            ->where('organization_id', $organization->id)
            ->where('supporter_id', $supporterId)
            ->orderByDesc('created_at')
            ->get(['id', 'event_type', 'created_at', 'amount_cents', 'believe_points'])
            ->map(fn (SupporterActivity $activity) => [
                'id' => $activity->id,
                'event_type' => $activity->event_type,
                'created_at' => $activity->created_at?->toIso8601String(),
                'money_display' => $this->formatMoneyFromCents($activity->amount_cents),
                'believe_points' => $activity->believe_points,
            ])
            ->values()
            ->all();

        return [
            'row' => $row,
            'timeline' => $timeline,
            'organization_changes' => $this->organizationChangesForSupporter($organization, $supporterId),
            'action_links' => $this->actionLinksForRow($row),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function organizationChangesForSupporter(Organization $organization, int $supporterId): array
    {
        $orgId = (int) $organization->id;

        return SupporterPrimaryOrganizationChange::query()
            ->where('user_id', $supporterId)
            ->where(function ($query) use ($orgId) {
                $query->where('previous_organization_id', $orgId)
                    ->orWhere('new_organization_id', $orgId)
                    ->orWhere('notified_organization_id', $orgId);
            })
            ->with([
                'previousOrganization:id,name',
                'newOrganization:id,name',
            ])
            ->orderByDesc('created_at')
            ->get()
            ->map(function (SupporterPrimaryOrganizationChange $change) use ($orgId) {
                $previousOrgId = $change->previous_organization_id ? (int) $change->previous_organization_id : null;
                $newOrgId = $change->new_organization_id ? (int) $change->new_organization_id : null;

                $direction = match (true) {
                    $previousOrgId === $orgId => 'departed',
                    $newOrgId === $orgId => 'joined',
                    default => 'notified',
                };

                return [
                    'id' => $change->id,
                    'created_at' => $change->created_at?->toIso8601String(),
                    'date_display' => $this->displayDate($change->created_at),
                    'direction' => $direction,
                    'direction_label' => match ($direction) {
                        'departed' => 'Left your organization',
                        'joined' => 'Joined your organization',
                        default => 'Notified about change',
                    },
                    'previous_organization_name' => $change->previousOrganization?->name ?? '',
                    'new_organization_name' => $change->newOrganization?->name ?? '',
                    'reason' => trim((string) $change->reason),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $row
     * @return list<array{key: string, label: string, href: string, external: bool}>
     */
    public function actionLinksForRow(array $row): array
    {
        $supporterId = (int) ($row['supporter_id'] ?? 0);
        $links = [
            [
                'key' => 'ledger',
                'label' => 'View ledger record',
                'href' => route('organization.supporters.show', $supporterId),
                'external' => false,
            ],
            [
                'key' => 'activity',
                'label' => 'Activity timeline',
                'href' => route('organization.supporters.show', $supporterId).'#activity-timeline',
                'external' => false,
            ],
            [
                'key' => 'dashboard',
                'label' => 'Usage dashboard',
                'href' => route('supporter-activity.index'),
                'external' => false,
            ],
        ];

        if (! empty($row['slug'])) {
            $links[] = [
                'key' => 'profile',
                'label' => 'Public profile',
                'href' => route('users.show', $row['slug']),
                'external' => false,
            ];
        }

        if (! empty($row['email'])) {
            $links[] = [
                'key' => 'email',
                'label' => 'Send email',
                'href' => route('organization.supporters.contact', $supporterId),
                'external' => false,
            ];
        }

        $links[] = [
            'key' => 'gift',
            'label' => 'Gift Believe Points',
            'href' => route('gift-bp.index', ['recipient' => $supporterId]),
            'external' => false,
        ];

        $search = trim((string) ($row['name'] ?? ''));
        if ($search !== '') {
            $links[] = [
                'key' => 'volunteer_interests',
                'label' => 'Volunteer interests',
                'href' => route('volunteers.supporter-interests.index', ['search' => $search]),
                'external' => false,
            ];
        }

        return $links;
    }

    private function formatMoneyFromCents(?int $cents): string
    {
        if ($cents === null || $cents <= 0) {
            return '—';
        }

        return '$'.number_format($cents / 100, 2);
    }

    /**
     * @param  array<string, mixed>  $row
     * @return list<string|int|float>
     */
    public function rowToExportArray(array $row): array
    {
        return [
            (string) ($row['name'] ?? ''),
            (string) ($row['email'] ?? ''),
            (string) ($row['join_date_display'] ?? ''),
            (string) ($row['depart_date_display'] ?? ''),
            (string) ($row['current_status_label'] ?? ''),
            (string) ($row['join_type_label'] ?? ''),
            (string) ($row['primary_organization_name'] ?? ''),
            (string) ($row['last_organization_name'] ?? ''),
            number_format((float) ($row['amount_donated'] ?? 0), 2, '.', ''),
            number_format((float) ($row['purchases'] ?? 0), 2, '.', ''),
            number_format((float) ($row['volunteer_hours'] ?? 0), 2, '.', ''),
            (int) ($row['total_engagement'] ?? 0),
            (string) ($row['last_activity_display'] ?? ''),
        ];
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function buildRows(Organization $organization, int $orgOwnerId): Collection
    {
        $orgId = (int) $organization->id;

        $primaryUsers = User::query()
            ->where('role', 'user')
            ->where('primary_organization_id', $orgId)
            ->get(['id', 'name', 'email', 'slug', 'referred_by', 'primary_organization_id', 'created_at']);

        $secondaryFavorites = UserFavoriteOrganization::query()
            ->where('organization_id', $orgId)
            ->whereHas('user', function ($q) use ($orgId) {
                $q->where('role', 'user')
                    ->where(function ($inner) use ($orgId) {
                        $inner->whereNull('primary_organization_id')
                            ->orWhere('primary_organization_id', '!=', $orgId);
                    });
            })
            ->with(['user:id,name,email,slug,referred_by,primary_organization_id,created_at'])
            ->get();

        $departedUserIds = SupporterPrimaryOrganizationChange::query()
            ->where('previous_organization_id', $orgId)
            ->pluck('user_id')
            ->unique()
            ->values()
            ->all();

        $activeIds = $primaryUsers->pluck('id')
            ->merge($secondaryFavorites->pluck('user_id'))
            ->unique();

        $departedUsers = User::query()
            ->where('role', 'user')
            ->whereIn('id', $departedUserIds)
            ->whereNotIn('id', $activeIds)
            ->get(['id', 'name', 'email', 'slug', 'referred_by', 'primary_organization_id', 'created_at']);

        $supporterIds = $activeIds
            ->merge($departedUsers->pluck('id'))
            ->unique()
            ->values()
            ->all();

        if ($supporterIds === []) {
            return collect();
        }

        $favoriteJoinDates = UserFavoriteOrganization::query()
            ->where('organization_id', $orgId)
            ->whereIn('user_id', $supporterIds)
            ->pluck('created_at', 'user_id');

        $primaryOrgNames = Organization::query()
            ->whereIn('id', User::query()
                ->whereIn('id', $supporterIds)
                ->whereNotNull('primary_organization_id')
                ->pluck('primary_organization_id'))
            ->pluck('name', 'id');

        $activityAgg = SupporterActivity::query()
            ->where('organization_id', $orgId)
            ->whereIn('supporter_id', $supporterIds)
            ->selectRaw('supporter_id')
            ->selectRaw("SUM(CASE WHEN event_type = ? THEN COALESCE(amount_cents, 0) ELSE 0 END) as donation_cents", [SupporterActivity::EVENT_DONATION_COMPLETED])
            ->selectRaw("SUM(CASE WHEN event_type = ? THEN COALESCE(amount_cents, 0) ELSE 0 END) as purchase_cents", [SupporterActivity::EVENT_PURCHASE_COMPLETED])
            ->selectRaw('COUNT(*) as engagement_total')
            ->selectRaw('MAX(created_at) as last_activity_at')
            ->groupBy('supporter_id')
            ->get()
            ->keyBy('supporter_id');

        $volunteerHours = DB::table('volunteer_timesheets as vt')
            ->join('job_applications as ja', 'ja.id', '=', 'vt.job_application_id')
            ->where('vt.organization_id', $orgId)
            ->whereIn('ja.user_id', $supporterIds)
            ->whereIn('vt.status', ['approved', 'in_progress'])
            ->groupBy('ja.user_id')
            ->selectRaw('ja.user_id as supporter_id')
            ->selectRaw('SUM(vt.hours) as total_hours')
            ->pluck('total_hours', 'supporter_id');

        $departChanges = SupporterPrimaryOrganizationChange::query()
            ->where('previous_organization_id', $orgId)
            ->whereIn('user_id', $supporterIds)
            ->with(['newOrganization:id,name'])
            ->orderByDesc('created_at')
            ->get()
            ->groupBy('user_id')
            ->map(fn ($group) => $group->first());

        $arrivalChanges = SupporterPrimaryOrganizationChange::query()
            ->where('new_organization_id', $orgId)
            ->whereIn('user_id', $supporterIds)
            ->with(['previousOrganization:id,name'])
            ->orderByDesc('created_at')
            ->get()
            ->groupBy('user_id')
            ->map(fn ($group) => $group->first());

        $rows = collect();

        foreach ($primaryUsers as $user) {
            $rows->push($this->mapRow(
                $user,
                'primary',
                $orgOwnerId,
                $favoriteJoinDates,
                $primaryOrgNames,
                $activityAgg,
                $volunteerHours,
                $departChanges,
                $arrivalChanges,
            ));
        }

        foreach ($secondaryFavorites as $favorite) {
            if ($favorite->user === null) {
                continue;
            }
            $rows->push($this->mapRow(
                $favorite->user,
                'secondary',
                $orgOwnerId,
                $favoriteJoinDates,
                $primaryOrgNames,
                $activityAgg,
                $volunteerHours,
                $departChanges,
                $arrivalChanges,
                $favorite->created_at,
            ));
        }

        foreach ($departedUsers as $user) {
            $rows->push($this->mapRow(
                $user,
                'departed',
                $orgOwnerId,
                $favoriteJoinDates,
                $primaryOrgNames,
                $activityAgg,
                $volunteerHours,
                $departChanges,
                $arrivalChanges,
            ));
        }

        return $rows
            ->sortBy(fn (array $row) => [
                match ($row['current_status']) {
                    'primary' => 0,
                    'secondary' => 1,
                    'departed' => 2,
                    default => 3,
                },
                strtolower((string) $row['name']),
            ])
            ->values();
    }

    /**
     * @param  Collection<int, mixed>  $favoriteJoinDates
     * @param  Collection<int, string>  $primaryOrgNames
     * @param  Collection<int, object>  $activityAgg
     * @param  Collection<int, mixed>  $volunteerHours
     * @param  Collection<int, SupporterPrimaryOrganizationChange>  $departChanges
     * @param  Collection<int, SupporterPrimaryOrganizationChange>  $arrivalChanges
     * @return array<string, mixed>
     */
    private function mapRow(
        User $user,
        string $status,
        int $orgOwnerId,
        Collection $favoriteJoinDates,
        Collection $primaryOrgNames,
        Collection $activityAgg,
        Collection $volunteerHours,
        Collection $departChanges,
        Collection $arrivalChanges,
        mixed $secondaryJoinAt = null,
    ): array {
        $agg = $activityAgg->get($user->id);
        $donationCents = (int) ($agg->donation_cents ?? 0);
        $purchaseCents = (int) ($agg->purchase_cents ?? 0);
        $engagement = (int) ($agg->engagement_total ?? 0);
        $lastActivity = $agg->last_activity_at ?? null;

        $joinAt = $secondaryJoinAt
            ?? $favoriteJoinDates->get($user->id)
            ?? $user->created_at;

        $departChange = $departChanges->get($user->id);
        $arrivalChange = $arrivalChanges->get($user->id);

        $departAt = $status === 'departed' ? $departChange?->created_at : null;

        $joinType = $this->resolveJoinType($user, $orgOwnerId);
        $primaryOrgId = $user->primary_organization_id ? (int) $user->primary_organization_id : null;

        $lastOrgName = null;
        if ($status === 'departed' && $departChange?->newOrganization) {
            $lastOrgName = $departChange->newOrganization->name;
        } elseif ($arrivalChange?->previousOrganization) {
            $lastOrgName = $arrivalChange->previousOrganization->name;
        }

        return [
            'supporter_id' => (int) $user->id,
            'slug' => $user->slug,
            'name' => (string) $user->name,
            'email' => (string) $user->email,
            'join_date' => $this->iso($joinAt),
            'join_date_display' => $this->displayDate($joinAt),
            'depart_date' => $this->iso($departAt),
            'depart_date_display' => $this->displayDate($departAt),
            'current_status' => $status,
            'current_status_label' => $this->statusLabel($status),
            'join_type' => $joinType,
            'join_type_label' => $this->joinTypeLabel($joinType),
            'primary_organization_name' => $primaryOrgId ? ($primaryOrgNames->get($primaryOrgId) ?? '') : '',
            'primary_organization_id' => $primaryOrgId,
            'last_organization_name' => $lastOrgName ?? '',
            'amount_donated' => round($donationCents / 100, 2),
            'purchases' => round($purchaseCents / 100, 2),
            'volunteer_hours' => round((float) ($volunteerHours->get($user->id) ?? 0), 2),
            'total_engagement' => $engagement,
            'last_activity_date' => $this->iso($lastActivity),
            'last_activity_display' => $this->displayDate($lastActivity),
        ];
    }

    private function resolveJoinType(User $user, int $orgOwnerId): string
    {
        if ((int) ($user->referred_by ?? 0) === $orgOwnerId) {
            return 'organization_link';
        }

        return 'self';
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $rows
     * @param  array<string, mixed>  $filters
     * @return Collection<int, array<string, mixed>>
     */
    private function applyFilters(Collection $rows, array $filters): Collection
    {
        return $rows->filter(function (array $row) use ($filters) {
            if ($filters['membership'] !== 'all' && $row['current_status'] !== $filters['membership']) {
                return false;
            }

            if ($filters['join_type'] !== 'all' && $row['join_type'] !== $filters['join_type']) {
                return false;
            }

            if ($filters['search'] !== '') {
                $q = strtolower($filters['search']);
                $hay = strtolower($row['name'].' '.$row['email']);
                if (! str_contains($hay, $q)) {
                    return false;
                }
            }

            if ($filters['min_donation'] !== null && $row['amount_donated'] < $filters['min_donation']) {
                return false;
            }
            if ($filters['max_donation'] !== null && $row['amount_donated'] > $filters['max_donation']) {
                return false;
            }
            if ($filters['min_purchases'] !== null && $row['purchases'] < $filters['min_purchases']) {
                return false;
            }
            if ($filters['max_purchases'] !== null && $row['purchases'] > $filters['max_purchases']) {
                return false;
            }

            if ($filters['date_from'] !== null || $filters['date_to'] !== null) {
                $inRange = $this->dateInRange($row['join_date'], $filters['date_from'], $filters['date_to'])
                    || $this->dateInRange($row['depart_date'], $filters['date_from'], $filters['date_to'])
                    || $this->dateInRange($row['last_activity_date'], $filters['date_from'], $filters['date_to']);

                if (! $inRange) {
                    return false;
                }
            }

            return true;
        });
    }

    private function dateInRange(?string $iso, ?Carbon $from, ?Carbon $to): bool
    {
        if ($iso === null || $iso === '') {
            return false;
        }

        try {
            $dt = Carbon::parse($iso);
        } catch (\Throwable) {
            return false;
        }

        if ($from !== null && $dt->lt($from)) {
            return false;
        }
        if ($to !== null && $dt->gt($to)) {
            return false;
        }

        return true;
    }

    private function parseDate(mixed $value, bool $endOfDay = false): ?Carbon
    {
        if ($value === null || $value === '') {
            return null;
        }

        try {
            $dt = Carbon::parse((string) $value);
        } catch (\Throwable) {
            return null;
        }

        return $endOfDay ? $dt->endOfDay() : $dt->startOfDay();
    }

    private function parseMoney(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (! is_numeric($value)) {
            return null;
        }

        return round((float) $value, 2);
    }

    private function iso(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        if ($value instanceof Carbon) {
            return $value->toIso8601String();
        }

        try {
            return Carbon::parse($value)->toIso8601String();
        } catch (\Throwable) {
            return null;
        }
    }

    private function displayDate(mixed $value): string
    {
        if ($value === null) {
            return '';
        }

        try {
            return Carbon::parse($value)->format('M j, Y');
        } catch (\Throwable) {
            return '';
        }
    }

    private function statusLabel(string $status): string
    {
        return match ($status) {
            'primary' => 'Primary',
            'secondary' => 'Secondary',
            'departed' => 'Departed',
            default => ucfirst($status),
        };
    }

    private function joinTypeLabel(string $type): string
    {
        return match ($type) {
            'organization_link' => 'Organization Link',
            'admin_added' => 'Admin Added',
            default => 'Self',
        };
    }
}
