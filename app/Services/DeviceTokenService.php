<?php

namespace App\Services;

use App\Models\UserPushToken;

class DeviceTokenService
{
    public function storeToken($userId, $token, $deviceInfo = [])
    {
        return UserPushToken::updateOrCreate(
            [
                'user_id' => $userId,
                'device_id' => $deviceInfo['device_id'] ?? md5($token),
            ],
            [
                'push_token' => $token,
                'device_type' => $deviceInfo['device_type'] ?? 'web',
                'device_name' => $deviceInfo['device_name'] ?? 'Unknown',
                'browser' => $deviceInfo['browser'] ?? null,
                'platform' => $deviceInfo['platform'] ?? null,
                'last_used_at' => now(),
            ]
        );
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
