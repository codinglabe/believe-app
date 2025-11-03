<?php

namespace App\Services;

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
                return true;
            } else {
                Log::error('Firebase send error', [
                    'status' => $response->status(),
                    'response' => $response->json(),
                    'device_token' => substr($deviceToken, 0, 20) . '...',
                ]);
                return false;
            }
        } catch (\Exception $e) {
            Log::error('Firebase exception: ' . $e->getMessage(), [
                'device_token' => substr($deviceToken, 0, 20) . '...',
            ]);
            return false;
        }
    }

    public function sendToUser($userId, $title, $body, $data = [])
    {
        $tokens = app(DeviceTokenService::class)->getUserTokens($userId);

        if (empty($tokens)) {
            Log::warning("No active tokens found for user: {$userId}");
            return false;
        }

        $results = [];
        foreach ($tokens as $token) {
            $results[$token] = $this->sendToDevice($token, $title, $body, $data);
        }

        $successCount = count(array_filter($results));
        Log::info("Notification sent to user", [
            'user_id' => $userId,
            'total_tokens' => count($tokens),
            'success_count' => $successCount
        ]);

        return $results;
    }

    /**
     * Send push notification to multiple devices
     */
    public function sendToMultipleDevices($deviceTokens, $title, $body, $data = [])
    {
        $results = [];
        foreach ($deviceTokens as $token) {
            $results[$token] = $this->sendToDevice($token, $title, $body, $data);
        }

        Log::info('Bulk notification sent', [
            'total_tokens' => count($deviceTokens),
            'success_count' => count(array_filter($results)),
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
        // Send a silent test notification to validate token
        return $this->sendToDevice($deviceToken, 'Test', 'Test notification', [
            'test' => 'true',
            'silent' => 'true'
        ]);
    }
}
