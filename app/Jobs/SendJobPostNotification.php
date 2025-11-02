<?php

namespace App\Jobs;

use App\Models\JobPost;
use App\Services\FirebaseService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendJobPostNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $jobPost;
    public $tries = 3;
    public $timeout = 60;

    /**
     * Create a new job instance.
     */
    public function __construct(JobPost $jobPost)
    {
        $this->jobPost = $jobPost;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            $organization = $this->jobPost->organization;

            if (!$organization) {
                Log::warning('Job post has no organization', ['job_post_id' => $this->jobPost->id]);
                return;
            }

            // Get followers who have notifications enabled
            $followers = $organization->followers()
                ->wherePivot('notifications', true)
                ->get();

            if ($followers->isEmpty()) {
                Log::info('No followers with notifications enabled', [
                    'organization_id' => $organization->id,
                    'job_post_id' => $this->jobPost->id
                ]);
                return;
            }

            $positionName = $this->jobPost->position->title ?? 'New Position';
            $title = "New Job Opportunity";
            $body = "{$organization->name} posted a new {$positionName} position";
            $jobUrl = route('jobs.show', ['id' => $this->jobPost->id]);


            foreach ($followers as $follower) {
                $this->sendNotificationToFollower($follower, $title, $body, $jobUrl);
            }

            Log::info('Job post notifications sent via queue', [
                'job_post_id' => $this->jobPost->id,
                'organization' => $organization->name,
                'followers_count' => $followers->count(),
                'position' => $positionName
            ]);

        } catch (\Exception $e) {
            Log::error('Error in SendJobPostNotification job: ' . $e->getMessage(), [
                'job_post_id' => $this->jobPost->id ?? 'unknown',
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Send notification to individual follower
     */
    private function sendNotificationToFollower($follower, $title, $body, $jobUrl): void
    {
        try {
            $firebaseService = new FirebaseService();

            $data = [
                'content_item_id' => (string) $this->jobPost->id,
                'type' => 'job_post',
                'job_id' => (string) $this->jobPost->id,
                'url' => $jobUrl,
                'click_action' => $jobUrl,
            ];

            // Send Firebase notification
            $firebaseService->sendToUser($follower->id, $title, $body, $data);

            // Store in database notifications
            $this->storeDatabaseNotification($follower, $title, $body, $data);

        } catch (\Exception $e) {
            Log::error('Error sending notification to follower: ' . $e->getMessage(), [
                'follower_id' => $follower->id,
                'job_post_id' => $this->jobPost->id
            ]);
        }
    }

    /**
     * Store notification in database
     */
    private function storeDatabaseNotification($user, $title, $body, $data): void
    {
        try {
            if (class_exists('App\Models\Notification')) {
                $user->notifications()->create([
                    'title' => $title,
                    'body' => $body,
                    'data' => $data,
                    'type' => 'job_post',
                    'read_at' => null,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Error storing database notification: ' . $e->getMessage());
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('SendJobPostNotification job failed: ' . $exception->getMessage(), [
            'job_post_id' => $this->jobPost->id ?? 'unknown',
        ]);
    }
}
