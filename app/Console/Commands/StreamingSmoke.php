<?php

namespace App\Console\Commands;

use App\Models\StreamingJob;
use Aws\Exception\AwsException;
use Aws\Sqs\SqsClient;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class StreamingSmoke extends Command
{
    protected $signature = 'streaming:smoke
        {--meeting-id= : Override meeting_id (default: ls_smoke-<timestamp>). Use room/streamID for VDO.Ninja two-segment paths.}
        {--organization-id=smoke-org : organization_id sent in the payload}
        {--max-duration=2 : max_duration_minutes on the payload (kill switch)}
        {--destination= : RTMP destination URL (default: bogus YouTube URL that forces a fast worker failure)}
        {--dry-run : print the payload without sending to SQS}';

    protected $description = 'Send a fake streaming job to the AWS SQS queue to verify the Laravel→AWS plumbing. Worker will fail to pull RTMP (no publisher), proving the round-trip. Creates a streaming_jobs row so the worker callback finds it; falls back to DB-less mode if the DB is unreachable.';

    public function handle(): int
    {
        $queueUrl = (string) config('streaming.queue_url');
        $region = (string) config('streaming.region');
        $key = (string) config('streaming.aws_key');
        $secret = (string) config('streaming.aws_secret');
        $callbackToken = (string) config('streaming.callback_token');
        $bridgeRtmpBase = (string) config('streaming.worker_rtmp_pull_base');
        $callbackBase = (string) config('streaming.callback_base_url');

        $missing = [];
        if ($queueUrl === '') {
            $missing[] = 'SQS_STREAMING_QUEUE_URL';
        }
        if ($region === '') {
            $missing[] = 'AWS_REGION';
        }
        if ($key === '') {
            $missing[] = 'AWS_ACCESS_KEY_ID';
        }
        if ($secret === '') {
            $missing[] = 'AWS_SECRET_ACCESS_KEY';
        }
        if ($callbackToken === '') {
            $missing[] = 'LARAVEL_CALLBACK_TOKEN';
        }
        if ($bridgeRtmpBase === '') {
            $missing[] = 'STREAMING_WORKER_RTMP_PULL_BASE';
        }
        if ($missing !== []) {
            $this->error('Missing required env: '.implode(', ', $missing));

            return self::FAILURE;
        }

        if ((bool) config('streaming.simulate_worker', false)) {
            $this->warn('STREAMING_SIMULATE_WORKER=true — flip it to false to hit the real worker. Aborting.');

            return self::FAILURE;
        }

        $meetingId = (string) ($this->option('meeting-id') ?: ('ls_smoke-'.time()));
        $organizationId = (string) $this->option('organization-id');
        $maxDuration = max(1, (int) $this->option('max-duration'));

        $sourceUrl = rtrim($bridgeRtmpBase, '/').'/'.$meetingId;
        $destinationUrl = (string) ($this->option('destination')
            ?: 'rtmp://a.rtmp.youtube.com/live2/streaming-smoke-no-publisher');
        $callbackUrl = $callbackBase !== ''
            ? rtrim($callbackBase, '/').'/api/streaming/status'
            : route('api.streaming.status');

        $payload = [
            'meeting_id' => $meetingId,
            'organization_id' => $organizationId,
            'source_url' => $sourceUrl,
            'destination_url' => $destinationUrl,
            'callback_url' => $callbackUrl,
            'max_duration_minutes' => $maxDuration,
        ];

        $jobId = null;
        if (! $this->option('dry-run')) {
            try {
                DB::connection()->getPdo();
                $job = StreamingJob::create([
                'livestream_kind' => 'organization',
                'livestream_id' => 0,
                'meeting_id' => $meetingId,
                'organization_id' => $organizationId,
                'source_url' => $sourceUrl,
                'destination_url' => $destinationUrl,
                'callback_url' => $callbackUrl,
                'max_duration_minutes' => $maxDuration,
                'status' => 'queued',
            ]);
                $jobId = $job->id;
                $this->line('Created streaming_jobs row id='.$jobId);
            } catch (\Throwable $e) {
                $this->warn('DB unreachable ('.$e->getMessage().'). Continuing without a streaming_jobs row — worker callback will 404, but SQS/worker plumbing is still exercised.');
            }
        }

        $this->line('Queue:        '.$queueUrl);
        $this->line('Region:       '.$region);
        $this->line('IAM key:      '.substr($key, 0, 8).'…');
        $this->line('Bridge RTMP:  '.$sourceUrl);
        $this->line('Callback URL: '.$callbackUrl);
        $this->line('Payload:');
        $this->line(json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        if ($callbackUrl !== '' && parse_url($callbackUrl, PHP_URL_HOST) === 'localhost') {
            $this->warn('callback_url points at localhost — AWS worker cannot reach it. Set STREAMING_CALLBACK_BASE_URL to a public tunnel URL (e.g. cloudflared) before relying on the callback.');
        }

        if ($this->option('dry-run')) {
            $this->info('Dry run — not sending.');

            return self::SUCCESS;
        }

        try {
            $client = new SqsClient([
                'version' => '2012-11-05',
                'region' => $region,
                'credentials' => ['key' => $key, 'secret' => $secret],
            ]);

            $result = $client->sendMessage([
                'QueueUrl' => $queueUrl,
                'MessageBody' => json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
            ]);
        } catch (AwsException $e) {
            $this->error('SQS sendMessage failed: '.$e->getAwsErrorCode().' — '.$e->getAwsErrorMessage());

            return self::FAILURE;
        }

        $messageId = (string) ($result->get('MessageId') ?? '');
        $this->info('Sent. MessageId='.$messageId);

        if ($jobId !== null && $messageId !== '') {
            StreamingJob::where('id', $jobId)->update(['provider_message_id' => $messageId]);
        }
        $this->line('');
        $this->line('Watch the worker pick it up:');
        $this->line('  AWS_PROFILE=biu-stream aws logs tail /ecs/biu-stream-prod-worker --follow --since 1m');
        $this->line('');
        if (str_ends_with($destinationUrl, '/streaming-smoke-no-publisher')) {
            $this->line('Expected lifecycle for this smoke (no publisher on the bridge path):');
            $this->line('  starting → failed   (ffmpeg "Input/output error" on the source URL)');
        } else {
            $this->line('Real destination configured. Expected if a publisher is connected to the bridge path:');
            $this->line('  starting → live → completed   (after max_duration='.$maxDuration.'m the worker kills FFmpeg cleanly)');
        }

        return self::SUCCESS;
    }
}
