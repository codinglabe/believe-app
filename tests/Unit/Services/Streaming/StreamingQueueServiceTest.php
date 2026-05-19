<?php

namespace Tests\Unit\Services\Streaming;

use App\Models\StreamingJob;
use App\Services\Streaming\StreamingQueueService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StreamingQueueServiceTest extends TestCase
{
    use RefreshDatabase;

    private StreamingQueueService $queue;

    protected function setUp(): void
    {
        parent::setUp();
        $this->queue = app(StreamingQueueService::class);
    }

    public function test_allows_new_job_when_no_active_jobs(): void
    {
        $this->assertNull(
            $this->queue->goLiveBlockedReason('owner-1', 'user', 10)
        );
    }

    public function test_blocks_second_job_on_same_livestream_until_terminal(): void
    {
        $this->makeJob('user', 10, 'owner-1', 'live');

        $reason = $this->queue->goLiveBlockedReason('owner-1', 'user', 10);

        $this->assertNotNull($reason);
        $this->assertStringContainsString('this meeting', strtolower($reason));
    }

    public function test_allows_new_job_on_same_livestream_after_terminal(): void
    {
        $this->makeJob('user', 10, 'owner-1', 'stopped');

        $this->assertNull($this->queue->goLiveBlockedReason('owner-1', 'user', 10));
    }

    public function test_allows_job_on_a_different_meeting_while_another_is_active(): void
    {
        $this->makeJob('user', 10, 'owner-1', 'starting');

        $this->assertNull($this->queue->goLiveBlockedReason('owner-1', 'user', 99));
    }

    public function test_different_owners_can_each_have_an_active_job(): void
    {
        $this->makeJob('user', 10, 'owner-a', 'live');
        $this->makeJob('user', 20, 'owner-b', 'queued');

        $this->assertNull($this->queue->goLiveBlockedReason('owner-a', 'user', 99));
        $this->assertNull($this->queue->goLiveBlockedReason('owner-b', 'user', 99));
    }

    private function makeJob(string $kind, int $livestreamId, string $ownerId, string $status): StreamingJob
    {
        return StreamingJob::query()->create([
            'livestream_kind' => $kind,
            'livestream_id' => $livestreamId,
            'meeting_id' => (string) $livestreamId,
            'organization_id' => $ownerId,
            'source_url' => 'rtmp://test/source',
            'destination_url' => 'rtmp://test/dest',
            'callback_url' => 'https://example.test/callback',
            'max_duration_minutes' => 120,
            'status' => $status,
        ]);
    }
}
