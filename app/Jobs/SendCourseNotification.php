<?php

namespace App\Jobs;

use App\Models\Course;
use App\Services\FirebaseService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendCourseNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $course;
    public $tries = 3;
    public $timeout = 60;

    /**
     * Create a new job instance.
     */
    public function __construct(Course $course)
    {
        $this->course = $course;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            $organization = $this->course->organization->organization;

            if (!$organization) {
                Log::warning('Course has no organization', ['course_id' => $this->course->id]);
                return;
            }

            // Get followers who have notifications enabled
            $followers = $organization->followers()
                ->wherePivot('notifications', true)
                ->get();

            if ($followers->isEmpty()) {
                Log::info('No followers with notifications enabled', [
                    'organization_id' => $organization->id,
                    'course_id' => $this->course->id
                ]);
                return;
            }

            $courseName = $this->course->name;
            $topicName = $this->course->topic->name ?? 'New Course';
            $title = "New Course Available";
            $body = "{$organization->name} created a new course in {$topicName}: {$courseName}";
            $courseUrl = route('course.show', $this->course->slug);

            $firebaseService = app(FirebaseService::class);

            foreach ($followers as $follower) {
                $this->sendNotificationToFollower($follower, $title, $body, $courseUrl, $firebaseService);
            }

            Log::info('Course notifications sent successfully', [
                'course_id' => $this->course->id,
                'organization_id' => $organization->id,
                'followers_count' => $followers->count()
            ]);

        } catch (\Exception $e) {
            Log::error('Error in SendCourseNotification job: ' . $e->getMessage(), [
                'course_id' => $this->course->id ?? 'unknown',
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Send notification to individual follower
     */
    private function sendNotificationToFollower($follower, $title, $body, $courseUrl, $firebaseService): void
    {
        try {
            $data = [
                'content_item_id' => (string) $this->course->id,
                'type' => 'new_course',
                'course_id' => (string) $this->course->id,
                'course_slug' => $this->course->slug,
                'topic_id' => (string) $this->course->topic_id,
                'organization_id' => (string) $this->course->organization_id,
                'url' => $courseUrl,
                'click_action' => $courseUrl,
            ];

            // Send Firebase notification
            $result = $firebaseService->sendToUser($follower->id, $title, $body, $data);

            // Store in database notifications
            $this->storeDatabaseNotification($follower, $title, $body, $data);

            if ($result) {
                Log::info('✅ Firebase Course notification sent successfully', [
                    'user_id' => $follower->id,
                    'course_id' => $this->course->id,
                ]);
            } else {
                Log::warning('❌ Firebase Course notification failed', [
                    'user_id' => $follower->id,
                    'course_id' => $this->course->id,
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Error sending notification to follower: ' . $e->getMessage(), [
                'follower_id' => $follower->id,
                'course_id' => $this->course->id
            ]);
        }
    }

    /**
     * Store notification in database
     */
    private function storeDatabaseNotification($user, $title, $body, $data): void
    {
        try {
            $user->notifications()->create([
                'title' => $title,
                'body' => $body,
                'data' => $data,
                'type' => 'new_course',
                'read_at' => null,
            ]);
        } catch (\Exception $e) {
            Log::error('Error storing database notification: ' . $e->getMessage());
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('SendCourseNotification job failed: ' . $exception->getMessage(), [
            'course_id' => $this->course->id ?? 'unknown',
        ]);
    }
}
