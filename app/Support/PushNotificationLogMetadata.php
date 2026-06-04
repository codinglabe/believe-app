<?php

namespace App\Support;

use App\Enums\PushNotificationModule;
use App\Models\ChatMessage;
use App\Models\PushNotificationLog;
use App\Models\User;

final class PushNotificationLogMetadata
{
    public static function looksLikeChat(string $title, ?string $body, ?string $deepLink = null): bool
    {
        if ($title === 'New Message') {
            return true;
        }

        $body = (string) $body;

        if ($body !== '' && preg_match('/^New message from .+/i', $body)) {
            return true;
        }

        if ($body !== '' && preg_match('/^[^:]+: .+/', $body) && $title !== '' && $title !== 'New Message') {
            return true;
        }

        if ($deepLink && (str_contains($deepLink, '/chat') || str_contains($deepLink, 'chat.index'))) {
            return true;
        }

        return false;
    }

    public static function resolveModuleName(PushNotificationLog $log): string
    {
        if ($log->module_name !== PushNotificationModule::System->value) {
            return $log->module_name;
        }

        if (self::looksLikeChat(
            $log->notification_title,
            $log->notification_body,
            $log->deep_link,
        )) {
            return PushNotificationModule::Chat->value;
        }

        if ($log->notification_title === (string) config('daily_engagement.title', config('app.name'))
            || str_contains((string) $log->notification_body, 'daily engagement')) {
            return PushNotificationModule::DailyEngagement->value;
        }

        return $log->module_name;
    }

    public static function resolveSenderUserId(PushNotificationLog $log): ?int
    {
        if ($log->created_by) {
            return (int) $log->created_by;
        }

        $body = (string) $log->notification_body;

        if ($log->module_record_id && self::resolveModuleName($log) === PushNotificationModule::Chat->value) {
            $byMessageId = ChatMessage::query()
                ->find($log->module_record_id, ['user_id']);

            if ($byMessageId?->user_id) {
                return (int) $byMessageId->user_id;
            }

            $senderName = self::parseSenderNameFromBody($body, $log->notification_title);

            $roomMessage = ChatMessage::query()
                ->where('chat_room_id', $log->module_record_id)
                ->when($senderName, fn ($q) => $q->whereHas(
                    'user',
                    fn ($uq) => $uq->where('name', $senderName),
                ))
                ->latest('id')
                ->first(['user_id']);

            if ($roomMessage?->user_id) {
                return (int) $roomMessage->user_id;
            }
        }

        $name = self::parseSenderNameFromBody($body, $log->notification_title);

        if (! $name) {
            return null;
        }

        $userId = User::query()->where('name', $name)->value('id');

        return $userId ? (int) $userId : null;
    }

    public static function parseSenderNameFromBody(?string $body, ?string $title = null): ?string
    {
        $body = trim((string) $body);

        if ($body !== '' && preg_match('/^New message from (.+)$/i', $body, $matches)) {
            return trim($matches[1]);
        }

        if ($body !== '' && preg_match('/^([^:]+): .+/', $body, $matches)) {
            $candidate = trim($matches[1]);

            if ($title && $candidate === $title) {
                return $candidate;
            }

            if ($title && $candidate !== $title) {
                return $candidate;
            }

            return $candidate;
        }

        return null;
    }

    /**
     * @return array{id: int|null, name: string, role: string|null, role_label: string}|null
     */
    public static function creatorPayload(PushNotificationLog $log): ?array
    {
        if ($log->relationLoaded('creator') && $log->creator) {
            return [
                'id' => $log->creator->id,
                'name' => $log->creator->name,
                'role' => $log->creator->role,
                'role_label' => PushNotificationLog::userRoleLabel($log->creator->role),
            ];
        }

        if ($log->created_by) {
            $user = User::query()->find($log->created_by, ['id', 'name', 'role']);
            if ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'role' => $user->role,
                    'role_label' => PushNotificationLog::userRoleLabel($user->role),
                ];
            }
        }

        $senderName = self::parseSenderNameFromBody(
            $log->notification_body,
            $log->notification_title,
        );

        if ($senderName) {
            $user = User::query()->where('name', $senderName)->first(['id', 'name', 'role']);
            if ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'role' => $user->role,
                    'role_label' => PushNotificationLog::userRoleLabel($user->role),
                ];
            }

            return [
                'id' => null,
                'name' => $senderName,
                'role' => null,
                'role_label' => 'Sender',
            ];
        }

        $senderId = self::resolveSenderUserId($log);

        if ($senderId) {
            $user = User::query()->find($senderId, ['id', 'name', 'role']);
            if ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'role' => $user->role,
                    'role_label' => PushNotificationLog::userRoleLabel($user->role),
                ];
            }
        }

        if (self::resolveModuleName($log) === PushNotificationModule::DailyEngagement->value) {
            return [
                'id' => null,
                'name' => 'Platform',
                'role' => null,
                'role_label' => 'Automated',
            ];
        }

        return null;
    }

    public static function moduleLabel(PushNotificationLog $log): string
    {
        $module = self::resolveModuleName($log);

        return PushNotificationModule::labels()[$module]
            ?? ucfirst(str_replace('_', ' ', $module));
    }

    /**
     * @return array{module_name: string, created_by: int|null}
     */
    public static function persistableCorrections(PushNotificationLog $log): array
    {
        $module = self::resolveModuleName($log);
        $createdBy = self::resolveSenderUserId($log);

        $updates = [];

        if ($module !== $log->module_name) {
            $updates['module_name'] = $module;
        }

        if ($createdBy && ! $log->created_by) {
            $updates['created_by'] = $createdBy;
        }

        return $updates;
    }
}
