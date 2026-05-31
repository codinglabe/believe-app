<?php

namespace App\Services;

use App\Models\UserPushToken;

class DeviceTokenService
{
    public function storeToken($userId, $token, $deviceInfo = [])
    {
        $deviceId = $deviceInfo['device_id'] ?? md5($token);

        // Deactivate duplicate rows that share the same FCM token under a different device_id.
        UserPushToken::where('user_id', $userId)
            ->where('push_token', $token)
            ->where('device_id', '!=', $deviceId)
            ->update([
                'is_active' => false,
                'status' => UserPushToken::STATUS_INVALID,
            ]);

        return UserPushToken::updateOrCreate(
            [
                'user_id' => $userId,
                'device_id' => $deviceId,
            ],
            [
                'push_token' => $token,
                'device_type' => $deviceInfo['device_type'] ?? 'web',
                'device_name' => $deviceInfo['device_name'] ?? 'Unknown',
                'browser' => $deviceInfo['browser'] ?? null,
                'platform' => $deviceInfo['platform'] ?? null,
                'is_active' => true,
                'status' => UserPushToken::STATUS_ACTIVE,
                'last_error' => null,
                'last_error_at' => null,
                'needs_reregister' => false,
                'last_used_at' => now(),
            ]
        );
    }

    public function removeDevice($userId, $deviceId)
    {
        return UserPushToken::where('user_id', $userId)
            ->where('device_id', $deviceId)
            ->delete();
    }

    public function syncLegacyPushToken($userId): void
    {
        $latest = UserPushToken::where('user_id', $userId)
            ->where('is_active', true)
            ->where('status', UserPushToken::STATUS_ACTIVE)
            ->orderByDesc('last_used_at')
            ->value('push_token');

        \App\Models\User::where('id', $userId)->update(['push_token' => $latest]);
    }

    public function removeToken($userId, $token)
    {
        return UserPushToken::where('user_id', $userId)
            ->where('push_token', $token)
            ->delete();
    }

    public function getUserTokens($userId)
    {
        return UserPushToken::where('user_id', $userId)
            ->where('is_active', true)
            ->where('status', UserPushToken::STATUS_ACTIVE)
            ->pluck('push_token')
            ->toArray();
    }

    /**
     * Get active token records for a user (for sending + logging + status updates).
     *
     * @return \Illuminate\Database\Eloquent\Collection<int, UserPushToken>
     */
    public function getActiveTokenRecords($userId)
    {
        return UserPushToken::where('user_id', $userId)
            ->where('is_active', true)
            ->where('status', UserPushToken::STATUS_ACTIVE)
            ->get();
    }
}
