<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\SupporterActivity;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SupporterActivityController extends BaseController
{
    private const RECENT_DAYS = 90;

    public function index(Request $request): Response
    {
        $this->authorizePermission($request, 'dashboard.read');

        $isAdmin = $request->user()->hasRole('admin');
        $organization = $this->resolveOrganization($request);

        if (!$organization) {
            return Inertia::render('supporter-activity/index', array_merge($this->emptyPayload(), [
                'isAdmin' => $isAdmin,
                'organizationOptions' => $isAdmin ? $this->adminOrganizationOptions() : [],
                'selectedOrganizationId' => null,
            ]));
        }

        $orgId = $organization->id;
        $recentCutoff = now()->subDays(self::RECENT_DAYS);

        $summary = $this->buildSummary($orgId, $recentCutoff);

        $activeSupporters = $this->buildActiveSupporters($orgId, $recentCutoff);

        $topSupporters = $this->buildTopSupporters($orgId);

        return Inertia::render('supporter-activity/index', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'summary' => $summary,
            'activeSupporters' => $activeSupporters,
            'topSupporters' => $topSupporters,
            'recentDays' => self::RECENT_DAYS,
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

        $supporter = User::findOrFail($supporterId);

        $timeline = SupporterActivity::where('organization_id', $orgId)
            ->where('supporter_id', $supporterId)
            ->orderByDesc('created_at')
            ->get(['id', 'event_type', 'created_at']);

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
        ]);
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
            'recentDays' => self::RECENT_DAYS,
            'isAdmin' => false,
            'organizationOptions' => [],
            'selectedOrganizationId' => null,
        ];
    }

    /**
     * @return array<string, int>
     */
    private function buildSummary(int $orgId, \DateTimeInterface $recentCutoff): array
    {
        $activeSupporters = SupporterActivity::query()
            ->where('organization_id', $orgId)
            ->where('created_at', '>=', $recentCutoff)
            ->distinct()
            ->count('supporter_id');

        $donors = SupporterActivity::query()
            ->where('organization_id', $orgId)
            ->where('event_type', SupporterActivity::EVENT_DONATION_COMPLETED)
            ->distinct()
            ->count('supporter_id');

        $buyers = SupporterActivity::query()
            ->where('organization_id', $orgId)
            ->where('event_type', SupporterActivity::EVENT_PURCHASE_COMPLETED)
            ->distinct()
            ->count('supporter_id');

        $courseParticipants = SupporterActivity::query()
            ->where('organization_id', $orgId)
            ->where('event_type', SupporterActivity::EVENT_COURSES_COMPLETED)
            ->distinct()
            ->count('supporter_id');

        $eventParticipants = SupporterActivity::query()
            ->where('organization_id', $orgId)
            ->where('event_type', SupporterActivity::EVENT_EVENTS_COMPLETED)
            ->distinct()
            ->count('supporter_id');

        $volunteers = SupporterActivity::query()
            ->where('organization_id', $orgId)
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
    private function buildActiveSupporters(int $orgId, \DateTimeInterface $recentCutoff): array
    {
        $rows = SupporterActivity::query()
            ->where('organization_id', $orgId)
            ->where('created_at', '>=', $recentCutoff)
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
                    ? \Carbon\Carbon::parse($row->last_activity_at)->format('M j')
                    : '',
            ];
        })->values()->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildTopSupporters(int $orgId): array
    {
        $counts = SupporterActivity::query()
            ->where('organization_id', $orgId)
            ->select([
                'supporter_id',
                DB::raw('SUM(CASE WHEN event_type = "' . SupporterActivity::EVENT_DONATION_COMPLETED . '" THEN 1 ELSE 0 END) as donations'),
                DB::raw('SUM(CASE WHEN event_type = "' . SupporterActivity::EVENT_PURCHASE_COMPLETED . '" THEN 1 ELSE 0 END) as purchases'),
                DB::raw('SUM(CASE WHEN event_type = "' . SupporterActivity::EVENT_COURSES_COMPLETED . '" THEN 1 ELSE 0 END) as courses'),
                DB::raw('SUM(CASE WHEN event_type = "' . SupporterActivity::EVENT_EVENTS_COMPLETED . '" THEN 1 ELSE 0 END) as events'),
                DB::raw('SUM(CASE WHEN event_type = "' . SupporterActivity::EVENT_VOLUNTEER_SIGNUP . '" THEN 1 ELSE 0 END) as volunteers'),
                DB::raw('COUNT(*) as engagement_total'),
            ])
            ->groupBy('supporter_id')
            ->orderByDesc('engagement_total')
            ->limit(25)
            ->get();

        $ids = $counts->pluck('supporter_id')->all();
        $names = User::whereIn('id', $ids)->pluck('name', 'id');

        return $counts->values()->map(function ($row, $idx) use ($names) {
            return [
                'rank' => $idx + 1,
                'supporter_id' => (int) $row->supporter_id,
                'name' => $names[$row->supporter_id] ?? 'User #' . $row->supporter_id,
                'donations' => (int) $row->donations,
                'purchases' => (int) $row->purchases,
                'courses' => (int) $row->courses,
                'events' => (int) $row->events,
                'volunteers' => (int) $row->volunteers,
            ];
        })->all();
    }
}
