<?php

namespace App\Services\Streaming;

use App\Models\OrganizationLivestream;
use App\Models\StreamingJob;
use App\Models\StreamingMonthlyUsage;
use App\Models\UserLivestream;
use Aws\Sqs\SqsClient;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class StreamingQueueService
{
    /**
     * @return array<string, mixed>
     */
    private function sqsClientConfig(): array
    {
        $config = [
            'version' => '2012-11-05',
            'region' => (string) config('streaming.region'),
            'credentials' => [
                'key' => (string) config('streaming.aws_key'),
                'secret' => (string) config('streaming.aws_secret'),
            ],
        ];

        $http = [];
        $caBundle = config('streaming.aws_ca_bundle');
        if (is_string($caBundle) && $caBundle !== '') {
            $http['verify'] = $caBundle;
        } elseif (! (bool) config('streaming.http_verify', true)) {
            $http['verify'] = false;
        }

        if ($http !== []) {
            $config['http'] = $http;
        }

        return $config;
    }

    private function shouldSimulateWorker(): bool
    {
        if (! (bool) config('streaming.simulate_worker', false)) {
            return false;
        }

        if (app()->environment('production') && ! (bool) config('streaming.simulate_worker_force', false)) {
            Log::warning('STREAMING_SIMULATE_WORKER is set but ignored in production. Use a real worker, or set STREAMING_SIMULATE_WORKER_FORCE=true (not recommended).');

            return false;
        }

        return true;
    }

    public function willUseRealSqs(): bool
    {
        if ($this->shouldSimulateWorker()) {
            return false;
        }

        return (string) config('streaming.queue_url') !== '';
    }

    /**
     * Match what a real worker does: callback "starting" then "live" so the DB and UI update.
     */
    private function simulateWorkerProgress(StreamingJob $job): void
    {
        $job->refresh();
        $this->applyCallbackStatus($job, 'starting', null, null);
        $this->applyCallbackStatus($job->fresh(), 'live', null, null);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function enqueue(StreamingJob $job, array $payload): string
    {
        if ($this->shouldSimulateWorker()) {
            $mid = 'local-sim-'.$job->id.'-'.substr(sha1((string) microtime(true)), 0, 10);
            $job->update([
                'provider_message_id' => $mid,
                'status' => 'queued',
            ]);
            Log::notice('Streaming worker simulated (no SQS). Unset STREAMING_SIMULATE_WORKER for real AWS relay.', [
                'streaming_job_id' => $job->id,
                'livestream_kind' => $job->livestream_kind,
            ]);
            $this->simulateWorkerProgress($job);

            return $mid;
        }

        $queueUrl = (string) config('streaming.queue_url');
        if ($queueUrl === '') {
            throw new RuntimeException('SQS_STREAMING_QUEUE_URL is not configured. Set it for AWS, or enable STREAMING_SIMULATE_WORKER=true for local UI testing without a worker.');
        }

        $client = new SqsClient($this->sqsClientConfig());

        $message = [
            'QueueUrl' => $queueUrl,
            'MessageBody' => json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
        ];

        $delaySeconds = max(0, min(900, (int) config('streaming.sqs_delay_seconds', 0)));
        if ($delaySeconds > 0) {
            $message['DelaySeconds'] = $delaySeconds;
        }

        $result = $client->sendMessage($message);

        $messageId = (string) ($result->get('MessageId') ?? '');
        $job->update([
            'provider_message_id' => $messageId !== '' ? $messageId : null,
            'status' => 'queued',
        ]);

        return $messageId;
    }

    public function applyCallbackStatus(StreamingJob $job, string $status, ?int $durationMinutes, ?string $failureReason): void
    {
        DB::transaction(function () use ($job, $status, $durationMinutes, $failureReason): void {
            $updates = ['status' => $status];
            if ($durationMinutes !== null) {
                $updates['duration_minutes'] = max(0, $durationMinutes);
            }
            if ($failureReason !== null && $failureReason !== '') {
                $updates['failure_reason'] = $failureReason;
            }
            if (in_array($status, ['completed', 'failed', 'stopped'], true)) {
                $updates['completed_at'] = now();
            }
            $job->fill($updates)->save();

            $this->syncLivestreamState($job, $status);
            $this->accountUsageIfNeeded($job);
        });
    }

    private function syncLivestreamState(StreamingJob $job, string $status): void
    {
        if ($job->livestream_kind === 'organization') {
            $livestream = OrganizationLivestream::find($job->livestream_id);
        } else {
            $livestream = UserLivestream::find($job->livestream_id);
        }

        if (! $livestream) {
            return;
        }

        if ($status === 'starting' && in_array($livestream->status, ['draft', 'scheduled'], true)) {
            $livestream->update(['status' => 'meeting_live']);

            return;
        }

        if ($status === 'live') {
            $livestream->update([
                'status' => 'live',
                'started_at' => $livestream->started_at ?? now(),
            ]);

            return;
        }

        if (in_array($status, ['completed', 'stopped'], true)) {
            $livestream->update([
                'status' => 'draft',
                'ended_at' => now(),
            ]);

            return;
        }

        if ($status === 'failed') {
            $livestream->update(['status' => 'meeting_live']);
        }
    }

    private function accountUsageIfNeeded(StreamingJob $job): void
    {
        if (! in_array($job->status, ['completed', 'failed', 'stopped'], true)) {
            return;
        }
        if ($job->duration_minutes === null || $job->accounted_at !== null) {
            return;
        }

        $monthKey = Carbon::now()->format('Y-m');
        $usage = StreamingMonthlyUsage::firstOrCreate(
            [
                'organization_id' => $job->organization_id,
                'month_key' => $monthKey,
            ],
            [
                'total_minutes' => 0,
                'billable_minutes' => 0,
                'overage_amount_cents' => 0,
            ]
        );

        $usage->total_minutes += max(0, (int) $job->duration_minutes);

        $freeMinutes = (int) config('streaming.billing.free_minutes_per_month', 1800);
        $rateCentsPerHour = (int) config('streaming.billing.rate_cents_per_hour', 8);
        $usage->billable_minutes = max($usage->total_minutes - $freeMinutes, 0);
        $usage->overage_amount_cents = (int) round(($usage->billable_minutes / 60) * $rateCentsPerHour);
        $usage->save();

        $job->update(['accounted_at' => now()]);
    }
}
