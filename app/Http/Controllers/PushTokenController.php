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
            'device_info' => 'sometimes|array'
        ]);

        try {
            $user = Auth::user();

            if (!$user) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            // Update user's push token
            // $user->update([
            //     'push_token' => $request->token,
            // ]);

            $deviceInfo = $request->device_info ?? [];

            app(DeviceTokenService::class)->storeToken(
                $user->id,
                $request->token,
                $deviceInfo
            );

            Log::info('Push token updated', [
                'user_id' => $user->id,
                'token' => substr($request->token, 0, 20) . '...',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Push token saved successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('Error saving push token: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to save push token',
            ], 500);
        }
    }

    /**
     * Delete push token (user opted out)
     */
    // public function destroy(Request $request)
    // {
    //     try {
    //         $user = Auth::user();

    //         if (!$user) {
    //             return response()->json(['error' => 'Unauthorized'], 401);
    //         }

    //         $user->update([
    //             'push_token' => null,
    //         ]);

    //         Log::info('Push token deleted', ['user_id' => $user->id]);

    //         app(DeviceTokenService::class)->removeToken($user->id, $token);

    //         return response()->json([
    //             'success' => true,
    //             'message' => 'Push token removed',
    //         ]);
    //     } catch (\Exception $e) {
    //         Log::error('Error deleting push token: ' . $e->getMessage());
    //         return response()->json([
    //             'error' => 'Failed to delete push token',
    //         ], 500);
    //     }
    // }
}
