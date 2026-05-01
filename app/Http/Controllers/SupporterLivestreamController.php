<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\OrganizationLivestream;
use App\Models\User;
use App\Models\UserLivestream;
use App\Services\DropboxOAuthService;
use App\Services\DropboxOrgApi;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Supporter livestream — same flow as organization livestreams (VDO.Ninja): index, create, edit, delete, room page.
 */
class SupporterLivestreamController extends Controller
{
    private function getUnityMeetingId(Request $request): string
    {
        $user = $request->user();
        $slugPart = trim((string) ($user->slug ?? ''));
        if ($slugPart === '') {
            $slugPart = Str::slug((string) $user->name) ?: 'supporter';
        }
        return 'uni-'.$slugPart.'-'.$user->id;
    }

    public function index(Request $request): Response
    {
        $meetingsView = $request->query('view') === 'meetings';
        $meetingsTab = (string) $request->query('tab', 'upcoming');
        if (! in_array($meetingsTab, ['upcoming', 'past'], true)) {
            $meetingsTab = 'upcoming';
        }

        $query = UserLivestream::where('user_id', $request->user()->id);

        if ($meetingsView) {
            if ($meetingsTab === 'past') {
                $query->where(function ($q) {
                    $q->whereIn('status', ['ended', 'cancelled'])
                        ->orWhere(function ($q2) {
                            $q2->where('status', 'scheduled')
                                ->whereNotNull('scheduled_at')
                                ->where('scheduled_at', '<', now());
                        });
                })
                    ->orderByDesc('ended_at')
                    ->orderByDesc('scheduled_at')
                    ->orderByDesc('created_at');
            } else {
                $query->where(function ($q) {
                    $q->whereIn('status', ['draft', 'meeting_live', 'live'])
                        ->orWhere(function ($q2) {
                            $q2->where('status', 'scheduled')
                                ->where(function ($q3) {
                                    $q3->whereNull('scheduled_at')
                                        ->orWhere('scheduled_at', '>=', now());
                                });
                        });
                })
                    ->orderByRaw('CASE WHEN scheduled_at IS NULL THEN 1 ELSE 0 END')
                    ->orderBy('scheduled_at', 'asc')
                    ->orderByDesc('created_at');
            }
        } else {
            $query->orderByDesc('created_at');
        }

        $livestreams = $query
            ->paginate(20)
            ->through(function (UserLivestream $livestream) {
                return [
                    'id' => $livestream->id,
                    'title' => $livestream->title,
                    'roomName' => $livestream->room_name,
                    'status' => $livestream->status,
                    'isPublic' => (bool) $livestream->is_public,
                    'scheduledAt' => $livestream->scheduled_at?->toIso8601String(),
                    'startedAt' => $livestream->started_at?->toIso8601String(),
                    'endedAt' => $livestream->ended_at?->toIso8601String(),
                    'createdAt' => $livestream->created_at->toIso8601String(),
                    'directorUrl' => $livestream->getDirectorUrl(false),
                    'joinUrl' => url('/livestreams/join/'.$livestream->room_name),
                ];
            });

        return Inertia::render('frontend/livestreams/Index', [
            'livestreams' => $livestreams,
            'meetingsView' => $meetingsView,
            'meetingsTab' => $meetingsView ? $meetingsTab : null,
        ]);
    }

