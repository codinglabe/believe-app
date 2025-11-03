<?php

namespace App\Jobs;

use App\Models\Event;
use App\Services\FirebaseService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendEventNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $event;
    public $tries = 3;
    public $timeout = 60;

    /**
     * Create a new job instance.
     */
    public function __construct(Event $event)
    {
        $this->event = $event;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            $organization = $this->event->organization;

            // Determine who created the event and get their followers
            if ($organization) {
                // Event created by organization - notify organization followers
                $followers = $organization->followers()
                    ->wherePivot('notifications', true)
                    ->get();

                $creatorName = $organization->name;
                $creatorType = 'organization';
            }

            if ($followers->isEmpty()) {
                Log::info('No followers found for event creator', [
                    'event_id' => $this->event->id,
                    'creator_type' => $creatorType,
                    'creator_id' => $organization->id
                ]);
                return;
            }

            $eventName = $this->event->name;
            $eventType = $this->event->eventType->name ?? 'Event';
            $location = $this->event->city ?: $this->event->location;

            $title = "New {$eventType} Event";
            $body = "{$creatorName} created a new event: {$eventName}" .
                   ($location ? " in {$location}" : "");

            $eventUrl = route('viewEvent', $this->event->id);

            $firebaseService = app(FirebaseService::class);

            foreach ($followers as $follower) {
                $this->sendNotificationToFollower($follower, $title, $body, $eventUrl, $firebaseService);
            }

            Log::info('Event notifications sent successfully', [
                'event_id' => $this->event->id,
                'creator_type' => $creatorType,
                'creator_name' => $creatorName,
                'followers_count' => $followers->count()
            ]);

        } catch (\Exception $e) {
            Log::error('Error in SendEventNotification job: ' . $e->getMessage(), [
                'event_id' => $this->event->id ?? 'unknown',
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Send notification to individual follower
     */
    private function sendNotificationToFollower($follower, $title, $body, $eventUrl, $firebaseService): void
    {
        try {
            $data = [
                'content_item_id' => (string) $this->event->id,
                'type' => 'new_event',
                'event_id' => (string) $this->event->id,
                'event_type_id' => $this->event->event_type_id ? (string) $this->event->event_type_id : null,
                'organization_id' => $this->event->organization_id ? (string) $this->event->organization_id : null,
                'user_id' => $this->event->user_id ? (string) $this->event->user_id : null,
                'url' => $eventUrl,
                'click_action' => $eventUrl,
            ];

            // Send Firebase notification
            $result = $firebaseService->sendToUser($follower->id, $title, $body, $data);


            if ($result) {
                Log::info('✅ Firebase Event notification sent successfully', [
                    'user_id' => $follower->id,
                    'event_id' => $this->event->id,
                ]);
            } else {
                Log::warning('❌ Firebase Event notification failed', [
                    'user_id' => $follower->id,
                    'event_id' => $this->event->id,
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Error sending notification to follower: ' . $e->getMessage(), [
                'follower_id' => $follower->id,
                'event_id' => $this->event->id
            ]);
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('SendEventNotification job failed: ' . $exception->getMessage(), [
            'event_id' => $this->event->id ?? 'unknown',
        ]);
    }
}
