<?php

namespace App\Http\Controllers;

use App\Models\OrganizationLivestream;
use App\Models\UserLivestream;
use App\Services\ParticipationActivityService;
use App\Support\BrpParticipationModule;
use App\Support\LivestreamMeetingPresence;
use App\Support\UnityLiveBroadcast;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class LivestreamMeetingPresenceController extends Controller
{
    private const JOINABLE_STATUSES = ['draft', 'meeting_live', 'live', 'starting'];

    public function join(Request $request, string $roomName): JsonResponse
    {
        $validated = $request->validate([
            'sessionId' => ['required', 'string', 'max:64'],
            'displayName' => ['required', 'string', 'max:120'],
            'email' => ['nullable', 'email', 'max:255'],
        ]);

        [$kind, $livestream] = $this->resolveLivestream($roomName);

        if (! in_array($livestream->status, self::JOINABLE_STATUSES, true)) {
            throw ValidationException::withMessages([
                'room' => 'This meeting is not open for participants right now.',
            ]);
        }

        $authUser = $request->user();
        $email = $validated['email'] ?? $authUser?->email;
        $name = trim($validated['displayName']);
        if ($name === '' && $authUser?->name) {
            $name = (string) $authUser->name;
        }

        LivestreamMeetingPresence::join($kind, $livestream->id, [
            'sessionId' => $validated['sessionId'],
            'name' => $name !== '' ? $name : 'Guest',
            'email' => $email,
            'userId' => $authUser?->id,
        ]);

        UnityLiveBroadcast::notifyHostDashboard($livestream, 'participant_joined');

        return response()->json(['ok' => true]);
    }

    public function heartbeat(Request $request, string $roomName): JsonResponse
    {
        $validated = $request->validate([
            'sessionId' => ['required', 'string', 'max:64'],
        ]);

        [$kind, $livestream] = $this->resolveLivestream($roomName);

        if (! in_array($livestream->status, self::JOINABLE_STATUSES, true)) {
            return response()->json(['ok' => false], 409);
        }

        LivestreamMeetingPresence::heartbeat($kind, $livestream->id, $validated['sessionId']);

        return response()->json(['ok' => true]);
    }

    public function leave(Request $request, string $roomName): JsonResponse
    {
        $validated = $request->validate([
            'sessionId' => ['required', 'string', 'max:64'],
        ]);

        [$kind, $livestream] = $this->resolveLivestream($roomName);

        LivestreamMeetingPresence::leave($kind, $livestream->id, $validated['sessionId']);
        UnityLiveBroadcast::notifyHostDashboard($livestream, 'participant_left');

        if ($authUser = $request->user()) {
            ParticipationActivityService::complete(
                $authUser,
                BrpParticipationModule::UNITY_MEET,
                $livestream->id,
                'Participation reward for Unity Meet participation',
                [
                    'livestream_id' => $livestream->id,
                    'room_name' => $roomName,
                    'kind' => $kind,
                ],
                referenceType: $kind,
            );
        }

        return response()->json(['ok' => true]);
    }

    /**
     * @return array{0: 'user'|'organization', 1: UserLivestream|OrganizationLivestream}
     */
    private function resolveLivestream(string $roomName): array
    {
        $orgStream = OrganizationLivestream::query()
            ->where('room_name', $roomName)
            ->first();

        if ($orgStream) {
            return ['organization', $orgStream];
        }

        $userStream = UserLivestream::query()
            ->where('room_name', $roomName)
            ->first();

        if ($userStream) {
            return ['user', $userStream];
        }

        abort(404, 'Meeting not found.');
    }
}
