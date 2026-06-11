<?php

namespace App\Services\PushNotifications;

use App\Models\NotificationFailure;
use App\Models\PushNotificationLog;
use App\Models\PushNotificationRecipient;
use Illuminate\Support\Facades\Log;

class NotificationFailureLogger
{
    public function __construct(
        private readonly FcmErrorClassifier $errorClassifier,
    ) {}

    /**
     * @param  array{success?: bool, error_code?: ?string, response?: ?array}  $firebaseResult
     */
    public function log(
        PushNotificationLog $log,
        PushNotificationRecipient $recipient,
        array $firebaseResult,
        int $attemptCount,
        ?string $failureReason = null,
    ): NotificationFailure {
        $errorCode = $this->errorClassifier->normalizeErrorCode($firebaseResult['error_code'] ?? null);
        $reason = $failureReason ?? $this->errorClassifier->mapFailureReason($firebaseResult);

        $failure = NotificationFailure::create([
            'notification_id' => $log->id,
            'push_notification_recipient_id' => $recipient->id,
            'user_id' => $recipient->recipient_user_id,
            'device_token' => $recipient->device_token,
            'firebase_error_code' => $errorCode !== '' ? $errorCode : null,
            'failure_reason' => $reason,
            'firebase_response' => $firebaseResult['response'] ?? null,
            'attempt_count' => $attemptCount,
            'failed_at' => now(),
        ]);

        Log::warning('Push notification delivery failed', [
            'notification_id' => $log->id,
            'recipient_id' => $recipient->id,
            'user_id' => $recipient->recipient_user_id,
            'firebase_error_code' => $errorCode,
            'failure_reason' => $reason,
            'attempt_count' => $attemptCount,
        ]);

        return $failure;
    }
}
