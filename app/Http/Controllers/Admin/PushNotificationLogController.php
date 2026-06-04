<?php

namespace App\Http\Controllers\Admin;

use App\Enums\PushNotificationLogStatus;
use App\Exports\PushNotificationLogExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\RepushPushNotificationRequest;
use App\Models\Organization;
use App\Models\PushNotificationLog;
use App\Policies\PushNotificationLogPolicy;
use App\Services\Admin\PushNotificationLogListFilters;
use App\Services\PushNotificationLogger;
use Generator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response as ResponseFacade;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Inertia\Support\Header;
use Maatwebsite\Excel\Excel as ExcelWriterType;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PushNotificationLogController extends Controller
{
    public function __construct(
        private readonly PushNotificationLogListFilters $filters,
        private readonly PushNotificationLogger $logger,
    ) {}

    public function index(Request $request): InertiaResponse
    {
        $this->authorize('viewAny', PushNotificationLog::class);

        $policy = app(PushNotificationLogPolicy::class);
        $orgScope = $policy->organizationScopeForUser($request->user());
        if ($policy->viewAny($request->user()) && ($request->user()->hasRole('admin') || $request->user()->role === 'admin')) {
            $orgScope = null;
        }

        $query = PushNotificationLog::query()
            ->with(['organization:id,name', 'creator:id,name,email,role']);

        $this->filters->apply($query, $request, $orgScope);

        $filterPayload = $this->filters->filterPayload($request);

        $logs = $query
            ->orderByDesc('created_at')
            ->paginate($filterPayload['per_page'])
            ->withQueryString()
            ->through(fn (PushNotificationLog $log) => $this->transformLogSummary($log));

        $statsQuery = PushNotificationLog::query();
        $this->filters->apply($statsQuery, $request, $orgScope);

        $stats = [
            'total' => (clone $statsQuery)->count(),
            'sent' => (clone $statsQuery)->where('status', PushNotificationLogStatus::Sent)->count(),
            'completed' => (clone $statsQuery)->where('status', PushNotificationLogStatus::Completed)->count(),
            'failed' => (clone $statsQuery)->where('status', PushNotificationLogStatus::Failed)->count(),
            'recipients' => (int) (clone $statsQuery)->sum('recipient_count'),
        ];

        $organizations = $orgScope === null
            ? Organization::query()->orderBy('name')->get(['id', 'name'])
            : Organization::query()->whereIn('id', $orgScope)->orderBy('name')->get(['id', 'name']);

        return Inertia::render('admin/push-notifications/logs-index', [
            'logs' => $logs,
            'stats' => $stats,
            'filters' => $filterPayload,
            'moduleOptions' => PushNotificationLogPolicy::moduleOptions(),
            'statusOptions' => PushNotificationLogStatus::values(),
            'organizations' => $organizations,
            'creators' => $this->filters->creatorOptions($orgScope),
            'isPlatformAdmin' => $request->user()->hasRole('admin') || $request->user()->role === 'admin',
        ]);
    }

    public function show(Request $request, PushNotificationLog $pushNotificationLog): InertiaResponse
    {
        $this->authorize('view', $pushNotificationLog);

        $pushNotificationLog->load(['organization:id,name', 'creator:id,name,email,role']);

        $recipientsQuery = $pushNotificationLog->recipients()
            ->with('recipientUser:id,name,email')
            ->orderByDesc('id');

        $recipients = $recipientsQuery
            ->paginate(25)
            ->withQueryString()
            ->through(fn ($recipient) => [
                'id' => $recipient->id,
                'user' => $recipient->recipientUser ? [
                    'id' => $recipient->recipientUser->id,
                    'name' => $recipient->recipientUser->name,
                    'email' => $recipient->recipientUser->email,
                ] : null,
                'device_token' => $recipient->device_token
                    ? substr($recipient->device_token, 0, 24).'…'
                    : null,
                'device_token_full' => $recipient->device_token,
                'status' => $recipient->status instanceof \BackedEnum
                    ? $recipient->status->value
                    : (string) $recipient->status,
                'delivered_at' => $recipient->delivered_at?->toIso8601String(),
                'opened_at' => $recipient->opened_at?->toIso8601String(),
                'failed_at' => $recipient->failed_at?->toIso8601String(),
                'failure_reason' => $recipient->failure_reason,
            ]);

        return Inertia::render('admin/push-notifications/show', [
            'log' => $this->transformLogDetail($pushNotificationLog),
            'recipients' => $recipients,
            'isPlatformAdmin' => $request->user()->hasRole('admin') || $request->user()->role === 'admin',
            'canRepush' => $request->user()->can('repush', $pushNotificationLog),
        ]);
    }

    public function repush(RepushPushNotificationRequest $request, PushNotificationLog $pushNotificationLog): RedirectResponse
    {
        $this->authorize('repush', $pushNotificationLog);

        $this->logger->repushNotification($pushNotificationLog->id);

        return back()->with('success', 'Notification re-push initiated.');
    }

    public function exportCsv(Request $request): StreamedResponse
    {
        $this->authorize('export', PushNotificationLog::class);

        $filename = 'push_notification_logs_'.date('Y-m-d_H-i-s').'.csv';

        return ResponseFacade::stream(function () use ($request) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, (new PushNotificationLogExport($this->emptyGenerator()))->headings());

            foreach ($this->exportRows($request) as $row) {
                fputcsv($handle, $row);
            }

            fclose($handle);
        }, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function exportExcel(Request $request)
    {
        $this->authorize('export', PushNotificationLog::class);

        if ($request->header(Header::INERTIA)) {
            return Inertia::location($request->fullUrl());
        }

        $filename = 'push_notification_logs_'.date('Y-m-d_H-i-s').'.xlsx';

        return Excel::download(
            new PushNotificationLogExport($this->exportRows($request)),
            $filename,
            ExcelWriterType::XLSX,
        );
    }

    /**
     * @return Generator<int, never>
     */
    private function emptyGenerator(): Generator
    {
        if (false) {
            yield [];
        }
    }

    /**
     * @return Generator<int, list<string|int|null>>
     */
    private function exportRows(Request $request): Generator
    {
        $policy = app(PushNotificationLogPolicy::class);
        $orgScope = $policy->organizationScopeForUser($request->user());
        if ($request->user()->hasRole('admin') || $request->user()->role === 'admin') {
            $orgScope = null;
        }

        $query = PushNotificationLog::query()
            ->with(['organization:id,name', 'creator:id,name,role']);

        $this->filters->apply($query, $request, $orgScope);

        foreach ($query->orderByDesc('created_at')->cursor() as $log) {
            yield [
                $log->id,
                $log->created_at?->format('Y-m-d H:i:s'),
                $log->organization?->name,
                $log->moduleLabel(),
                $log->notification_title,
                $log->audience_type,
                $log->recipient_count,
                $log->sent_count,
                $log->delivered_count,
                $log->opened_count,
                $log->failed_count,
                $log->status instanceof \BackedEnum ? $log->status->value : (string) $log->status,
                $log->creator?->name,
                $log->creator ? PushNotificationLog::userRoleLabel($log->creator->role) : 'System',
                $log->deep_link,
            ];
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function transformLogSummary(PushNotificationLog $log): array
    {
        return [
            'id' => $log->id,
            'created_at' => $log->created_at?->toIso8601String(),
            'organization' => $log->organization ? [
                'id' => $log->organization->id,
                'name' => $log->organization->name,
            ] : null,
            'module_name' => $log->resolvedModuleName(),
            'module_label' => $log->moduleLabel(),
            'notification_title' => $log->notification_title,
            'audience_type' => $log->audience_type,
            'recipient_count' => $log->recipient_count,
            'sent_count' => $log->sent_count,
            'delivered_count' => $log->delivered_count,
            'opened_count' => $log->opened_count,
            'failed_count' => $log->failed_count,
            'status' => $log->status instanceof \BackedEnum ? $log->status->value : (string) $log->status,
            'creator' => $log->creatorPayload(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformLogDetail(PushNotificationLog $log): array
    {
        return array_merge($this->transformLogSummary($log), [
            'notification_body' => $log->notification_body,
            'module_record_id' => $log->module_record_id,
            'deep_link' => $log->deep_link,
            'scheduled_at' => $log->scheduled_at?->toIso8601String(),
            'sent_at' => $log->sent_at?->toIso8601String(),
        ]);
    }
}
