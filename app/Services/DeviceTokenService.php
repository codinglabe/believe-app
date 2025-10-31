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
            ->pluck('push_token')
            ->toArray();
    }
}
