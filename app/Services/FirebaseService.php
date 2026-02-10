<?php

namespace App\Services;

use App\Models\PushNotificationLog;
use App\Models\UserPushToken;
use Google\Auth\ServiceAccountCredentials;
use Google\Auth\Credentials\ServiceAccountCredentials as GoogleServiceAccountCredentials;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FirebaseService
{
    private $projectId;
    private $credentialsPath;
    private $accessToken;

    public function __construct()
    {
        $this->projectId = config('services.firebase.project_id');
        $this->credentialsPath = storage_path(config('services.firebase.credentials'));
    }

    /**
     * Get Firebase access token
     */
    private function getAccessToken()
    {
        if ($this->accessToken) {
            return $this->accessToken;
        }

        try {
            $credentials = new GoogleServiceAccountCredentials(
                'https://www.googleapis.com/auth/cloud-platform',
                json_decode(file_get_contents($this->credentialsPath), true)
            );

            $this->accessToken = $credentials->fetchAuthToken()['access_token'];
            return $this->accessToken;
        } catch (\Exception $e) {
            Log::error('Firebase token error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Send push notification to a single device
     */
    public function sendToDevice($deviceToken, $title, $body, $data = [])
    {
        $accessToken = $this->getAccessToken();

        if (!$accessToken) {
            Log::error('Failed to get Firebase access token');
            return false;
        }

        // Extract content_item_id from data or use default
        $contentItemId = $data['content_item_id'] ?? null;
        $clickAction = $data['click_action'] ?? null;

        // Build the notification URL
        $notificationUrl = $clickAction
            ?? url('/');

        $message = [
            'message' => [
                'token' => $deviceToken,
                'notification' => [
                    'title' => $title,
                    'body' => $body,
                ],
                'data' => array_merge($data, [
                    'click_action' => $notificationUrl,
                    'url' => $notificationUrl,
                ]),
                'webpush' => [
                    'fcm_options' => [
                        'link' => $notificationUrl,
                    ],
                    'notification' => [
                        'title' => $title,
                        'body' => $body,
                        'icon' => url('/favicon-96x96.png'),
                        'badge' => url('/badge.png'),
                        'actions' => [
                            [
                                'action' => 'open',
                                'title' => 'View Content'
                            ]
                        ]
                    ],
                ],
                'apns' => [
                    'payload' => [
                        'aps' => [
                            'alert' => [
                                'title' => $title,
                                'body' => $body,
                            ],
                            'sound' => 'default',
                        ],
                        'click_action' => $notificationUrl,
                    ],
                ],
                'android' => [
                    'notification' => [
                        'click_action' => $notificationUrl,
                        'sound' => 'default',
                    ],
                ],
            ],
        ];

        try {
            $response = Http::withToken($accessToken)
                ->timeout(30)
                ->post(
                    "https://fcm.googleapis.com/v1/projects/{$this->projectId}/messages:send",
                    $message
                );

            if ($response->successful()) {
                Log::info('Push notification sent successfully', [
                    'device_token' => substr($deviceToken, 0, 20) . '...',
                    'title' => $title,
                    'content_item_id' => $contentItemId,
                    'url' => $notificationUrl,
                ]);
                return ['success' => true, 'error_code' => null, 'response' => null];
            }

            $body = $response->json();
            $errorCode = $body['error']['details'][0]['errorCode'] ?? $body['error']['message'] ?? (string) $response->status();
            Log::error('Firebase send error', [
                'status' => $response->status(),
                'response' => $body,
                'device_token' => substr($deviceToken, 0, 20) . '...',
            ]);
            return ['success' => false, 'error_code' => $errorCode, 'response' => $body];
        } catch (\Exception $e) {
            Log::error('Firebase exception: ' . $e->getMessage(), [
                'device_token' => substr($deviceToken, 0, 20) . '...',
            ]);
            return ['success' => false, 'error_code' => 'EXCEPTION', 'response' => ['message' => $e->getMessage()]];
        }
    }

    /**
     * Send to a user and log each delivery for admin overview. Updates token status on failure.
     *
     * @param  int  $userId
     * @param  string  $title
     * @param  string  $body
     * @param  array  $data  Optional keys: content_item_id, click_action, source_type, source_id
     * @return array<string, array{success: bool, error_code: ?string, response: ?array}>
     */
    public function sendToUser($userId, $title, $body, $data = [])
    {
        $deviceService = app(DeviceTokenService::class);
        $records = $deviceService->getActiveTokenRecords($userId);

        if ($records->isEmpty()) {
            Log::warning("No active tokens found for user: {$userId}");
            return [];
        }

        $sourceType = $data['source_type'] ?? null;
        $sourceId = $data['source_id'] ?? null;
        unset($data['source_type'], $data['source_id']);

        $results = [];
        foreach ($records as $record) {
            $out = $this->sendToDevice($record->push_token, $title, $body, $data);
            $results[$record->push_token] = $out;

            PushNotificationLog::create([
                'user_id' => $userId,
                'user_push_token_id' => $record->id,
                'title' => $title,
                'body' => $body,
                'source_type' => $sourceType,
                'source_id' => $sourceId,
                'status' => $out['success'] ? PushNotificationLog::STATUS_SENT : PushNotificationLog::STATUS_FAILED,
                'fcm_error_code' => $out['error_code'] ?? null,
                'fcm_response' => $out['response'] ?? null,
                'sent_at' => now(),
            ]);

            if (!$out['success']) {
                $record->last_error = is_array($out['response']) ? ($out['response']['error']['message'] ?? $out['error_code']) : (string) $out['error_code'];
                $record->last_error_at = now();
                if (in_array($out['error_code'] ?? '', ['UNREGISTERED', 'NOT_FOUND'], true)) {
                    $record->status = UserPushToken::STATUS_INVALID;
                }
                $record->save();
            }
        }

        $successCount = count(array_filter($results, fn ($r) => $r['success']));
        Log::info("Notification sent to user", [
            'user_id' => $userId,
            'total_tokens' => $records->count(),
            'success_count' => $successCount,
        ]);

        return $results;
    }

    /**
     * Send push notification to multiple devices. Each result is ['success' => bool, 'error_code' => ?string, 'response' => ?array].
     */
    public function sendToMultipleDevices($deviceTokens, $title, $body, $data = [])
    {
        $results = [];
        foreach ($deviceTokens as $token) {
            $results[$token] = $this->sendToDevice($token, $title, $body, $data);
        }

        $successCount = count(array_filter($results, fn ($r) => $r['success']));
        Log::info('Bulk notification sent', [
            'total_tokens' => count($deviceTokens),
            'success_count' => $successCount,
            'title' => $title,
        ]);

        return $results;
    }

    /**
     * Send notification to all users in a topic
     */
    public function sendToTopic($topic, $title, $body, $data = [])
    {
        $accessToken = $this->getAccessToken();

        if (!$accessToken) {
            Log::error('Failed to get Firebase access token');
            return false;
        }

        $contentItemId = $data['content_item_id'] ?? null;
        $notificationUrl = $contentItemId
            ? route('notifications.content.show', ['content_item' => $contentItemId])
            : url('/');

        $message = [
            'message' => [
                'topic' => $topic,
                'notification' => [
                    'title' => $title,
                    'body' => $body,
                ],
                'data' => array_merge($data, [
                    'click_action' => $notificationUrl,
                    'url' => $notificationUrl,
                ]),
                'webpush' => [
                    'fcm_options' => [
                        'link' => $notificationUrl,
                    ],
                    'notification' => [
                        'title' => $title,
                        'body' => $body,
                        'icon' => url('/icon.png'),
                        'badge' => url('/badge.png'),
                    ],
                ],
                'apns' => [
                    'payload' => [
                        'aps' => [
                            'alert' => [
                                'title' => $title,
                                'body' => $body,
                            ],
                        ],
                    ],
                ],
            ],
        ];

        try {
            $response = Http::withToken($accessToken)
                ->timeout(30)
                ->post(
                    "https://fcm.googleapis.com/v1/projects/{$this->projectId}/messages:send",
                    $message
                );

            $success = $response->successful();

            if ($success) {
                Log::info('Topic notification sent successfully', [
                    'topic' => $topic,
                    'title' => $title,
                    'content_item_id' => $contentItemId,
                ]);
            } else {
                Log::error('Firebase topic send error', [
                    'topic' => $topic,
                    'status' => $response->status(),
                    'response' => $response->json(),
                ]);
            }

            return $success;
        } catch (\Exception $e) {
            Log::error('Firebase topic send exception: ' . $e->getMessage(), [
                'topic' => $topic,
            ]);
            return false;
        }
    }

    /**
     * Subscribe a device token to a topic
     */
    public function subscribeToTopic($deviceTokens, $topic)
    {
        $accessToken = $this->getAccessToken();

        if (!$accessToken) {
            Log::error('Failed to get Firebase access token for topic subscription');
            return false;
        }

        // Ensure deviceTokens is an array
        $deviceTokens = is_array($deviceTokens) ? $deviceTokens : [$deviceTokens];

        $data = [
            'to' => '/topics/' . $topic,
            'registration_tokens' => $deviceTokens,
        ];

        try {
            $response = Http::withToken($accessToken)
                ->post('https://iid.googleapis.com/iid/v1:batchAdd', $data);

            return $response->successful();
        } catch (\Exception $e) {
            Log::error('Topic subscription error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Validate a device token
     */
    public function validateToken($deviceToken)
    {
        $result = $this->sendToDevice($deviceToken, 'Test', 'Test notification', [
            'test' => 'true',
            'silent' => 'true',
        ]);

        return $result['success'] ?? false;
    }
}
