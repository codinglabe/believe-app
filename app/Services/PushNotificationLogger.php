<?php

namespace App\Services;

use App\Enums\PushNotificationLogStatus;
use App\Enums\PushNotificationRecipientStatus;
use App\Models\PushNotificationLog;
use App\Models\PushNotificationRecipient;
use App\Models\UserPushToken;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PushNotificationLogger
{
    public function __construct(
        private readonly FirebaseService $firebaseService,
        private readonly DeviceTokenService $deviceTokenService,
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
            'created_by' => $data['created_by'] ?? auth()->id(),
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

        $payload = array_merge($fcmData, [
            'notification_log_id' => (string) $log->id,
            'click_action' => $clickAction,
            'url' => $clickAction,
        ]);

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

        $tokenRecord = UserPushToken::query()
            ->where('push_token', $recipient->device_token)
            ->when($recipient->recipient_user_id, fn ($q) => $q->where('user_id', $recipient->recipient_user_id))
            ->first();

        $deviceType = $tokenRecord?->device_type ?? 'web';

        $recipientPayload = array_merge($fcmData, [
            'recipient_id' => (string) $recipient->id,
        ]);

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
            ]);

            if ($tokenRecord) {
                $tokenRecord->last_used_at = now();
                $tokenRecord->save();
            }
        } else {
            $failureReason = $this->mapFailureReason($result);

            $recipient->update([
                'status' => $this->mapRecipientFailureStatus($failureReason),
                'failed_at' => now(),
                'failure_reason' => $failureReason,
            ]);

            $errorCode = strtoupper((string) ($result['error_code'] ?? ''));
            $errorMessage = strtoupper((string) data_get($result, 'response.error.message', ''));
            $isPermanentTokenFailure = in_array($errorCode, ['UNREGISTERED', 'NOT_FOUND'], true)
                || ($errorCode === 'INVALID_ARGUMENT' && str_contains($errorMessage, 'SENDERID'));

            if ($tokenRecord && $isPermanentTokenFailure) {
                $tokenRecord->status = UserPushToken::STATUS_INVALID;
                $tokenRecord->is_active = false;
                $tokenRecord->needs_reregister = true;
                $tokenRecord->last_error = $failureReason;
                $tokenRecord->last_error_at = now();
                $tokenRecord->save();
            }
        }

        $this->recalculateCounts($log);
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
     * Re-push pending/failed recipients. Platform admin only (enforced by caller).
     */
    public function repushNotification(int $notificationLogId): PushNotificationLog
    {
        $log = PushNotificationLog::query()->findOrFail($notificationLogId);

        Log::info('Re-pushing notification', [
            'notification_log_id' => $log->id,
            'module' => $log->module_name,
            'organization_id' => $log->organization_id,
            'triggered_by' => auth()->id(),
        ]);

        $retryable = [PushNotificationRecipientStatus::Pending, PushNotificationRecipientStatus::Failed];

        $log->recipients()
            ->whereIn('status', array_map(fn ($s) => $s->value, $retryable))
            ->update([
                'status' => PushNotificationRecipientStatus::Pending,
                'failed_at' => null,
                'failure_reason' => null,
            ]);

        return $this->sendLog($log->fresh());
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
        return DB::transaction(function () use ($logData, $userIds, $fcmData) {
            $log = $this->logCreated($logData);
            $this->createRecipients($log, $userIds);

            return $this->sendLog($log->fresh(), $fcmData);
        });
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

    /**
     * @param  array{success?: bool, error_code?: ?string, response?: ?array}  $result
     */
    private function mapFailureReason(array $result): string
    {
        $code = strtoupper((string) ($result['error_code'] ?? ''));

        return match (true) {
            in_array($code, ['UNREGISTERED', 'NOT_FOUND', 'INVALID_ARGUMENT'], true) => 'Invalid device token',
            str_contains($code, 'PAYLOAD') || str_contains($code, 'SIZE') => 'Payload too large',
            str_contains($code, 'UNAVAILABLE') || str_contains($code, 'UNREACHABLE') => 'Device not reachable',
            $code === 'NO_ACCESS_TOKEN' => 'Firebase rejected payload',
            default => is_array($result['response'] ?? null)
                ? ($result['response']['error']['message'] ?? 'Firebase rejected payload')
                : 'Firebase rejected payload',
        };
    }

    private function mapRecipientFailureStatus(string $failureReason): PushNotificationRecipientStatus
    {
        return match ($failureReason) {
            'Invalid device token' => PushNotificationRecipientStatus::InvalidToken,
            'User unsubscribed' => PushNotificationRecipientStatus::Unsubscribed,
            default => PushNotificationRecipientStatus::Failed,
        };
    }
}