    public function create(Request $request): Response
    {
        $user = $request->user();
        $organization = $user->organization ?? Organization::where('user_id', $user->id)->first();
        $defaultDisplayName = $organization?->name ?: ($user->name ?? '');
        return Inertia::render('frontend/livestreams/Create', [
            'authUserDisplayName' => $defaultDisplayName,
            'unityMeetingId' => $this->getUnityMeetingId($request),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'title' => 'nullable|string|max:255',
            'display_name' => 'nullable|string|max:255',
            'is_public' => 'nullable|boolean',
            'require_passcode' => 'nullable|boolean',
            'passcode' => 'nullable|string|min:6|max:100',
            'record_meeting' => 'nullable|boolean',
        ]);

        $user = $request->user();
        $roomName = $this->getUnityMeetingId($request);
        $requirePasscode = $request->boolean('require_passcode', true);
        $password = $requirePasscode
            ? (string) ($request->input('passcode') ?: UserLivestream::generatePassword())
            : '';
        $encryptedPassword = Crypt::encryptString($password);

        $displayName = $request->filled('display_name') ? $request->display_name : ($user->name ?? null);
        $settings = [];
        if ($displayName !== null && $displayName !== '') {
            $settings['display_name'] = $displayName;
        }
        $settings['record_meeting'] = $request->boolean('record_meeting', true);
        $settings['require_passcode'] = $requirePasscode;

        // Meeting ID is fixed per supporter. Reuse the same draft record instead of creating duplicates.
        $livestream = UserLivestream::firstOrNew([
            'user_id' => $user->id,
            'room_name' => $roomName,
        ]);
        $livestream->fill([
            'room_password' => $encryptedPassword,
            'status' => 'draft',
            'is_public' => $request->boolean('is_public', true),
            'title' => $request->title,
            'settings' => $settings ?: null,
        ]);
        $livestream->save();

        return redirect()->route('livestreams.supporter.ready', $livestream->id)
            ->with('success', 'Meeting ready!');
    }

