<?php

namespace App\Jobs;

use App\Models\FacebookPost;
use App\Services\Facebook\PostService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class PublishScheduledFacebookPostJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 120; // 2 minutes timeout for video uploads
    public $backoff = [30, 60, 120]; // Retry after 30s, 60s, 120s

    protected $post;

    /**
     * Create a new job instance.
     */
    public function __construct(FacebookPost $post)
    {
        $this->post = $post;
    }

    /**
     * Execute the job.
     */
    public function handle(PostService $postService): void
    {
        // Reload post to ensure we have the latest data
        $post = FacebookPost::with('facebookAccount')->find($this->post->id);

        if (!$post) {
            Log::warning('Facebook post not found', ['post_id' => $this->post->id]);
            return;
        }

        // Check if post is already published
        if ($post->status === 'published') {
            Log::info('Facebook post already published', ['post_id' => $post->id]);
            return;
        }

        // Check if post is still pending and scheduled
        if ($post->status !== 'pending') {
            Log::warning('Facebook post is not in pending status', [
                'post_id' => $post->id,
                'status' => $post->status
            ]);
            return;
        }

        // Check if scheduled time has passed
        if ($post->scheduled_for && $post->scheduled_for->isFuture()) {
            Log::info('Facebook post scheduled time has not arrived yet', [
                'post_id' => $post->id,
                'scheduled_for' => $post->scheduled_for
            ]);
            // Re-dispatch the job for later
            self::dispatch($post)->delay($post->scheduled_for);
            return;
        }

        // Check if Facebook account is connected
        if (!$post->facebookAccount || !$post->facebookAccount->is_connected) {
            throw new \Exception('Facebook account is not connected');
        }

        Log::info('Publishing scheduled Facebook post', [
            'post_id' => $post->id,
            'account_id' => $post->facebookAccount->id,
            'scheduled_for' => $post->scheduled_for,
            'has_image' => !empty($post->image),
            'has_video' => !empty($post->video),
        ]);

        try {
            $response = null;

            // Publish based on post type
            if ($post->video) {
                $videoPath = Storage::disk('public')->path($post->video);

                if (!file_exists($videoPath)) {
                    throw new \Exception('Video file not found: ' . $videoPath);
                }

                $response = $postService->postWithVideo(
                    $post->facebookAccount,
                    $post->message,
                    $videoPath,
                    $post->message
                );
            } elseif ($post->image) {
                $imagePath = Storage::disk('public')->path($post->image);

                if (!file_exists($imagePath)) {
                    throw new \Exception('Image file not found: ' . $imagePath);
                }

                Log::info('Publishing image post', [
                    'image_path' => $imagePath,
                    'exists' => file_exists($imagePath),
                    'size' => filesize($imagePath),
                    'mime' => mime_content_type($imagePath),
                ]);

                $response = $postService->postWithImage(
                    $post->facebookAccount,
                    $post->message,
                    $imagePath,
                    $post->link
                );
            } else {
                // Text post with optional link
                $response = $postService->postMessage(
                    $post->facebookAccount,
                    $post->message,
                    $post->link
                );
            }

            // Update post with Facebook response
            $post->update([
                'status' => 'published',
                'published_at' => now(),
                'facebook_post_id' => $response['id'] ?? null,
                'response_data' => $response,
                'error_message' => null,
            ]);

            Log::info('Scheduled Facebook post published successfully', [
                'post_id' => $post->id,
                'facebook_post_id' => $response['id'] ?? null,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to publish scheduled Facebook post', [
                'post_id' => $post->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Update post with error (but don't mark as failed yet if we have retries left)
            $post->update([
                'error_message' => $e->getMessage(),
                'response_data' => ['error' => $e->getMessage()],
            ]);

            throw $e; // Re-throw to trigger retry mechanism
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        // Reload post to ensure we have the latest data
        $post = FacebookPost::find($this->post->id);

        if ($post) {
            Log::error('PublishScheduledFacebookPostJob failed after all retries', [
                'post_id' => $post->id,
                'error' => $exception->getMessage(),
            ]);

            // Mark post as failed after all retries exhausted
            $post->update([
                'status' => 'failed',
                'error_message' => $exception->getMessage(),
                'response_data' => ['error' => $exception->getMessage()],
            ]);
        }
    }
}

