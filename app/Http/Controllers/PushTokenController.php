<?php

namespace App\Http\Controllers;

use App\Services\DeviceTokenService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class PushTokenController extends Controller
{
    /**
     * Store or update push token for the authenticated user
     */
    public function store(Request $request)
    {
        $request->validate([
            'token' => 'required|string',
            'device_info' => 'sometimes|array',
            'device_info.device_type' => 'sometimes|string|in:web,android,ios,mobile',
            'device_info.device_id' => 'sometimes|string|max:255',
            'device_info.device_name' => 'sometimes|string|max:255',
            'device_info.platform' => 'sometimes|string|max:255',
            'device_info.browser' => 'sometimes|nullable|string|max:255',
        ]);

        try {
            $user = Auth::user();

            if (! $user) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            $deviceInfo = $request->device_info ?? [];
            $deviceTokenService = app(DeviceTokenService::class);

            $deviceTokenService->storeToken(
                $user->id,
                $request->token,
                $deviceInfo
            );

            // Keep legacy users.push_token in sync for UI that checks auth.user.push_token
            $user->forceFill(['push_token' => $request->token])->save();

            Log::info('Push token updated', [
                'user_id' => $user->id,
                'device_id' => $deviceInfo['device_id'] ?? null,
                'device_type' => $deviceInfo['device_type'] ?? 'web',
                'token' => substr($request->token, 0, 20).'...',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Push token saved successfully',
                'has_push_device' => true,
            ]);
        } catch (\Exception $e) {
            Log::error('Error saving push token: '.$e->getMessage());

            return response()->json([
                'error' => 'Failed to save push token',
            ], 500);
        }
    }

    /**
     * Remove push token for the current device (user opted out or logging out)
     */
    public function destroy(Request $request)
    {
        try {
            $user = Auth::user();

            if (! $user) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            $deviceInfo = $request->device_info ?? [];
            $deviceId = $request->input('device_id') ?? ($deviceInfo['device_id'] ?? null);

            if (! $deviceId) {
                return response()->json(['error' => 'device_id is required'], 422);
            }

            $deviceTokenService = app(DeviceTokenService::class);
            $deviceTokenService->removeDevice($user->id, $deviceId);
            $deviceTokenService->syncLegacyPushToken($user->id);

            Log::info('Push token removed for device', [
                'user_id' => $user->id,
                'device_id' => $deviceId,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Push token removed',
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting push token: '.$e->getMessage());

            return response()->json([
                'error' => 'Failed to delete push token',
            ], 500);
        }
    }
}
