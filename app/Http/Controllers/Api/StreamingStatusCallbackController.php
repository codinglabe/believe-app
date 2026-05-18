<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OrganizationLivestream;
use App\Models\StreamingJob;
use App\Models\UserLivestream;
use App\Services\Streaming\StreamingEcsTaskMonitor;
use App\Services\Streaming\StreamingLifecycleService;
use App\Services\Streaming\StreamingQueueService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StreamingStatusCallbackController extends Controller
{
    public function __invoke(
        Request $request,
        StreamingQueueService $service,
        StreamingLifecycleService $lifecycle,
        StreamingEcsTaskMonitor $ecsMonitor,
    ): JsonResponse {
        $configured = (string) config('streaming.callback_token');
        if ($configured === '' || $request->bearerToken() !== $configured) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'meeting_id' => ['required', 'string', 'max:100'],
            'organization_id' => ['required', 'string', 'max:100'],
            // `heartbeat` is a no-op poll: the worker asks "should I stop?"
            // every ~10s so the End Stream button can reach it (Laravel only
            // has sqs:SendMessage, no way to signal the task directly).
            'status' => ['required', 'string', 'in:starting,live,completed,failed,stopped,heartbeat'],
            // Worker contract (INTEGRATION.pdf) may send fractional minutes; bill on integer portion.
            'duration_minutes' => ['nullable', 'numeric', 'min:0'],
            'failure_reason' => ['nullable', 'string'],
            'error_message' => ['nullable', 'string'],
            'started_at' => ['nullable', 'string', 'max:64'],
            'ended_at' => ['nullable', 'string', 'max:64'],
            'cloudwatch_log_url' => ['nullable', 'string', 'max:2048'],
            'message_id' => ['nullable', 'string', 'max:255'],
            'task_arn' => ['nullable', 'string', 'max:512'],
            'ecs_task_arn' => ['nullable', 'string', 'max:512'],
            'ecs_task_status' => ['nullable', 'string', 'max:64'],
            'ecs_last_status' => ['nullable', 'string', 'max:64'],
        ]);

        $durationMinutes = isset($validated['duration_minutes'])
            ? max(0, (int) round((float) $validated['duration_minutes']))
            : null;

        $failureReason = trim((string) ($validated['failure_reason'] ?? ''));
        if ($failureReason === '') {
            $failureReason = trim((string) ($validated['error_message'] ?? ''));
        }
        if ($failureReason === '') {
            $failureReason = null;
        }

        $job = null;
        if (! empty($validated['message_id'])) {
            $job = StreamingJob::where('provider_message_id', $validated['message_id'])->first();
        }
        if (! $job) {
            $job = StreamingJob::where('meeting_id', $validated['meeting_id'])
                ->where('organization_id', $validated['organization_id'])
                ->latest('id')
                ->first();
        }

        if (! $job) {
            return response()->json(['error' => 'Streaming job not found'], 404);
        }

        $taskArn = trim((string) ($validated['task_arn'] ?? $validated['ecs_task_arn'] ?? ''));
        $ecsStatus = trim((string) ($validated['ecs_task_status'] ?? $validated['ecs_last_status'] ?? ''));
        if ($taskArn !== '') {
            $ecsMonitor->persistTaskReference($job, $taskArn, $ecsStatus !== '' ? $ecsStatus : null);
            $job->refresh();
        }

        $stop = $this->workerShouldStop($job);

        // heartbeat is a poll — record liveness, then answer "stop?".
        if ($validated['status'] === 'heartbeat') {
            $lifecycle->recordHeartbeat($job);

            return response()->json(['ok' => true, 'stop' => $stop]);
        }

        $service->applyCallbackStatus(
            $job,
            $validated['status'],
            $durationMinutes,
            $failureReason
        );

        return response()->json(['ok' => true, 'stop' => $stop]);
    }

    /**
     * True when the worker should shut down: the user clicked End Stream
     * (settings.stream_stop_requested set), the livestream is no longer in a
     * streaming state, or the livestream row is gone. Drives the bidirectional
     * stop so "End Stream" actually terminates the AWS worker.
     */
    private function workerShouldStop(StreamingJob $job): bool
    {
        $livestream = $job->livestream_kind === 'organization'
            ? OrganizationLivestream::find($job->livestream_id)
            : UserLivestream::find($job->livestream_id);

        if (! $livestream) {
            return true;
        }

        $settings = $livestream->settings ?? [];
        if (! empty($settings['stream_stop_requested'])) {
            return true;
        }

        return ! in_array($livestream->status, ['live', 'meeting_live', 'starting'], true);
    }
}
