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

        return Inertia::render('organization/Livestreams/Create', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'slug' => Str::slug($organization->name),
            ],
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
        $scheduledAt = $request->scheduled_at ? \Carbon\Carbon::parse($request->scheduled_at) : null;

        // If auto-create YouTube broadcast is requested and organization has OAuth token
        if ($request->boolean('auto_create_youtube') && $organization->youtube_access_token) {
            try {
                $accessToken = Crypt::decryptString($organization->youtube_access_token);
                $youtubeService = app(YouTubeService::class);

                $broadcastData = $youtubeService->createLiveBroadcast(
                    $accessToken,
                    $request->title ?: 'Livestream - ' . $organization->name,
                    $request->description,
                    $scheduledAt
                );

                if ($broadcastData) {
                    $encryptedStreamKey = Crypt::encryptString($broadcastData['stream_key']);
                    $youtubeBroadcastId = $broadcastData['broadcast_id'];
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

        $livestream = OrganizationLivestream::create([
            'organization_id' => $organization->id,
            'room_name' => $roomName,
            'room_password' => $encryptedPassword,
            'youtube_stream_key' => $encryptedStreamKey,
            'youtube_broadcast_id' => $youtubeBroadcastId,
            'status' => $request->scheduled_at ? 'scheduled' : 'draft',
            'title' => $request->title,
            'description' => $request->description,
            'scheduled_at' => $scheduledAt,
        ]);

        return redirect()->route('organization.livestreams.show', $livestream->id)
            ->with('success', 'Livestream created successfully!');
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
        $password = $livestream->getDecryptedPassword();

        return Inertia::render('organization/Livestreams/Show', [
            'livestream' => [
                'id' => $livestream->id,
                'title' => $livestream->title,
                'description' => $livestream->description,
                'roomName' => $livestream->room_name,
                'roomPassword' => $password,
                'directorUrl' => $directorUrl,
                'participantUrl' => $participantUrl,
                'status' => $livestream->status,
                'scheduledAt' => $livestream->scheduled_at?->toIso8601String(),
                'startedAt' => $livestream->started_at?->toIso8601String(),
                'endedAt' => $livestream->ended_at?->toIso8601String(),
                'hasStreamKey' => !empty($livestream->youtube_stream_key),
                'youtubeBroadcastId' => $livestream->youtube_broadcast_id,
            ],
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'youtubeChannelUrl' => $organization->youtube_channel_url,
            ],
        ]);
    }

    /**
     * Show the guest join page (public, no auth required).
     */
    public function guestJoin($roomName): Response
    {
        $livestream = OrganizationLivestream::where('room_name', $roomName)
            ->whereIn('status', ['draft', 'scheduled', 'live'])
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

        return back()->with('success', 'Livestream status updated successfully!');
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
                    'scheduledAt' => $livestream->scheduled_at?->toIso8601String(),
                    'startedAt' => $livestream->started_at?->toIso8601String(),
                    'endedAt' => $livestream->ended_at?->toIso8601String(),
                    'createdAt' => $livestream->created_at->toIso8601String(),
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

        $livestream->delete();

        return redirect()->route('organization.livestreams.index')
            ->with('success', 'Livestream deleted successfully!');
    }
}
