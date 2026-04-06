<?php

namespace App\Console\Commands;

use App\Models\FacebookPost;
use App\Jobs\PublishScheduledFacebookPostJob;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ProcessScheduledFacebookPosts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'facebook:process-scheduled';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Dispatch scheduled Facebook posts to queue for processing';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Checking for scheduled Facebook posts...');

        // Get posts that are pending and scheduled for now or earlier
        $scheduledPosts = FacebookPost::where('status', 'pending')
            ->whereNotNull('scheduled_for')
            ->where('scheduled_for', '<=', now())
            ->get();

        if ($scheduledPosts->isEmpty()) {
            $this->info('No scheduled Facebook posts found.');
            return 0;
        }

        $this->info("Found {$scheduledPosts->count()} scheduled Facebook posts to dispatch.");

        $dispatchedCount = 0;

        foreach ($scheduledPosts as $post) {
            try {
                // Dispatch job to queue
                PublishScheduledFacebookPostJob::dispatch($post);
                $dispatchedCount++;
                $this->info("✓ Post ID {$post->id} dispatched to queue.");
            } catch (\Exception $e) {
                $this->error("✗ Failed to dispatch Post ID {$post->id}: " . $e->getMessage());
                Log::error('Failed to dispatch scheduled Facebook post job', [
                    'post_id' => $post->id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
            }
        }

        $this->info("Dispatched {$dispatchedCount} post(s) to queue.");

        return 0;
    }
}

