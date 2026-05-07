<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StreamingJob;
use App\Services\Streaming\StreamingQueueService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StreamingStatusCallbackController extends Controller
{
    public function __invoke(Request $request, StreamingQueueService $service): JsonResponse
    {
        $configured = (string) config('streaming.callback_token');
        if ($configured === '' || $request->bearerToken() !== $configured) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'meeting_id' => ['required', 'string', 'max:100'],
            'organization_id' => ['required', 'string', 'max:100'],
            'status' => ['required', 'string', 'in:starting,live,completed,failed,stopped'],
            // Worker contract (INTEGRATION.pdf) may send fractional minutes; bill on integer portion.
            'duration_minutes' => ['nullable', 'numeric', 'min:0'],
            'failure_reason' => ['nullable', 'string'],
            'error_message' => ['nullable', 'string'],
            'started_at' => ['nullable', 'string', 'max:64'],
            'ended_at' => ['nullable', 'string', 'max:64'],
            'cloudwatch_log_url' => ['nullable', 'string', 'max:2048'],
            'message_id' => ['nullable', 'string', 'max:255'],
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

        $service->applyCallbackStatus(
            $job,
            $validated['status'],
            $durationMinutes,
            $failureReason
        );

        return response()->json(['ok' => true]);
    }
}
