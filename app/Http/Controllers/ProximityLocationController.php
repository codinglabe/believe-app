<?php

namespace App\Http\Controllers;

use App\Services\ProximityNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProximityLocationController extends Controller
{
    public function store(Request $request, ProximityNotificationService $proximityService): JsonResponse
    {
        $validated = $request->validate([
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $user = $request->user();
        if ($user === null) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        if ($user->proximity_notifications_enabled === false) {
            return response()->json([
                'success' => true,
                'processed' => false,
                'notified' => 0,
                'message' => 'Proximity notifications are disabled.',
            ]);
        }

        $result = $proximityService->processUserLocation(
            $user,
            (float) $validated['latitude'],
            (float) $validated['longitude'],
        );

        return response()->json([
            'success' => true,
            'processed' => $result['processed'],
            'notified' => $result['notified'],
        ]);
    }
}
