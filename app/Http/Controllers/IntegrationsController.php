<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class IntegrationsController extends Controller
{
    /**
     * Show the YouTube integration page (organization only).
     * Connect via button → OAuth; no manual URL.
     */
    public function youtube(): Response|RedirectResponse
    {
        $user = Auth::user();
        if ($user->role !== 'organization' || ! $user->organization) {
            return redirect()->route('dashboard')->with('error', 'Only organizations can manage YouTube integration.');
        }

        $organization = $user->organization;

        $channel_page = null;
        if ($organization->youtube_channel_url) {
            try {
                $channel_page = app(\App\Http\Controllers\CommunityVideosController::class)->getChannelPageData($user->slug);
            } catch (\Throwable $e) {
                // Channel slug may not exist yet; leave channel_page null
            }
        }

        return Inertia::render('Integrations/YouTube', [
            'youtube_channel_url' => $organization->youtube_channel_url,
            'youtube_redirect_uri' => config('services.youtube.redirect_uri'),
            'channel_page' => $channel_page,
        ]);
    }

    /**
     * Redirect to Google OAuth so user can connect their YouTube channel.
     */
    public function redirectToYouTube(): RedirectResponse
    {
        $user = Auth::user();
        if ($user->role !== 'organization' || ! $user->organization) {
            return redirect()->route('dashboard')->with('error', 'Only organizations can connect YouTube.');
        }

        $clientId = config('services.youtube.client_id');
        $redirectUri = config('services.youtube.redirect_uri');
        if (empty($clientId) || empty($redirectUri)) {
            return redirect()->route('integrations.youtube')->with('error', 'YouTube integration is not configured. Please set YOUTUBE_CLIENT_ID and redirect URI.');
        }

        $state = Str::random(40);
        session(['youtube_oauth_state' => $state]);

        $params = [
            'client_id' => $clientId,
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'scope' => 'https://www.googleapis.com/auth/youtube.readonly',
            'state' => $state,
            'access_type' => 'offline',
            'prompt' => 'consent',
        ];

        $url = 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query($params);

        return redirect()->away($url);
    }

    /**
     * OAuth callback: exchange code for token, fetch channel, save to org.
     */
    public function youtubeCallback(Request $request): RedirectResponse
    {
        $user = Auth::user();
        if ($user->role !== 'organization' || ! $user->organization) {
            return redirect()->route('integrations.youtube')->with('error', 'Organization not found.');
        }

        $state = $request->query('state');
        $sessionState = session('youtube_oauth_state');
        if (empty($state) || $state !== $sessionState) {
            session()->forget('youtube_oauth_state');
            return redirect()->route('integrations.youtube')->with('error', 'Invalid state. Please try connecting again.');
        }
        session()->forget('youtube_oauth_state');

        $code = $request->query('code');
        if (empty($code)) {
            return redirect()->route('integrations.youtube')->with('error', 'No authorization code received. Please try again.');
        }

        $clientId = config('services.youtube.client_id');
        $clientSecret = config('services.youtube.client_secret');
        $redirectUri = config('services.youtube.redirect_uri');

        $http = self::httpClientWithSsl();

        $tokenResponse = $http->asForm()->post('https://oauth2.googleapis.com/token', [
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'code' => $code,
            'grant_type' => 'authorization_code',
            'redirect_uri' => $redirectUri,
        ]);

        if (! $tokenResponse->successful()) {
            Log::warning('YouTube OAuth token exchange failed', ['body' => $tokenResponse->body()]);
            return redirect()->route('integrations.youtube')->with('error', 'Could not connect to YouTube. Please try again.');
        }

        $tokenData = $tokenResponse->json();
        $accessToken = $tokenData['access_token'] ?? null;
        if (! $accessToken) {
            return redirect()->route('integrations.youtube')->with('error', 'No access token received.');
        }

        $channelsResponse = $http->withToken($accessToken)->get('https://www.googleapis.com/youtube/v3/channels', [
            'part' => 'id,snippet',
            'mine' => 'true',
            'maxResults' => 1,
        ]);

        if (! $channelsResponse->successful()) {
            Log::warning('YouTube channels.list failed', ['body' => $channelsResponse->body()]);
            return redirect()->route('integrations.youtube')->with('error', 'Could not load your YouTube channel. Please try again.');
        }

        $channelsData = $channelsResponse->json();
        $items = $channelsData['items'] ?? [];
        if (empty($items)) {
            return redirect()->route('integrations.youtube')->with('error', 'No YouTube channel found for this account. Create a channel on YouTube first, then connect again.');
        }

        $channelId = $items[0]['id'] ?? null;
        if (! $channelId) {
            return redirect()->route('integrations.youtube')->with('error', 'Could not get channel ID.');
        }

        $channelUrl = 'https://www.youtube.com/channel/' . $channelId;

        $user->organization->update([
            'youtube_channel_url' => $channelUrl,
        ]);

        return redirect()->route('integrations.youtube')->with('success', 'YouTube channel connected. Your videos will appear on Community Videos.');
    }

    /**
     * Disconnect: clear the organization's YouTube channel URL.
     */
    public function updateYoutube(Request $request): RedirectResponse
    {
        $user = Auth::user();
        if ($user->role !== 'organization' || ! $user->organization) {
            return redirect()->route('dashboard')->with('error', 'Only organizations can update YouTube integration.');
        }

        $validated = $request->validate([
            'youtube_channel_url' => ['nullable', 'string', 'max:500', 'url'],
        ]);

        $user->organization->update([
            'youtube_channel_url' => $validated['youtube_channel_url'] ? trim($validated['youtube_channel_url']) : null,
        ]);

        return redirect()->route('integrations.youtube')->with('success', 'YouTube channel saved.');
    }

    /**
     * HTTP client for YouTube OAuth (SSL verification disabled to avoid cURL 60 on Windows).
     */
    private static function httpClientWithSsl(): \Illuminate\Http\Client\PendingRequest
    {
        return Http::withOptions(['verify' => false]);
    }
}
