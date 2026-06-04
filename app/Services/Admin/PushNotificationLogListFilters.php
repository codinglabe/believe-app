<?php

namespace App\Services\Admin;

use App\Enums\PushNotificationLogStatus;
use App\Enums\PushNotificationModule;
use App\Models\PushNotificationLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

final class PushNotificationLogListFilters
{
    /**
     * @param  list<int>|null  $organizationScope  null = platform admin (no org filter)
     */
    public function apply(Builder $query, Request $request, ?array $organizationScope): Builder
    {
        if ($organizationScope === []) {
            $query->whereRaw('0 = 1');

            return $query;
        }

        if ($organizationScope !== null) {
            $query->whereIn('organization_id', $organizationScope);
        }

        if ($request->filled('organization_id') && $request->integer('organization_id') > 0) {
            $orgId = $request->integer('organization_id');
            if ($organizationScope === null || in_array($orgId, $organizationScope, true)) {
                $query->where('organization_id', $orgId);
            }
        }

        if ($request->filled('module') && $request->string('module')->toString() !== 'all') {
            $module = $request->string('module')->toString();
            if (in_array($module, PushNotificationModule::values(), true)) {
                $query->where('module_name', $module);
            }
        }

        if ($request->filled('status') && $request->string('status')->toString() !== 'all') {
            $status = $request->string('status')->toString();
            if (in_array($status, PushNotificationLogStatus::values(), true)) {
                $query->where('status', $status);
            }
        }

        if ($request->filled('created_by') && $request->integer('created_by') > 0) {
            $query->where('created_by', $request->integer('created_by'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->string('date_from')->toString());
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->string('date_to')->toString());
        }

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function (Builder $q) use ($search) {
                $q->where('notification_title', 'like', "%{$search}%")
                    ->orWhere('notification_body', 'like', "%{$search}%")
                    ->orWhereHas('organization', fn (Builder $oq) => $oq->where('name', 'like', "%{$search}%"));
            });
        }

        return $query;
    }

    /**
     * @return array{
     *     organization_id: int|null,
     *     module: string,
     *     status: string,
     *     created_by: int|null,
     *     date_from: string|null,
     *     date_to: string|null,
     *     search: string|null,
     *     per_page: int,
     * }
     */
    public function filterPayload(Request $request): array
    {
        $perPage = $request->integer('per_page', 20);
        if (! in_array($perPage, [10, 20, 50, 100], true)) {
            $perPage = 20;
        }

        return [
            'organization_id' => $request->filled('organization_id') ? $request->integer('organization_id') : null,
            'module' => $request->filled('module') ? $request->string('module')->toString() : 'all',
            'status' => $request->filled('status') ? $request->string('status')->toString() : 'all',
            'created_by' => $request->filled('created_by') ? $request->integer('created_by') : null,
            'date_from' => $request->filled('date_from') ? $request->string('date_from')->toString() : null,
            'date_to' => $request->filled('date_to') ? $request->string('date_to')->toString() : null,
            'search' => $request->filled('search') ? $request->string('search')->toString() : null,
            'per_page' => $perPage,
        ];
    }

    /**
     * @return list<array{id: int, name: string}>
     */
    public function creatorOptions(?array $organizationScope): array
    {
        $query = PushNotificationLog::query()
            ->whereNotNull('created_by')
            ->select('created_by')
            ->distinct();

        if ($organizationScope === []) {
            return [];
        }

        if ($organizationScope !== null) {
            $query->whereIn('organization_id', $organizationScope);
        }

        $creatorIds = $query->pluck('created_by');

        return User::query()
            ->whereIn('id', $creatorIds)
            ->orderBy('name')
            ->get(['id', 'name', 'role'])
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'role_label' => \App\Models\PushNotificationLog::userRoleLabel($u->role),
            ])
            ->values()
            ->all();
    }
}