    /**
     * Schedule a meeting (supporter flow): saves scheduled_at and participant email.
     */
    public function schedule(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'display_name' => 'nullable|string|max:255',
            'is_public' => 'nullable|boolean',
            'require_passcode' => 'nullable|boolean',
            'passcode' => 'nullable|string|min:6|max:100',
            'record_meeting' => 'nullable|boolean',
            'schedule_date' => 'required|date_format:Y-m-d',
            'schedule_time' => 'required|date_format:H:i',
            // Accept multiple participants (tagify-like): send as array of emails.
            'participant_emails' => 'required|array|min:1|max:50',
            'participant_emails.*' => 'required|email|max:255',
            // Backward compatibility for older clients sending a single email string.
            'participant_email' => 'nullable|email|max:255',
        ]);

        $user = $request->user();
        $roomName = $this->getUnityMeetingId($request);

        $scheduledAt = Carbon::createFromFormat(
            'Y-m-d H:i',
            $validated['schedule_date'].' '.$validated['schedule_time'],
            config('app.timezone')
        );
        if (! $scheduledAt || $scheduledAt->isPast()) {
            return back()->withErrors(['schedule_date' => 'Schedule time must be in the future.'])->withInput();
        }

        $requirePasscode = $request->boolean('require_passcode', true);
        $password = $requirePasscode
            ? (string) ($request->input('passcode') ?: UserLivestream::generatePassword())
            : '';
        $encryptedPassword = Crypt::encryptString($password);

        $displayName = $request->filled('display_name') ? (string) $request->display_name : ($user->name ?? null);
        $settings = [];
        if ($displayName !== null && $displayName !== '') {
            $settings['display_name'] = $displayName;
        }
        $settings['record_meeting'] = $request->boolean('record_meeting', true);
        $settings['require_passcode'] = $requirePasscode;
        $emails = $validated['participant_emails'] ?? [];
        if (empty($emails) && ! empty($validated['participant_email'])) {
            $emails = [(string) $validated['participant_email']];
        }
        $emails = array_values(array_unique(array_filter(array_map('strval', $emails))));
        $settings['participant_emails'] = $emails;

        $livestream = UserLivestream::firstOrNew([
            'user_id' => $user->id,
            'room_name' => $roomName,
        ]);
        $livestream->fill([
            'room_password' => $encryptedPassword,
            'status' => 'scheduled',
            'is_public' => $request->boolean('is_public', true),
            'title' => $request->input('title'),
            'scheduled_at' => $scheduledAt,
            'settings' => $settings ?: null,
        ]);
        $livestream->save();

        return redirect()->route('livestreams.supporter.ready', $livestream->id)
            ->with('success', 'Meeting scheduled!');
    }

    /**
     * Show the "Join a meeting" page — enter meeting ID and passcode (no link).
     */
    public function joinPage(Request $request): Response
    {
        $errors = $request->session()->get('errors');
        $errorBag = $errors ? $errors->getBag('default')->getMessages() : [];

        return Inertia::render('frontend/livestreams/Join', [
            'oldMeetingId' => $request->old('meeting_id'),
            'errors' => $errorBag,
        ]);
    }

    /**
     * Join with meeting ID + passcode. Validates passcode then renders the guest join page.
     */
    public function joinWithPasscode(Request $request): Response|RedirectResponse
    {
        $request->validate([
            'meeting_id' => 'required|string|max:100',
            'passcode' => 'nullable|string|max:100',
        ]);

        $roomName = trim($request->input('meeting_id'));
        $passcode = (string) $request->input('passcode', '');

        $orgStream = OrganizationLivestream::where('room_name', $roomName)
            ->whereIn('status', ['draft', 'scheduled', 'meeting_live', 'live', 'ended'])
            ->with('organization')
            ->first();

        if ($orgStream) {
            $password = $orgStream->getDecryptedPassword();
            if ($password !== '' && $password !== $passcode) {
                return redirect()->route('livestreams.supporter.join')
                    ->withInput($request->only('meeting_id'))
                    ->withErrors(['passcode' => 'Invalid meeting ID or passcode.']);
            }
            $participantUrl = $orgStream->getParticipantUrl();
            return Inertia::render('frontend/livestreams/Join', [
                'livestream' => [
                    'id' => $orgStream->id,
                    'title' => $orgStream->title,
                    'description' => $orgStream->description,
                    'roomName' => $orgStream->room_name,
                    'roomPassword' => $password,
                    'participantUrl' => $participantUrl,
                    'status' => $orgStream->status,
                ],
                'organization' => [
                    'id' => $orgStream->organization->id,
                    'name' => $orgStream->organization->name,
                ],
            ]);
        }

        $userStream = UserLivestream::where('room_name', $roomName)
            ->whereIn('status', ['draft', 'scheduled', 'meeting_live', 'live', 'ended'])
            ->with('user')
            ->first();

        if ($userStream) {
            $password = $userStream->getDecryptedPassword();
            if ($password !== '' && $password !== $passcode) {
                return redirect()->route('livestreams.supporter.join')
                    ->withInput($request->only('meeting_id'))
                    ->withErrors(['passcode' => 'Invalid meeting ID or passcode.']);
            }
            $participantUrl = $userStream->getParticipantUrl();
            return Inertia::render('frontend/livestreams/Join', [
                'livestream' => [
                    'id' => $userStream->id,
                    'title' => $userStream->title,
                    'description' => $userStream->description,
                    'roomName' => $userStream->room_name,
                    'roomPassword' => $password,
                    'participantUrl' => $participantUrl,
                    'status' => $userStream->status,
                ],
                'organization' => [
                    'id' => 0,
                    'name' => $userStream->user?->name ?? 'Meeting',
                ],
            ]);
        }

        return redirect()->route('livestreams.supporter.join')
            ->withInput($request->only('meeting_id'))
            ->withErrors(['meeting_id' => 'Meeting not found or not available to join.']);
    }

    public function ready(Request $request, int $id): Response
    {
        $livestream = UserLivestream::where('user_id', $request->user()->id)->findOrFail($id);
        $password = $livestream->getDecryptedPassword();
        $joinUrl = url('/livestreams/join/' . $livestream->room_name);

        return Inertia::render('frontend/livestreams/Ready', [
            'livestream' => [
                'id' => $livestream->id,
                'title' => $livestream->title,
                'roomName' => $livestream->room_name,
                'roomPassword' => $password,
                'joinUrl' => $joinUrl,
            ],
        ]);
    }

    public function show(Request $request, int $id): Response
    {
        $livestream = UserLivestream::where('user_id', $request->user()->id)->with('user')->findOrFail($id);

        $dropboxConnected = ! empty($request->user()->dropbox_refresh_token);
        $password = $livestream->getDecryptedPassword();
        $directorUrl = $livestream->getDirectorUrl(false);
        $directorUrlDropbox = $dropboxConnected ? $livestream->getDirectorUrl(true) : null;
        $participantUrl = $livestream->getParticipantUrl();
        $hostPushUrl = $livestream->getHostPushUrl(false);
        $hostPushUrlDropbox = $dropboxConnected ? $livestream->getHostPushUrl(true) : null;
        $watchUrl = $livestream->getPublicViewUrl();
        $unityLiveUrl = url('/unity-live/' . $livestream->room_name);
        $liveViewerUrl = url('/live/' . $livestream->room_name);
        $joinUrl = url('/livestreams/join/' . $livestream->room_name);

        $vdoRoom = $livestream->getVdoRoomName();
        $passwordParam = $password !== '' ? '&password=' . rawurlencode($password) : '';
        $settings = $livestream->settings ?? [];
        $displayName = $settings['display_name'] ?? $request->user()->name ?? 'Host';
        $directorLabel = '&label=' . rawurlencode($displayName);
        $youtubeGoLiveEnabled = ! empty($livestream->youtube_stream_key);
        $pushLink = $youtubeGoLiveEnabled
            ? 'https://vdo.ninja/?push=' . rawurlencode($vdoRoom) . '&cleanoutput' . $passwordParam . $directorLabel
            : null;
        $viewLink = $youtubeGoLiveEnabled
            ? 'https://vdo.ninja/?director=' . rawurlencode($vdoRoom) . $passwordParam . '&output&autostart&cleanoutput'
            : null;
        $streamKeyDisplay = $youtubeGoLiveEnabled ? $livestream->getDecryptedStreamKey() : null;
        $rtmpUrl = 'rtmp://a.rtmp.youtube.com/live2';

        return Inertia::render('frontend/livestreams/Show', [
            'livestream' => [
                'id' => $livestream->id,
                'title' => $livestream->title,
                'description' => $livestream->description,
                'roomName' => $livestream->room_name,
                'roomPassword' => $password,
                'directorUrl' => $directorUrl,
                'directorUrlDropbox' => $directorUrlDropbox,
                'participantUrl' => $participantUrl,
                'hostPushUrl' => $hostPushUrl,
                'hostPushUrlDropbox' => $hostPushUrlDropbox,
                'dropboxRecordingAvailable' => $dropboxConnected,
                'watchUrl' => $watchUrl,
                'unityLiveUrl' => $unityLiveUrl,
                'liveViewerUrl' => $liveViewerUrl,
                'joinUrl' => $joinUrl,
                'isPublic' => (bool) $livestream->is_public,
                'status' => $livestream->status,
                'scheduledAt' => $livestream->scheduled_at?->toIso8601String(),
                'startedAt' => $livestream->started_at?->toIso8601String(),
                'endedAt' => $livestream->ended_at?->toIso8601String(),
                'canStartMeeting' => $livestream->canStartMeeting(),
                'canGoLive' => $livestream->canGoLive(),
                'latestInviteUrl' => $joinUrl,
                'hasStreamKey' => ! empty($livestream->youtube_stream_key),
                'youtubeGoLiveEnabled' => $youtubeGoLiveEnabled,
                'pushLink' => $pushLink,
                'viewLink' => $viewLink,
                'streamKeyDisplay' => $streamKeyDisplay,
                'rtmpUrl' => $rtmpUrl,
            ],
        ]);
    }

    public function startMeeting(Request $request, int $id): RedirectResponse
    {
        $livestream = UserLivestream::where('user_id', $request->user()->id)->findOrFail($id);

        if (! $livestream->canStartMeeting()) {
            return redirect()->back()->withErrors(['error' => 'Meeting cannot be started in current state.']);
        }

        $livestream->update(['status' => 'meeting_live']);

        return redirect()->back()->with('success', 'Meeting started. Share the invite link, then click Go Live when ready.');
    }

    public function setLive(Request $request, int $id): RedirectResponse
    {
        $livestream = UserLivestream::where('user_id', $request->user()->id)->findOrFail($id);

        if (! $livestream->canGoLive()) {
            return redirect()->back()->withErrors(['error' => 'Stream cannot go live in current state.']);
        }

        $livestream->update([
            'status' => 'live',
            'started_at' => $livestream->started_at ?? now(),
        ]);

        $message = $livestream->is_public
            ? 'Stream is now live. It will appear on the Unity Live page.'
            : 'Stream is now live (private). Share the viewer link so people can watch.';
        return redirect()->back()->with('success', $message);
    }

    public function edit(Request $request, int $id): Response
    {
        $livestream = UserLivestream::where('user_id', $request->user()->id)->findOrFail($id);
        $settings = $livestream->settings ?? [];

        return Inertia::render('frontend/livestreams/Edit', [
            'livestream' => [
                'id' => $livestream->id,
                'title' => $livestream->title,
                'description' => $livestream->description,
                'scheduledAt' => $livestream->scheduled_at?->toIso8601String(),
                'isPublic' => (bool) $livestream->is_public,
                'displayName' => $settings['display_name'] ?? $request->user()->name,
                'status' => $livestream->status,
            ],
        ]);
    }

    public function update(Request $request, int $id): RedirectResponse
    {
        $livestream = UserLivestream::where('user_id', $request->user()->id)->findOrFail($id);

        if (in_array($livestream->status, ['live'], true)) {
            return redirect()->back()->withErrors(['error' => 'Cannot edit a live stream. End it first.']);
        }

        $request->validate([
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'scheduled_at' => 'nullable|date',
            'display_name' => 'nullable|string|max:255',
            'is_public' => 'nullable|boolean',
        ]);

        $settings = $livestream->settings ?? [];
        if ($request->filled('display_name')) {
            $settings['display_name'] = $request->display_name;
        } elseif (array_key_exists('display_name', $settings)) {
            unset($settings['display_name']);
        }

        $livestream->update([
            'title' => $request->title,
            'description' => $request->description,
            'scheduled_at' => $request->filled('scheduled_at') ? \Carbon\Carbon::parse($request->scheduled_at) : null,
            'is_public' => $request->boolean('is_public', $livestream->is_public),
            'settings' => $settings ?: null,
        ]);

        return redirect()->route('livestreams.supporter.show', $id)->with('success', 'Meeting updated.');
    }

    public function destroy(Request $request, int $id): RedirectResponse
    {
        $livestream = UserLivestream::where('user_id', $request->user()->id)->findOrFail($id);

        if ($livestream->status === 'live') {
            return redirect()->back()->withErrors(['error' => 'Cannot delete a live stream. End it first.']);
        }

        $livestream->delete();

        return redirect()->route('livestreams.supporter.index')->with('success', 'Meeting deleted.');
    }

    public function endStream(Request $request, int $id): RedirectResponse
    {
        $livestream = UserLivestream::where('user_id', $request->user()->id)->findOrFail($id);

        if ($livestream->status !== 'live') {
            return redirect()->back()->withErrors(['error' => 'Stream is not live.']);
        }

        $livestream->update([
            'status' => 'draft',
            'ended_at' => $livestream->ended_at ?? now(),
        ]);

        return redirect()->back()->with('success', 'Stream stopped. You can go live again from the same link when ready.');
    }

    public function updateVisibility(Request $request, int $id): RedirectResponse
    {
        $request->validate(['is_public' => 'required|boolean']);

        $livestream = UserLivestream::where('user_id', $request->user()->id)->findOrFail($id);
        $livestream->update(['is_public' => $request->boolean('is_public')]);

        return redirect()->back()->with('success', $livestream->is_public
            ? 'Stream is now public. It will appear on the Unity Live page when live.'
            : 'Stream is now private. Only people with the viewer link can watch.');
    }

    public function updateStreamKey(Request $request, int $id): RedirectResponse
    {
        $request->validate(['youtube_stream_key' => 'required|string']);

        $livestream = UserLivestream::where('user_id', $request->user()->id)->findOrFail($id);
        $livestream->update([
            'youtube_stream_key' => Crypt::encryptString($request->youtube_stream_key),
        ]);

        return redirect()->back()->with('success', 'YouTube stream key saved. You can go live with OBS when ready.');
    }

    public function goLiveOBSAuto(Request $request, int $id): RedirectResponse
    {
        $livestream = UserLivestream::where('user_id', $request->user()->id)->findOrFail($id);

        if (! $livestream->canGoLive()) {
            return redirect()->back()->withErrors(['go_live' => 'Stream cannot go live in current state.']);
        }

        $livestream->update([
            'status' => 'live',
            'started_at' => $livestream->started_at ?? now(),
        ]);

        return redirect()->back()->with('success', 'You are now live. Your stream is being sent to YouTube via OBS.');
    }

    /**
     * Unity Meet — recordings tied to this user’s meetings only (personal Dropbox, or org Dropbox filtered by your room names).
     */
    public function recordings(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();
        $user->loadMissing('organization');

        $ctx = $this->unityMeetRecordingDropboxContext($user);

        $dropboxFiles = [];
        if (($ctx['linked'] ?? false) && ($ctx['token'] ?? '') !== '') {
            try {
                $api = new DropboxOrgApi((string) $ctx['token']);
                $folderPath = (string) $ctx['folderPath'];
                $api->createFolder($folderPath);
                $entries = $api->listFolder($folderPath);
                $dropboxFiles = $this->mapUnityFilteredDropboxFiles(
                    $entries,
                    $ctx['restrictToUserRooms'] ?? false,
                    $ctx['roomNames'] ?? []
                );
            } catch (\Throwable $e) {
                Log::warning('Unity Meet recordings Dropbox list failed', ['error' => $e->getMessage()]);
            }
        }

        $dropboxFolderName = trim(str_replace('/', '', (string) ($ctx['folderPath'] ?? ''))) ?: 'BIU Meeting Recordings';

        $meetingTitleHints = UserLivestream::where('user_id', $user->id)
            ->select(['room_name', 'title'])
            ->get()
            ->map(static fn ($ls) => [
                'roomName' => (string) $ls->room_name,
                'title' => $ls->title,
            ])
            ->values()
            ->all();

        return Inertia::render('frontend/livestreams/Dropbox', [
            'dropboxLinked' => (bool) ($ctx['linked'] ?? false),
            'dropboxRedirectUri' => config('services.dropbox.redirect_uri'),
            'dropboxFolderName' => $dropboxFolderName,
            'dropboxFolderPath' => (string) ($ctx['folderPath'] ?? ''),
            'dropboxFiles' => $dropboxFiles,
            'backUrl' => route('livestreams.supporter.index'),
            'unityMeetRecordings' => true,
            'recordingsDisconnectAvailable' => ($ctx['source'] ?? null) === 'user',
            'recordingsBackedByOrganization' => ($ctx['source'] ?? null) === 'organization',
            'meetingTitleHints' => $meetingTitleHints,
        ]);
    }

    public function recordingsSearch(Request $request): \Illuminate\Http\JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $user->loadMissing('organization');

        $ctx = $this->unityMeetRecordingDropboxContext($user);
        if (! ($ctx['linked'] ?? false) || ($ctx['token'] ?? '') === '') {
            return response()->json(['error' => 'Dropbox not connected'], 400);
        }

        $query = $request->input('q', '');
        $query = is_string($query) ? trim($query) : '';
        if ($query === '') {
            return response()->json(['files' => []]);
        }

        try {
            $api = new DropboxOrgApi((string) $ctx['token']);
            $folderPath = (string) $ctx['folderPath'];
            $files = $api->search($folderPath, $query);
            $filtered = $this->mapUnityFilteredSearchFiles(
                $files,
                $ctx['restrictToUserRooms'] ?? false,
                $ctx['roomNames'] ?? []
            );

            return response()->json(['files' => $filtered]);
        } catch (\Throwable $e) {
            Log::warning('Unity Meet recordings Dropbox search failed', ['error' => $e->getMessage()]);

            return response()->json(['error' => 'Search failed', 'files' => []], 500);
        }
    }

    public function recordingDownload(Request $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $user->loadMissing('organization');

        $ctx = $this->unityMeetRecordingDropboxContext($user);
        $path = $request->query('path');
        if (! is_string($path) || $path === '') {
            return redirect()->route('livestreams.supporter.recordings')->with('error', 'Invalid file.');
        }
        $path = trim($path);
        if (str_contains($path, '..')) {
            return redirect()->route('livestreams.supporter.recordings')->with('error', 'Invalid file path.');
        }
        if (! ($ctx['linked'] ?? false) || ($ctx['token'] ?? '') === '') {
            return redirect()->route('livestreams.supporter.recordings')->with('error', 'Dropbox not connected.');
        }
        $folderPath = (string) $ctx['folderPath'];
        if ($folderPath === '' || ! str_starts_with($path, $folderPath)) {
            return redirect()->route('livestreams.supporter.recordings')->with('error', 'You can only download files from your recording folder.');
        }
        if (! $this->unityMeetRecordingFileMatchesContext($path, $ctx)) {
            return redirect()->route('livestreams.supporter.recordings')->with('error', 'Recording not available for your account.');
        }

        $api = new DropboxOrgApi((string) $ctx['token']);
        $link = $api->getTemporaryLink($path);
        if (! $link) {
            return redirect()->route('livestreams.supporter.recordings')->with('error', 'Could not generate download link.');
        }

        return redirect()->away($link);
    }

    public function recordingDelete(Request $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $user->loadMissing('organization');

        $ctx = $this->unityMeetRecordingDropboxContext($user);
        $path = $request->input('path');
        if (! is_string($path) || $path === '') {
            return redirect()->route('livestreams.supporter.recordings')->with('error', 'Invalid file.');
        }
        $path = trim($path);
        if (str_contains($path, '..')) {
            return redirect()->route('livestreams.supporter.recordings')->with('error', 'Invalid file path.');
        }
        if (! ($ctx['linked'] ?? false) || ($ctx['token'] ?? '') === '') {
            return redirect()->route('livestreams.supporter.recordings')->with('error', 'Dropbox not connected.');
        }
        $folderPath = (string) $ctx['folderPath'];
        if ($folderPath === '' || ! str_starts_with($path, $folderPath)) {
            return redirect()->route('livestreams.supporter.recordings')->with('error', 'You can only delete files from your recording folder.');
        }
        if (! $this->unityMeetRecordingFileMatchesContext($path, $ctx)) {
            return redirect()->route('livestreams.supporter.recordings')->with('error', 'Recording not available for your account.');
        }

        $api = new DropboxOrgApi((string) $ctx['token']);
        if (! $api->deleteFile($path)) {
            return redirect()->route('livestreams.supporter.recordings')->with('error', 'Could not delete file.');
        }

        return redirect()->route('livestreams.supporter.recordings')->with('success', 'File deleted.');
    }

    public function recordingRename(Request $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $user->loadMissing('organization');

        $ctx = $this->unityMeetRecordingDropboxContext($user);

        $path = $request->input('path');
        $newName = $request->input('new_name');
        if (! is_string($path) || $path === '' || ! is_string($newName) || trim($newName) === '') {
            return redirect()->route('livestreams.supporter.recordings')->with('error', 'Invalid request.');
        }
        $path = trim($path);
        $newName = trim($newName);
        $newName = preg_replace('/[\\\\\/:*?"<>|]+/', ' ', $newName);
        $newName = trim(preg_replace('/\s+/', ' ', $newName));
        if ($newName === '') {
            return redirect()->route('livestreams.supporter.recordings')->with('error', 'Invalid file name.');
        }
        if (str_contains($path, '..')) {
            return redirect()->route('livestreams.supporter.recordings')->with('error', 'Invalid file path.');
        }
        if (! ($ctx['linked'] ?? false) || ($ctx['token'] ?? '') === '') {
            return redirect()->route('livestreams.supporter.recordings')->with('error', 'Dropbox not connected.');
        }
        $folderPath = (string) $ctx['folderPath'];
        if ($folderPath === '' || ! str_starts_with($path, $folderPath)) {
            return redirect()->route('livestreams.supporter.recordings')->with('error', 'You can only rename files in your recording folder.');
        }
        if (! $this->unityMeetRecordingFileMatchesContext($path, $ctx)) {
            return redirect()->route('livestreams.supporter.recordings')->with('error', 'Recording not available for your account.');
        }

        $toPath = $folderPath.'/'.$newName;
        $api = new DropboxOrgApi((string) $ctx['token']);
        if (! $api->moveFile($path, $toPath)) {
            return redirect()->route('livestreams.supporter.recordings')->with('error', 'Could not rename file.');
        }

        return redirect()->route('livestreams.supporter.recordings')->with('success', 'File renamed.');
    }

    /**
     * @return array{linked: bool, token: ?string, folderPath: string, restrictToUserRooms: bool, roomNames: array<int, string>, source: ?string}
     */
    private function unityMeetRecordingDropboxContext(User $user): array
    {
        $roomNames = UserLivestream::where('user_id', $user->id)->pluck('room_name')->map(fn ($r) => trim((string) $r))->filter()->values()->all();

        $tokens = app(DropboxOAuthService::class);

        if (! empty($user->dropbox_refresh_token)) {
            $token = $tokens->getAccessTokenForUser($user);

            return [
                'linked' => ! empty($token),
                'token' => $token ?: null,
                'folderPath' => $this->recordingFolderPathForUser($user),
                'restrictToUserRooms' => false,
                'roomNames' => $roomNames,
                'source' => 'user',
            ];
        }

        $org = $user->organization;
        if ($org && ! empty($org->dropbox_refresh_token)) {
            $token = $tokens->getAccessTokenForOrganization($org);

            return [
                'linked' => ! empty($token),
                'token' => $token ?: null,
                'folderPath' => $this->recordingFolderPathForOrganization($org),
                'restrictToUserRooms' => true,
                'roomNames' => $roomNames,
                'source' => 'organization',
            ];
        }

        return [
            'linked' => false,
            'token' => null,
            'folderPath' => '',
            'restrictToUserRooms' => false,
            'roomNames' => $roomNames,
            'source' => null,
        ];
    }

    private function recordingFilenameMatchesRooms(string $filename, array $roomNames): bool
    {
        foreach ($roomNames as $room) {
            $r = strtolower(trim((string) $room));
            if ($r !== '' && str_contains(strtolower($filename), $r)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $ctx
     */
    private function unityMeetRecordingFileMatchesContext(string $path, array $ctx): bool
    {
        if (! ($ctx['restrictToUserRooms'] ?? false)) {
            return true;
        }
        /** @var array<int, string> $rooms */
        $rooms = $ctx['roomNames'] ?? [];
        if ($rooms === []) {
            return false;
        }

        return $this->recordingFilenameMatchesRooms(basename($path), $rooms);
    }

    /**
     * @param  array<int, array<string, mixed>>  $entries
     * @return array<int, array{name: string, path_display: string, size: int, client_modified: ?string}>
     */
    private function mapUnityFilteredDropboxFiles(array $entries, bool $restrictToUserRooms, array $roomNames): array
    {
        $out = [];
        foreach ($entries as $entry) {
            if (($entry['tag'] ?? '') !== 'file') {
                continue;
            }
            $row = [
                'name' => $entry['name'] ?? '',
                'path_display' => $entry['path_display'] ?? '',
                'size' => (int) ($entry['size'] ?? 0),
                'client_modified' => $entry['client_modified'] ?? null,
            ];
            if ($restrictToUserRooms) {
                if ($roomNames === [] || ! $this->recordingFilenameMatchesRooms((string) $row['name'], $roomNames)) {
                    continue;
                }
            }
            $out[] = $row;
        }

        return $out;
    }

    /**
     * @param  array<int, array{name: string, path_display: string, size: int, client_modified: ?string}>  $files
     * @return array<int, array{name: string, path_display: string, size: int, client_modified: ?string}>
     */
    private function mapUnityFilteredSearchFiles(array $files, bool $restrictToUserRooms, array $roomNames): array
    {
        if (! $restrictToUserRooms) {
            return $files;
        }
        $out = [];
        foreach ($files as $file) {
            if ($roomNames !== [] && $this->recordingFilenameMatchesRooms((string) ($file['name'] ?? ''), $roomNames)) {
                $out[] = $file;
            }
        }

        return $out;
    }

    private function recordingFolderPathForUser(User $user): string
    {
        $folderName = $user->dropbox_folder_name ? trim((string) $user->dropbox_folder_name) : 'BIU Meeting Recordings';
        $folderName = trim(preg_replace('/[\\\\\/:*?"<>|]+/', ' ', $folderName));
        $folderName = trim($folderName, " \t\n\r\0\x0B.") ?: 'BIU Meeting Recordings';

        return '/' . $folderName;
    }

    private function recordingFolderPathForOrganization(Organization $organization): string
    {
        $folderName = $organization->dropbox_folder_name ? trim((string) $organization->dropbox_folder_name) : 'BIU Meeting Recordings';
        $folderName = trim(preg_replace('/[\\\\\/:*?"<>|]+/', ' ', $folderName));
        $folderName = trim($folderName, " \t\n\r\0\x0B.") ?: 'BIU Meeting Recordings';

        return '/' . $folderName;
    }
}
