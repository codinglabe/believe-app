<?php

namespace App\Services;

use App\Enums\PushNotificationLogStatus;
use App\Enums\PushNotificationRecipientStatus;
use App\Models\Campaign;
use App\Models\ContentItem;
use App\Models\Organization;
use App\Models\PushNotificationLog;
use App\Models\User;
use App\Models\PushNotificationRecipient;
use App\Models\UserPushToken;
use App\Services\PushNotifications\FcmErrorClassifier;
use App\Services\PushNotifications\NotificationFailureLogger;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PushNotificationLogger
{
    public function __construct(
        private readonly FirebaseService $firebaseService,
        private readonly DeviceTokenService $deviceTokenService,
        private readonly NotificationFailureLogger $failureLogger,
        private readonly FcmErrorClassifier $errorClassifier,
    ) {}

    /**
     * Create a new notification log in draft status.
     *
     * @param  array{
     *     organization_id?: int|null,
     *     user_id?: int|null,
     *     module_name: string,
     *     module_record_id?: int|null,
     *     notification_title: string,
     *     notification_body?: string|null,
     *     audience_type?: string,
     *     deep_link?: string|null,
     *     scheduled_at?: \DateTimeInterface|string|null,
     *     created_by?: int|null,
     * }  $data
     */
    public function logCreated(array $data): PushNotificationLog
    {
        return PushNotificationLog::create([
            'organization_id' => $data['organization_id'] ?? null,
            'user_id' => $data['user_id'] ?? null,
            'module_name' => $data['module_name'],
            'module_record_id' => $data['module_record_id'] ?? null,
            'notification_title' => $data['notification_title'],
            'notification_body' => $data['notification_body'] ?? null,
            'audience_type' => $data['audience_type'] ?? 'users',
            'deep_link' => $data['deep_link'] ?? null,
            'scheduled_at' => $data['scheduled_at'] ?? null,
            'created_by' => array_key_exists('created_by', $data)
                ? $data['created_by']
                : auth()->id(),
            'status' => PushNotificationLogStatus::Draft,
            'recipient_count' => 0,
            'sent_count' => 0,
            'delivered_count' => 0,
            'opened_count' => 0,
            'failed_count' => 0,
        ]);
    }

    public function logScheduled(PushNotificationLog $log, ?\DateTimeInterface $scheduledAt = null): PushNotificationLog
    {
        $log->update([
            'status' => PushNotificationLogStatus::Scheduled,
            'scheduled_at' => $scheduledAt ?? $log->scheduled_at ?? now(),
        ]);

        return $log->fresh();
    }

    public function logProcessing(PushNotificationLog $log): PushNotificationLog
    {
        $log->update(['status' => PushNotificationLogStatus::Processing]);

        return $log->fresh();
    }

    /**
     * Create pending recipient rows for the given user IDs (one row per active device token).
     *
     * @param  list<int>  $userIds
     * @return Collection<int, PushNotificationRecipient>
     */
    public function createRecipients(PushNotificationLog $log, array $userIds): Collection
    {
        $recipients = collect();

        DB::transaction(function () use ($log, $userIds, &$recipients) {
            foreach (array_unique($userIds) as $userId) {
                $tokens = $this->deviceTokenService->getActiveTokenRecords((int) $userId);

                if ($tokens->isEmpty()) {
                    $recipients->push(
                        PushNotificationRecipient::create([
                            'push_notification_log_id' => $log->id,
                            'recipient_user_id' => (int) $userId,
                            'device_token' => null,
                            'status' => PushNotificationRecipientStatus::Failed,
                            'failed_at' => now(),
                            'failure_reason' => 'No active device token',
                        ])
                    );

                    continue;
                }

                foreach ($tokens as $tokenRecord) {
                    $recipients->push(
                        PushNotificationRecipient::create([
                            'push_notification_log_id' => $log->id,
                            'recipient_user_id' => (int) $userId,
                            'device_token' => $tokenRecord->push_token,
                            'status' => PushNotificationRecipientStatus::Pending,
                        ])
                    );
                }
            }

            $log->update(['recipient_count' => $recipients->count()]);
            $this->recalculateCounts($log);
        });

        return $recipients;
    }

    /**
     * Send all pending recipients on a log and update statuses.
     *
     * @param  array<string, mixed>  $fcmData
     */
    public function sendLog(PushNotificationLog $log, array $fcmData = []): PushNotificationLog
    {
        $this->logProcessing($log);

        $title = $log->notification_title;
        $body = (string) ($log->notification_body ?? '');
        $clickAction = $log->deep_link ? url($log->deep_link) : url('/');

        $payload = $this->enrichPayloadWithOrganizationLogo(
            $log,
            array_merge($fcmData, [
                'notification_log_id' => (string) $log->id,
                'click_action' => $clickAction,
                'url' => $clickAction,
            ]),
        );

        $log->recipients()
            ->where('status', PushNotificationRecipientStatus::Pending)
            ->orderBy('id')
            ->chunkById(100, function ($recipients) use ($title, $body, $payload, $log) {
                foreach ($recipients as $recipient) {
                    $this->sendRecipient($recipient, $title, $body, $payload, $log);
                }
            });

        $log = $this->recalculateCounts($log->fresh());
        $this->finalizeLogStatus($log);

        return $log->fresh();
    }

    /**
     * @param  array<string, mixed>  $fcmData
     */
    private function sendRecipient(
        PushNotificationRecipient $recipient,
        string $title,
        string $body,
        array $fcmData,
        PushNotificationLog $log,
    ): void {
        if (! $recipient->device_token) {
            return;
        }

        if (! $this->deviceTokenService->isTokenValid($recipient->device_token, $recipient->recipient_user_id)) {
            $recipient->update([
                'status' => PushNotificationRecipientStatus::InvalidToken,
                'failed_at' => now(),
                'failure_reason' => 'Device token inactive',
                'firebase_error_code' => 'INVALID_TOKEN',
            ]);
            $this->recalculateCounts($log);

            return;
        }

        $tokenRecord = UserPushToken::query()
            ->where('push_token', $recipient->device_token)
            ->when($recipient->recipient_user_id, fn ($q) => $q->where('user_id', $recipient->recipient_user_id))
            ->first();

        $deviceType = $tokenRecord?->device_type ?? 'web';

        $recipientPayload = array_merge($fcmData, [
            'recipient_id' => (string) $recipient->id,
        ]);

        $maxAttempts = $this->errorClassifier->maxAttempts();
        $attempt = 0;
        $lastResult = null;
        $lastFailureReason = null;

        while ($attempt < $maxAttempts) {
            $attempt++;

            $result = $this->firebaseService->sendToDevice(
                $recipient->device_token,
                $title,
                $body,
                $recipientPayload,
                $deviceType,
            );

            if ($result['success'] ?? false) {
                $recipient->update([
                    'status' => PushNotificationRecipientStatus::Delivered,
                    'delivered_at' => now(),
                    'failed_at' => null,
                    'failure_reason' => null,
                    'firebase_error_code' => null,
                    'attempt_count' => $attempt,
                ]);

                if ($tokenRecord) {
                    $tokenRecord->last_used_at = now();
                    $tokenRecord->save();
                }

                $this->recalculateCounts($log);

                return;
            }

            $lastResult = $result;
            $errorCode = $this->errorClassifier->normalizeErrorCode($result['error_code'] ?? null);
            $lastFailureReason = $this->errorClassifier->mapFailureReason($result);

            $this->failureLogger->log($log, $recipient, $result, $attempt, $lastFailureReason);

            $recipient->update([
                'attempt_count' => $attempt,
                'firebase_error_code' => $errorCode !== '' ? $errorCode : null,
            ]);

            if ($this->errorClassifier->isPermanentTokenFailure($errorCode, $result)) {
                $this->deviceTokenService->markTokenInactive(
                    $recipient->device_token,
                    $recipient->recipient_user_id,
                    $lastFailureReason,
                );

                $this->markRecipientFailed($recipient, $lastFailureReason, $errorCode);

                $this->recalculateCounts($log);

                return;
            }

            if ($this->errorClassifier->isRetryable($errorCode, $lastFailureReason) && $attempt < $maxAttempts) {
                sleep($this->errorClassifier->retryDelaySeconds($attempt));

                continue;
            }

            break;
        }

        $this->markRecipientFailed(
            $recipient,
            $lastFailureReason ?? 'Firebase rejected payload',
            $this->errorClassifier->normalizeErrorCode($lastResult['error_code'] ?? null),
        );

        $this->recalculateCounts($log);
    }

    private function markRecipientFailed(
        PushNotificationRecipient $recipient,
        string $failureReason,
        ?string $errorCode = null,
    ): void {
        $recipient->update([
            'status' => $this->mapRecipientFailureStatus($failureReason),
            'failed_at' => now(),
            'failure_reason' => $failureReason,
            'firebase_error_code' => $errorCode !== '' && $errorCode !== null ? $errorCode : null,
        ]);
    }

    public function logSent(PushNotificationLog $log): PushNotificationLog
    {
        $log->update([
            'status' => PushNotificationLogStatus::Sent,
            'sent_at' => now(),
        ]);

        return $log->fresh();
    }

    public function logFailed(PushNotificationLog $log, ?string $reason = null): PushNotificationLog
    {
        $log->update([
            'status' => PushNotificationLogStatus::Failed,
            'sent_at' => $log->sent_at ?? now(),
        ]);

        if ($reason) {
            Log::warning('Push notification log marked failed', [
                'log_id' => $log->id,
                'reason' => $reason,
            ]);
        }

        return $log->fresh();
    }

    public function logOpened(PushNotificationRecipient $recipient): PushNotificationLog
    {
        if ($recipient->status === PushNotificationRecipientStatus::Opened) {
            return $recipient->log;
        }

        $recipient->update([
            'status' => PushNotificationRecipientStatus::Opened,
            'opened_at' => now(),
        ]);

        $log = $this->recalculateCounts($recipient->log()->first());

        if ($log->sent_count > 0 && ($log->opened_count + $log->failed_count) >= $log->recipient_count) {
            $log->update(['status' => PushNotificationLogStatus::Completed]);
        }

        return $log->fresh();
    }

    /**
     * Re-push eligible failed/pending recipients. Platform admin only (enforced by caller).
     *
     * @return array{repushed: int, skipped: int}
     */
    public function repushNotification(int $notificationLogId, bool $manualOverride = false): array
    {
        $log = PushNotificationLog::query()->findOrFail($notificationLogId);

        Log::info('Re-pushing notification', [
            'notification_log_id' => $log->id,
            'module' => $log->module_name,
            'organization_id' => $log->organization_id,
            'triggered_by' => auth()->id(),
            'manual_override' => $manualOverride,
        ]);

        $retryable = [
            PushNotificationRecipientStatus::Pending,
            PushNotificationRecipientStatus::Failed,
            PushNotificationRecipientStatus::InvalidToken,
        ];

        $repushed = 0;
        $skipped = 0;

        $log->recipients()
            ->whereIn('status', array_map(fn ($s) => $s->value, $retryable))
            ->orderBy('id')
            ->each(function (PushNotificationRecipient $recipient) use ($log, $manualOverride, &$repushed, &$skipped) {
                if ($this->repushRecipient($recipient, $manualOverride)) {
                    $repushed++;
                } else {
                    $skipped++;
                }
            });

        $log = $this->recalculateCounts($log->fresh());
        $this->finalizeLogStatus($log);

        return ['repushed' => $repushed, 'skipped' => $skipped];
    }

    public function repushRecipient(PushNotificationRecipient $recipient, bool $manualOverride = false): bool
    {
        if (! $this->canRepushRecipient($recipient, $manualOverride)) {
            return false;
        }

        $recipient->update([
            'status' => PushNotificationRecipientStatus::Pending,
            'failed_at' => null,
            'failure_reason' => null,
            'firebase_error_code' => null,
            'attempt_count' => 0,
            'delivered_at' => null,
        ]);

        $log = $recipient->log()->firstOrFail();
        $title = $log->notification_title;
        $body = (string) ($log->notification_body ?? '');
        $clickAction = $log->deep_link ? url($log->deep_link) : url('/');

        $payload = $this->enrichPayloadWithOrganizationLogo(
            $log,
            [
                'notification_log_id' => (string) $log->id,
                'click_action' => $clickAction,
                'url' => $clickAction,
            ],
        );

        $this->sendRecipient($recipient->fresh(), $title, $body, $payload, $log);

        return true;
    }

    public function canRepushRecipient(PushNotificationRecipient $recipient, bool $manualOverride = false): bool
    {
        if (! in_array($recipient->status, [
            PushNotificationRecipientStatus::Failed,
            PushNotificationRecipientStatus::InvalidToken,
            PushNotificationRecipientStatus::Pending,
        ], true)) {
            return false;
        }

        if (! $recipient->device_token) {
            return false;
        }

        if (! $this->deviceTokenService->isTokenValid($recipient->device_token, $recipient->recipient_user_id)) {
            return false;
        }

        if ($manualOverride) {
            return true;
        }

        return $this->errorClassifier->isRetryable(
            $recipient->firebase_error_code,
            $recipient->failure_reason,
        );
    }

    /**
     * Full dispatch flow: create log, recipients, send, update counts.
     *
     * @param  array{
     *     organization_id?: int|null,
     *     user_id?: int|null,
     *     module_name: string,
     *     module_record_id?: int|null,
     *     notification_title: string,
     *     notification_body?: string|null,
     *     audience_type?: string,
     *     deep_link?: string|null,
     *     created_by?: int|null,
     * }  $logData
     * @param  list<int>  $userIds
     * @param  array<string, mixed>  $fcmData
     */
    public function dispatch(array $logData, array $userIds, array $fcmData = []): PushNotificationLog
    {
        $log = DB::transaction(function () use ($logData, $userIds) {
            $log = $this->logCreated($logData);
            $this->createRecipients($log, $userIds);

            return $log->fresh();
        });

        try {
            return $this->sendLog($log, $fcmData);
        } catch (\Throwable $e) {
            Log::error('Push notification send failed after log was created', [
                'log_id' => $log->id,
                'error' => $e->getMessage(),
            ]);

            $this->logFailed($log->fresh(), $e->getMessage());

            throw $e;
        }
    }

    public function recalculateCounts(PushNotificationLog $log): PushNotificationLog
    {
        $counts = PushNotificationRecipient::query()
            ->where('push_notification_log_id', $log->id)
            ->selectRaw('
                SUM(CASE WHEN status IN (?, ?, ?) THEN 1 ELSE 0 END) as sent_count,
                SUM(CASE WHEN status IN (?, ?) THEN 1 ELSE 0 END) as delivered_count,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as opened_count,
                SUM(CASE WHEN status IN (?, ?, ?) THEN 1 ELSE 0 END) as failed_count
            ', [
                PushNotificationRecipientStatus::Sent->value,
                PushNotificationRecipientStatus::Delivered->value,
                PushNotificationRecipientStatus::Opened->value,
                PushNotificationRecipientStatus::Delivered->value,
                PushNotificationRecipientStatus::Opened->value,
                PushNotificationRecipientStatus::Opened->value,
                PushNotificationRecipientStatus::Failed->value,
                PushNotificationRecipientStatus::Unsubscribed->value,
                PushNotificationRecipientStatus::InvalidToken->value,
            ])
            ->first();

        $log->update([
            'sent_count' => (int) ($counts->sent_count ?? 0),
            'delivered_count' => (int) ($counts->delivered_count ?? 0),
            'opened_count' => (int) ($counts->opened_count ?? 0),
            'failed_count' => (int) ($counts->failed_count ?? 0),
            'recipient_count' => $log->recipients()->count(),
        ]);

        return $log->fresh();
    }

    private function finalizeLogStatus(PushNotificationLog $log): void
    {
        $log = $log->fresh();

        if ($log->recipient_count === 0) {
            $this->logFailed($log, 'No recipients');

            return;
        }

        if ($log->failed_count === $log->recipient_count) {
            $this->logFailed($log, 'All recipients failed');

            return;
        }

        if ($log->delivered_count > 0 || $log->sent_count > 0) {
            $this->logSent($log);

            if (($log->delivered_count + $log->failed_count) >= $log->recipient_count) {
                $log->update(['status' => PushNotificationLogStatus::Completed]);
            }
        }
    }

    private function mapRecipientFailureStatus(string $failureReason): PushNotificationRecipientStatus
    {
        return match ($failureReason) {
            'Invalid device token', 'Device token inactive' => PushNotificationRecipientStatus::InvalidToken,
            'User unsubscribed' => PushNotificationRecipientStatus::Unsubscribed,
            default => PushNotificationRecipientStatus::Failed,
        };
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function enrichPayloadWithOrganizationLogo(PushNotificationLog $log, array $payload): array
    {
        if (! empty($payload['organization_logo_url'])) {
            return $payload;
        }

        $organizationId = $log->organization_id ?? $this->resolveOrganizationIdFromSender($log->created_by);

        if (! $organizationId && ! empty($payload['campaign_id'])) {
            $organizationId = Campaign::query()
                ->whereKey((int) $payload['campaign_id'])
                ->value('organization_id');
        }

        if (! $organizationId && ! empty($payload['content_item_id'])) {
            $organizationId = ContentItem::query()
                ->whereKey((int) $payload['content_item_id'])
                ->value('organization_id');
        }

        if (! $organizationId) {
            return $payload;
        }

        $logoUrl = Organization::query()
            ->with('user:id,image,registered_user_image,user_id')
            ->whereKey($organizationId)
            ->first(['id', 'registered_user_image', 'user_id'])
            ?->logoUrl();

        if ($logoUrl) {
            $payload['organization_logo_url'] = $logoUrl;
        }

        return $payload;
    }

    private function resolveOrganizationIdFromSender(?int $userId): ?int
    {
        if (! $userId) {
            return null;
        }

        $user = User::query()->find($userId);

        return $user ? Organization::forAuthUser($user)?->id : null;
    }
}
