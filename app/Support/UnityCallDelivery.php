<?php

namespace App\Support;

use App\Models\UnityCallParticipant;
use Illuminate\Support\Facades\Cache;

class UnityCallDelivery
{
    public static function cacheKey(int $callId, int $userId): string
    {
        return "unity_call:{$callId}:incoming_delivered:{$userId}";
    }

    public static function markDelivered(int $callId, int $userId): bool
    {
        $key = self::cacheKey($callId, $userId);
        if (Cache::get($key)) {
            return false;
        }

        Cache::put($key, true, now()->addMinutes(10));

        return true;
    }

    public static function isDelivered(int $callId, int $userId): bool
    {
        return (bool) Cache::get(self::cacheKey($callId, $userId), false);
    }

    public static function participantIncomingDelivered(UnityCallParticipant $participant): bool
    {
        if ($participant->role !== UnityCallParticipant::ROLE_CALLEE) {
            return false;
        }

        if ($participant->status !== UnityCallParticipant::STATUS_RINGING) {
            return false;
        }

        return self::isDelivered($participant->unity_call_id, $participant->user_id);
    }
}
