<?php

namespace App\Http\Controllers;

use App\Services\CourseUnityMeetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use App\Support\SessionDurationMinutes;

class CourseUnityMeetController extends BaseController
{
    public function prepare(Request $request, CourseUnityMeetService $unityMeet): JsonResponse
    {
        $this->authorizePermission($request, 'course.create');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'required|date',
            'start_time' => 'required|date_format:H:i',
            'session_duration_minutes' => ['required', 'integer', Rule::in(SessionDurationMinutes::VALUES)],
            'max_participants' => 'required|integer|min:1|max:100',
            'format' => ['required', Rule::in(['online', 'in_person', 'hybrid'])],
            'unity_meet_livestream_kind' => 'nullable|in:organization,user',
            'unity_meet_livestream_id' => 'nullable|integer|min:1',
        ]);

        if (! $unityMeet->usesUnityMeet($validated['format'])) {
            return response()->json([
                'message' => 'Unity Meet is only used for online or hybrid listings.',
            ], 422);
        }

        try {
            $payload = $unityMeet->prepareScheduledMeeting(
                $request->user(),
                $validated,
                $validated['unity_meet_livestream_kind'] ?? null,
                isset($validated['unity_meet_livestream_id']) ? (int) $validated['unity_meet_livestream_id'] : null,
            );

            return response()->json([
                'success' => true,
                'meeting' => $payload,
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Throwable $e) {
            Log::error('Failed to prepare Unity Meet for Connection Hub listing', [
                'user_id' => $request->user()?->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create Unity Meet meeting. Please try again.',
            ], 500);
        }
    }
}
