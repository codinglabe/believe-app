<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\OrganizationLivestream;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use App\Services\StreamBridgeService;
use App\Services\YouTubeService;

class LivestreamController extends Controller
{
    /**
     * Show the create stream page.
     */
    public function create(): Response
    {
        $user = Auth::user();
        $organization = $user->organization ?? Organization::where('user_id', $user->id)->first();

        if (!$organization) {
            abort(404, 'Organization not found');
        }

        // Check YouTube integration directly from DB (relationship may omit token columns)
        $orgTokens = Organization::where('id', $organization->id)
            ->first(['youtube_access_token', 'youtube_refresh_token']);
        $hasYoutubeIntegrated = $orgTokens
            && (!empty($orgTokens->youtube_access_token) || !empty($orgTokens->youtube_refresh_token));

        return Inertia::render('organization/Livestreams/Create', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'slug' => Str::slug($organization->name),
            ],
            'hasYoutubeIntegrated' => $hasYoutubeIntegrated,
        ]);
    }

    /**
     * Store a new livestream.
     */
    public function store(Request $request)
    {
        $request->validate([
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'scheduled_at' => 'nullable|date|after:now',
            'youtube_stream_key' => 'nullable|string',
            'auto_create_youtube' => 'nullable|boolean',
            'display_name' => 'nullable|string|max:255',
            'is_public' => 'nullable|boolean',
        ]);

        $user = Auth::user();
        $organization = $user->organization ?? Organization::where('user_id', $user->id)->first();

        if (!$organization) {
            return back()->withErrors(['error' => 'Organization not found']);
        }

        // Generate room name and password
        $roomName = OrganizationLivestream::generateRoomName($organization);
        $password = OrganizationLivestream::generatePassword();

        // Encrypt password
        $encryptedPassword = Crypt::encryptString($password);

        // Handle YouTube integration
        $encryptedStreamKey = null;
        $youtubeBroadcastId = null;
        $settings = null;
        $scheduledAt = $request->scheduled_at ? \Carbon\Carbon::parse($request->scheduled_at) : null;

        // If auto-create YouTube broadcast is requested and organization has OAuth token
        if ($request->boolean('auto_create_youtube') && ($organization->youtube_access_token || $organization->youtube_refresh_token)) {
            try {
                $youtubeService = app(YouTubeService::class);
                $accessToken = $youtubeService->getValidAccessToken($organization);
                if (! $accessToken) {
                    return redirect()->back()->withErrors([
                        'auto_create_youtube' => 'YouTube token expired or invalid. Please reconnect YouTube in Integrations.',
                    ])->withInput();
                }

                $broadcastData = $youtubeService->createLiveBroadcast(
                    $accessToken,
                    $request->title ?: 'Unity Meet - ' . $organization->name,
                    $request->description,
                    $scheduledAt
                );

                if ($broadcastData) {
                    $encryptedStreamKey = Crypt::encryptString($broadcastData['stream_key']);
                    $youtubeBroadcastId = $broadcastData['broadcast_id'];
                    $vdoRoomId = $roomName; // Use room name as VDO.Ninja room for push/view links
                    $settings = [
                        'vdo_room_id' => $vdoRoomId,
                        'rtmp_url' => $broadcastData['rtmp_url'] ?? null,
                    ];
                } else {
                    Log::warning('Failed to create YouTube broadcast for livestream', [
                        'organization_id' => $organization->id,
                    ]);
                }
            } catch (\Exception $e) {
                Log::error('Error creating YouTube broadcast', [
                    'organization_id' => $organization->id,
                    'error' => $e->getMessage(),
                ]);
            }
        } elseif ($request->youtube_stream_key) {
            // Manual stream key entry
            $encryptedStreamKey = Crypt::encryptString($request->youtube_stream_key);
        }

        $baseSettings = $settings ?? [];
        if ($request->filled('display_name')) {
            $baseSettings['display_name'] = $request->display_name;
        }

        $livestream = OrganizationLivestream::create([
            'organization_id' => $organization->id,
            'room_name' => $roomName,
            'room_password' => $encryptedPassword,
            'youtube_stream_key' => $encryptedStreamKey,
            'youtube_broadcast_id' => $youtubeBroadcastId,
            'status' => $request->scheduled_at ? 'scheduled' : 'draft',
            'is_public' => $request->boolean('is_public', true),
            'title' => $request->title,
            'description' => $request->description,
            'scheduled_at' => $scheduledAt,
            'settings' => !empty($baseSettings) ? $baseSettings : null,
        ]);

        // Action-first flow: if minimal create (no YouTube, no schedule), go to Meeting Ready
        $minimalCreate = !$request->boolean('auto_create_youtube') && !$request->scheduled_at && !$request->youtube_stream_key;
        if ($minimalCreate) {
            return redirect()->route('organization.livestreams.ready', $livestream->id)
                ->with('success', 'Meeting ready!');
        }

        return redirect()->route('organization.livestreams.show', $livestream->id)
            ->with('success', 'Meeting created successfully!');
    }

    /**
     * Meeting Ready (Pane 2) — show meeting ID, passcode, invite link; Start Meeting goes to show.
     */
    public function ready($id): Response
    {
        $user = Auth::user();
        $organization = $user->organization ?? Organization::where('user_id', $user->id)->first();

        if (!$organization) {
            abort(404, 'Organization not found');
        }

        $livestream = OrganizationLivestream::where('organization_id', $organization->id)
            ->findOrFail($id);

        $password = $livestream->getDecryptedPassword();
        $joinUrl = url('/livestreams/join/' . $livestream->room_name);

        return Inertia::render('organization/Livestreams/Ready', [
            'livestream' => [
                'id' => $livestream->id,
                'title' => $livestream->title,
                'roomName' => $livestream->room_name,
                'roomPassword' => $password,
                'joinUrl' => $joinUrl,
            ],
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
        ]);
    }

    /**
     * Show the host dashboard for a livestream.
     */
    public function show($id): Response
    {
        $user = Auth::user();
        $organization = $user->organization ?? Organization::where('user_id', $user->id)->first();

        if (!$organization) {
            abort(404, 'Organization not found');
        }

        $livestream = OrganizationLivestream::where('organization_id', $organization->id)
            ->findOrFail($id);

        // Get decrypted values for display (but don't expose in API)
        $directorUrl = $livestream->getDirectorUrl();
        $participantUrl = $livestream->getParticipantUrl();
        $hostPushUrl = $livestream->getHostPushUrl();
        $watchUrl = $livestream->getPublicViewUrl(); // Viewer link (no director) — for Unity Live / share with audience
        $password = $livestream->getDecryptedPassword();

        // VDO.Ninja: viewer embed uses ?view=room (no OBS); Unity Live uses getPublicViewUrl() which uses same format
        // OBS flow: push link + director view link + stream key when YouTube is connected
        $vdoRoom = $livestream->getVdoRoomName();
        $settings = $livestream->settings ?? [];
        $rtmpUrl = $settings['rtmp_url'] ?? null;
        $youtubeGoLiveEnabled = !empty($livestream->youtube_broadcast_id) && !empty($livestream->youtube_stream_key);
        $passwordParam = !empty($password) ? '&password=' . rawurlencode($password) : '';
        $directorLabel = '&label=' . rawurlencode($organization->name ?? 'Host');
        $pushLink = $youtubeGoLiveEnabled
            ? "https://vdo.ninja/?push={$vdoRoom}&cleanoutput{$passwordParam}{$directorLabel}"
            : null;
        // OBS Browser Source (when using OBS): director + output for capture
        $viewLink = $youtubeGoLiveEnabled
            ? "https://vdo.ninja/?director=" . rawurlencode($vdoRoom) . $passwordParam . "&output&autostart&cleanoutput"
            : null;
        $streamKeyDisplay = $youtubeGoLiveEnabled ? $livestream->getDecryptedStreamKey() : null;
        $mediamtxEnabled = !empty(config('services.mediamtx.publish_url'));

        $unityLiveUrl = url('/unity-live/' . $livestream->room_name);

        return Inertia::render('organization/Livestreams/Show', [
            'livestream' => [
                'id' => $livestream->id,
                'title' => $livestream->title,
                'description' => $livestream->description,
                'roomName' => $livestream->room_name,
                'roomPassword' => $password,
                'directorUrl' => $directorUrl,
                'participantUrl' => $participantUrl,
                'hostPushUrl' => $hostPushUrl,
                'watchUrl' => $watchUrl,
                'unityLiveUrl' => $unityLiveUrl,
                'isPublic' => (bool) $livestream->is_public,
                'status' => $livestream->status,
                'scheduledAt' => $livestream->scheduled_at?->toIso8601String(),
                'startedAt' => $livestream->started_at?->toIso8601String(),
                'endedAt' => $livestream->ended_at?->toIso8601String(),
                'hasStreamKey' => !empty($livestream->youtube_stream_key),
                'youtubeBroadcastId' => $livestream->youtube_broadcast_id,
                'youtubeGoLiveEnabled' => $youtubeGoLiveEnabled,
                'pushLink' => $pushLink,
                'viewLink' => $viewLink,
                'streamKeyDisplay' => $streamKeyDisplay,
                'rtmpUrl' => $rtmpUrl,
            ],
            'mediamtxEnabled' => $mediamtxEnabled,
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'youtubeChannelUrl' => $organization->youtube_channel_url,
            ],
        ]);
    }

    /**
     * Show the guest join page (public, no auth required).
     * Include 'ended' so invite links for past meetings show "Meeting ended" instead of 404.
     */
    public function guestJoin(string $roomName): Response
    {
        $livestream = OrganizationLivestream::where('room_name', $roomName)
            ->whereIn('status', ['draft', 'scheduled', 'live', 'ended'])
            ->with('organization')
            ->firstOrFail();

        $participantUrl = $livestream->getParticipantUrl();
        $password = $livestream->getDecryptedPassword();

        return Inertia::render('organization/Livestreams/GuestJoin', [
            'livestream' => [
                'id' => $livestream->id,
                'title' => $livestream->title,
                'description' => $livestream->description,
                'roomName' => $livestream->room_name,
                'roomPassword' => $password,
                'participantUrl' => $participantUrl,
                'status' => $livestream->status,
            ],
            'organization' => [
                'id' => $livestream->organization->id,
                'name' => $livestream->organization->name,
            ],
        ]);
    }

    /**
     * Update livestream status (start, end, etc.).
     */
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:draft,scheduled,live,ended,cancelled',
        ]);

        $user = Auth::user();
        $organization = $user->organization ?? Organization::where('user_id', $user->id)->first();

        if (!$organization) {
            return back()->withErrors(['error' => 'Organization not found']);
        }

        $livestream = OrganizationLivestream::where('organization_id', $organization->id)
            ->findOrFail($id);

        $status = $request->status;
        $updates = ['status' => $status];

        if ($status === 'live' && !$livestream->started_at) {
            $updates['started_at'] = now();
        } elseif ($status === 'ended' && !$livestream->ended_at) {
            $updates['ended_at'] = now();
        }

        $livestream->update($updates);

        return back()->with('success', 'Meeting status updated successfully!');
    }

    /**
     * Transition YouTube broadcast to "live" (make stream public).
     * Host must have started OBS streaming first so YouTube receives the RTMP signal.
     */
    public function goLive(Request $request, $id)
    {
        $user = Auth::user();
        $organization = $user->organization ?? Organization::where('user_id', $user->id)->first();

        if (!$organization) {
            return redirect()->back()->withErrors(['go_live' => 'Organization not found']);
        }

        $livestream = OrganizationLivestream::where('organization_id', $organization->id)
            ->findOrFail($id);

        if (! $livestream->youtube_broadcast_id) {
            return redirect()->back()->withErrors(['go_live' => 'YouTube broadcast not configured']);
        }

        $youtubeService = app(YouTubeService::class);
        $accessToken = $youtubeService->getValidAccessToken($organization);
        if (! $accessToken) {
            return redirect()->back()->withErrors([
                'go_live' => 'YouTube token expired or invalid. Please reconnect YouTube in Integrations.',
            ]);
        }

        try {
            // Transition to "live" only works when YouTube is already receiving the stream (stream status = active).
            $status = $youtubeService->getBroadcastStreamStatus($accessToken, $livestream->youtube_broadcast_id);
            if (! $status['stream_active']) {
                $hint = $status['stream_status'] === 'inactive'
                    ? 'Start OBS and start streaming to YouTube (use the RTMP URL and stream key from this page). Wait until the stream is receiving data, then click Go Live again.'
                    : 'Start streaming from OBS to YouTube first. Wait until the stream shows as receiving data, then click Go Live again.';
                return redirect()->back()->withErrors(['go_live' => $hint]);
            }

            $ok = $youtubeService->updateBroadcastStatus(
                $accessToken,
                $livestream->youtube_broadcast_id,
                'live'
            );

            if (! $ok) {
                return redirect()->back()->withErrors([
                    'go_live' => 'YouTube could not go live. Please try again in a moment.',
                ]);
            }

            $livestream->update([
                'status' => 'live',
                'started_at' => $livestream->started_at ?? now(),
            ]);

            return redirect()->back()->with('success', 'You are now live on YouTube.');
        } catch (\Exception $e) {
            Log::error('Go live failed', ['livestream_id' => $id, 'error' => $e->getMessage()]);
            return redirect()->back()->withErrors(['go_live' => $e->getMessage()]);
        }
    }

    /**
     * Set livestream status to "live" in the database only (no OBS, no YouTube).
     * Stream will then appear on the Unity Live page.
     */
    public function setLive(Request $request, $id)
    {
        $user = Auth::user();
        $organization = $user->organization ?? Organization::where('user_id', $user->id)->first();

        if (! $organization) {
            return redirect()->back()->withErrors(['error' => 'Organization not found']);
        }

        $livestream = OrganizationLivestream::where('organization_id', $organization->id)
            ->findOrFail($id);

        if (! in_array($livestream->status, ['draft', 'scheduled'], true)) {
            return redirect()->back()->withErrors(['error' => 'Stream is not in draft or scheduled state.']);
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

    /**
     * Go live from browser only (no OBS): start server bridge, transition YouTube, return publish URL.
     * Requires MediaMTX + FFmpeg on server and MEDIAMTX_PUBLISH_URL set.
     */
    public function goLiveBrowser(Request $request, $id)
    {
        $user = Auth::user();
        $organization = $user->organization ?? Organization::where('user_id', $user->id)->first();

        if (!$organization) {
            return redirect()->back()->withErrors(['go_live' => 'Organization not found']);
        }

        $livestream = OrganizationLivestream::where('organization_id', $organization->id)
            ->findOrFail($id);

        if (! $livestream->youtube_broadcast_id) {
            return redirect()->back()->withErrors(['go_live' => 'YouTube broadcast not configured']);
        }

        $bridge = app(StreamBridgeService::class)->startBridge($livestream);
        if (! $bridge) {
            return redirect()->back()->withErrors([
                'go_live' => 'Server stream bridge is not configured. Set MEDIAMTX_PUBLISH_URL and run MediaMTX + FFmpeg, or use OBS.',
            ]);
        }

        $youtubeService = app(YouTubeService::class);
        $accessToken = $youtubeService->getValidAccessToken($organization);
        if ($accessToken) {
            try {
                $youtubeService->updateBroadcastStatus($accessToken, $livestream->youtube_broadcast_id, 'live');
            } catch (\Exception $e) {
                Log::warning('Go live browser: YouTube transition failed', ['error' => $e->getMessage()]);
            }
        } else {
            Log::warning('Go live browser: YouTube token invalid, stream not transitioned on YouTube', ['livestream_id' => $id]);
        }

        $livestream->update([
            'status' => 'live',
            'started_at' => $livestream->started_at ?? now(),
        ]);

        return redirect()->back()
            ->with('success', 'A new window will open—allow camera/screen there to start streaming.')
            ->with('browser_publish_url', $bridge['publish_url']);
    }

    /**
     * Go live via "Go Live with OBS (auto)": update DB to live and started_at, then try YouTube transition (best effort).
     * This ensures the database status is always updated when the user uses the auto OBS flow.
     */
    public function goLiveOBSAuto(Request $request, $id)
    {
        $user = Auth::user();
        $organization = $user->organization ?? Organization::where('user_id', $user->id)->first();

        if (! $organization) {
            return redirect()->back()->withErrors(['go_live' => 'Organization not found']);
        }

        $livestream = OrganizationLivestream::where('organization_id', $organization->id)
            ->findOrFail($id);

        // Always update our database to "live" when user clicks Go Live with OBS (auto)
        $livestream->update([
            'status' => 'live',
            'started_at' => $livestream->started_at ?? now(),
        ]);

        // Try to transition YouTube to "live" (best effort; may fail if stream not active yet)
        if ($livestream->youtube_broadcast_id) {
            $youtubeService = app(YouTubeService::class);
            $accessToken = $youtubeService->getValidAccessToken($organization);
            if ($accessToken) {
                try {
                    $status = $youtubeService->getBroadcastStreamStatus($accessToken, $livestream->youtube_broadcast_id);
                    if ($status['stream_active']) {
                        $youtubeService->updateBroadcastStatus($accessToken, $livestream->youtube_broadcast_id, 'live');
                    }
                } catch (\Exception $e) {
                    Log::warning('Go live OBS auto: YouTube transition failed', ['livestream_id' => $id, 'error' => $e->getMessage()]);
                }
            }
        }

        return redirect()->back()->with('success', 'You are now live. If YouTube did not go public yet, wait a few seconds for the stream to connect and click Go Live again if needed.');
    }

    /**
     * End stream: stop the broadcast on YouTube (and OBS on frontend) only.
     * Do NOT set meeting to "ended" — set back to "draft" so the same link can be used for more streams.
     */
    public function endStream(Request $request, $id)
    {
        $user = Auth::user();
        $organization = $user->organization ?? Organization::where('user_id', $user->id)->first();

        if (! $organization) {
            return redirect()->back()->withErrors(['error' => 'Organization not found']);
        }

        $livestream = OrganizationLivestream::where('organization_id', $organization->id)
            ->findOrFail($id);

        if ($livestream->status !== 'live') {
            return redirect()->back()->withErrors(['error' => 'Stream is not live.']);
        }

        $youtubeService = app(YouTubeService::class);
        $accessToken = $youtubeService->getValidAccessToken($organization);

        // Stop the current broadcast on YouTube (OBS is stopped on frontend via stopOBSStream)
        if (! empty($livestream->youtube_broadcast_id) && $accessToken) {
            try {
                $youtubeService->updateBroadcastStatus($accessToken, $livestream->youtube_broadcast_id, 'complete');
            } catch (\Exception $e) {
                Log::warning('End stream: YouTube complete failed', ['livestream_id' => $id, 'error' => $e->getMessage()]);
            }
        }

        // Create a new YouTube broadcast so the same meeting can go live again (completed broadcasts cannot be reused)
        $updatePayload = ['status' => 'draft'];
        if ($accessToken) {
            try {
                $title = $livestream->title ?: 'Unity Meet - ' . ($organization->name ?? 'Live');
                $broadcastData = $youtubeService->createLiveBroadcast(
                    $accessToken,
                    $title,
                    $livestream->description,
                    null
                );
                if ($broadcastData) {
                    $updatePayload['youtube_broadcast_id'] = $broadcastData['broadcast_id'];
                    $updatePayload['youtube_stream_key'] = Crypt::encryptString($broadcastData['stream_key']);
                }
            } catch (\Exception $e) {
                Log::warning('End stream: create new YouTube broadcast failed', ['livestream_id' => $id, 'error' => $e->getMessage()]);
            }
        }

        $livestream->update($updatePayload);

        return redirect()->back()->with('success', 'Stream stopped. You can go live again from the same link when ready.');
    }

    /**
     * Update YouTube stream key.
     */
    public function updateStreamKey(Request $request, $id)
    {
        $request->validate([
            'youtube_stream_key' => 'required|string',
        ]);

        $user = Auth::user();
        $organization = $user->organization ?? Organization::where('user_id', $user->id)->first();

        if (!$organization) {
            return back()->withErrors(['error' => 'Organization not found']);
        }

        $livestream = OrganizationLivestream::where('organization_id', $organization->id)
            ->findOrFail($id);

        $encryptedStreamKey = Crypt::encryptString($request->youtube_stream_key);

        $livestream->update([
            'youtube_stream_key' => $encryptedStreamKey,
        ]);

        return back()->with('success', 'YouTube stream key updated successfully!');
    }

    /**
     * Update livestream visibility (public = listed on Unity Live; private = only via direct link).
     */
    public function updateVisibility(Request $request, $id)
    {
        $request->validate([
            'is_public' => 'required|boolean',
        ]);

        $user = Auth::user();
        $organization = $user->organization ?? Organization::where('user_id', $user->id)->first();

        if (! $organization) {
            return back()->withErrors(['error' => 'Organization not found']);
        }

        $livestream = OrganizationLivestream::where('organization_id', $organization->id)
            ->findOrFail($id);

        $livestream->update(['is_public' => $request->boolean('is_public')]);

        return back()->with('success', $livestream->is_public
            ? 'Stream is now public. It will appear on the Unity Live page when live.'
            : 'Stream is now private. Only people with the viewer link can watch.');
    }

    /**
     * List all livestreams for the organization.
     */
    public function index(): Response
    {
        $user = Auth::user();
        $organization = $user->organization ?? Organization::where('user_id', $user->id)->first();

        if (!$organization) {
            abort(404, 'Organization not found');
        }

        $livestreams = OrganizationLivestream::where('organization_id', $organization->id)
            ->orderBy('created_at', 'desc')
            ->paginate(20)
            ->through(function ($livestream) {
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
                    'directorUrl' => $livestream->getDirectorUrl(),
                ];
            });

        return Inertia::render('organization/Livestreams/Index', [
            'livestreams' => $livestreams,
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
        ]);
    }

    /**
     * Delete a livestream.
     */
    public function destroy($id)
    {
        $user = Auth::user();
        $organization = $user->organization ?? Organization::where('user_id', $user->id)->first();

        if (!$organization) {
            return back()->withErrors(['error' => 'Organization not found']);
        }

        $livestream = OrganizationLivestream::where('organization_id', $organization->id)
            ->findOrFail($id);

        // Only allow deletion if stream is not live
        if ($livestream->status === 'live') {
            return back()->withErrors(['error' => 'Cannot delete a live stream. Please end it first.']);
        }

        // Delete the YouTube broadcast if this livestream had one
        if (! empty($livestream->youtube_broadcast_id)) {
            try {
                $youtubeService = app(YouTubeService::class);
                $accessToken = $youtubeService->getValidAccessToken($organization);
                if ($accessToken) {
                    $youtubeService->deleteBroadcast($accessToken, $livestream->youtube_broadcast_id);
                }
            } catch (\Exception $e) {
                Log::warning('YouTube broadcast deletion failed during livestream delete', [
                    'livestream_id' => $id,
                    'broadcast_id' => $livestream->youtube_broadcast_id,
                    'error' => $e->getMessage(),
                ]);
                // Continue to delete the livestream locally
            }
        }

        $livestream->delete();

        return redirect()->route('organization.livestreams.index')
            ->with('success', 'Meeting deleted successfully!');
    }
}
