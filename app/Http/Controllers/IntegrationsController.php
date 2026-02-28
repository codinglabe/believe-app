<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Crypt;
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

        // CSRF protection: required by Google OAuth "Use secure flows" – do not remove
        $state = Str::random(40);
        session(['youtube_oauth_state' => $state]);

        $params = [
            'client_id' => $clientId,
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'scope' => 'https://www.googleapis.com/auth/youtube.force-ssl',
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
        $refreshToken = $tokenData['refresh_token'] ?? null;
        $expiresIn = $tokenData['expires_in'] ?? 3600;

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

        // Encrypt tokens before storing
        $encryptedAccessToken = \Illuminate\Support\Facades\Crypt::encryptString($accessToken);
        $encryptedRefreshToken = $refreshToken ? \Illuminate\Support\Facades\Crypt::encryptString($refreshToken) : null;
        $expiresAt = now()->addSeconds($expiresIn);

        $user->organization->update([
            'youtube_channel_url' => $channelUrl,
            'youtube_access_token' => $encryptedAccessToken,
            'youtube_refresh_token' => $encryptedRefreshToken,
            'youtube_token_expires_at' => $expiresAt,
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
     * Show the Dropbox integration page (organization only).
     * Connect for livestream recording uploads.
     */
    public function dropbox(): Response|RedirectResponse
    {
        $user = Auth::user();
        if ($user->role !== 'organization' || ! $user->organization) {
            return redirect()->route('dashboard')->with('error', 'Only organizations can manage Dropbox integration.');
        }

        $organization = $user->organization;
        $dropboxLinked = ! empty($organization->dropbox_refresh_token);

        $dropboxFiles = [];
        $dropboxFolderPath = '';
        if ($dropboxLinked) {
            $token = app(\App\Services\DropboxOAuthService::class)->getAccessTokenForOrganization($organization);
            $folderName = $organization->dropbox_folder_name ? trim($organization->dropbox_folder_name) : 'BIU Meeting Recordings';
            $folderName = trim(preg_replace('/[\\\\\/:*?"<>|]+/', ' ', $folderName)) ?: 'BIU Meeting Recordings';
            $folderPath = '/' . $folderName;
            $dropboxFolderPath = $folderPath;
            if ($token) {
                try {
                    $api = new \App\Services\DropboxOrgApi($token);
                    $api->createFolder($folderPath);
                    $rootFiles = $api->listRecentRecordingsAtRoot();
                    foreach ($rootFiles as $file) {
                        $from = $file['path_display'] ?? '';
                        $name = $file['name'] ?? '';
                        if ($from !== '' && $name !== '') {
                            $api->moveFile($from, $folderPath . '/' . $name);
                        }
                    }
                    $entries = $api->listFolder($folderPath);
                    foreach ($entries as $entry) {
                        if (($entry['tag'] ?? '') === 'file') {
                            $dropboxFiles[] = [
                                'name' => $entry['name'],
                                'path_display' => $entry['path_display'],
                                'size' => $entry['size'] ?? 0,
                                'client_modified' => $entry['client_modified'] ?? null,
                            ];
                        }
                    }
                } catch (\Throwable $e) {
                    Log::warning('Dropbox list folder failed', ['error' => $e->getMessage()]);
                }
            }
        }

        return Inertia::render('Integrations/Dropbox', [
            'dropboxLinked' => $dropboxLinked,
            'dropboxRedirectUri' => config('services.dropbox.redirect_uri'),
            'dropboxFolderName' => $organization->dropbox_folder_name ?? '',
            'dropboxFolderPath' => $dropboxFolderPath,
            'dropboxFiles' => $dropboxFiles,
        ]);
    }

    /**
     * Redirect to Dropbox OAuth (offline access for refresh token).
     */
    public function redirectToDropbox(): RedirectResponse
    {
        $user = Auth::user();
        if ($user->role !== 'organization' || ! $user->organization) {
            return redirect()->route('dashboard')->with('error', 'Only organizations can connect Dropbox.');
        }

        $clientId = config('services.dropbox.client_id');
        $redirectUri = config('services.dropbox.redirect_uri');
        if (empty($clientId) || empty($redirectUri)) {
            return redirect()->route('integrations.dropbox')->with('error', 'Dropbox integration is not configured. Please set DROPBOX_CLIENT_ID and DROPBOX_REDIRECT_URI.');
        }

        $state = Str::random(40);
        session(['dropbox_oauth_state' => $state]);

        $params = [
            'client_id' => $clientId,
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'token_access_type' => 'offline',
            'scope' => 'files.content.write files.content.read files.metadata.write',
            'state' => $state,
        ];

        $url = 'https://www.dropbox.com/oauth2/authorize?' . http_build_query($params);

        return redirect()->away($url);
    }

    /**
     * Dropbox OAuth callback: exchange code for tokens, store refresh token on org.
     */
    public function dropboxCallback(Request $request): RedirectResponse
    {
        $user = Auth::user();
        if ($user->role !== 'organization' || ! $user->organization) {
            return redirect()->route('integrations.dropbox')->with('error', 'Organization not found.');
        }

        $state = $request->query('state');
        $sessionState = session('dropbox_oauth_state');
        if (empty($state) || $state !== $sessionState) {
            session()->forget('dropbox_oauth_state');
            return redirect()->route('integrations.dropbox')->with('error', 'Invalid state. Please try connecting again.');
        }
        session()->forget('dropbox_oauth_state');

        $code = $request->query('code');
        if (empty($code)) {
            return redirect()->route('integrations.dropbox')->with('error', 'No authorization code received. Please try again.');
        }

        $clientId = config('services.dropbox.client_id');
        $clientSecret = config('services.dropbox.client_secret');
        $redirectUri = config('services.dropbox.redirect_uri');

        $tokenResponse = Http::asForm()
            ->withOptions(['verify' => config('services.dropbox.verify')])
            ->withBasicAuth($clientId, $clientSecret)
            ->post('https://api.dropbox.com/oauth2/token', [
                'code' => $code,
                'grant_type' => 'authorization_code',
                'redirect_uri' => $redirectUri,
            ]);

        if (! $tokenResponse->successful()) {
            Log::warning('Dropbox OAuth token exchange failed', ['body' => $tokenResponse->body()]);
            return redirect()->route('integrations.dropbox')->with('error', 'Could not connect to Dropbox. Please try again.');
        }

        $tokenData = $tokenResponse->json();
        $accessToken = $tokenData['access_token'] ?? null;
        $refreshToken = $tokenData['refresh_token'] ?? null;
        $expiresIn = (int) ($tokenData['expires_in'] ?? 14400);

        if (! $refreshToken) {
            return redirect()->route('integrations.dropbox')->with('error', 'Dropbox did not return a refresh token. Please try again and ensure you complete the authorization.');
        }

        $encryptedRefresh = Crypt::encryptString($refreshToken);
        $encryptedAccess = $accessToken ? Crypt::encryptString($accessToken) : null;
        $expiresAt = now()->addSeconds($expiresIn);

        $user->organization->forceFill([
            'dropbox_refresh_token' => $encryptedRefresh,
            'dropbox_access_token' => $encryptedAccess,
            'dropbox_token_expires_at' => $expiresAt,
        ])->save();

        // Set default recordings folder in DB and create it in Dropbox
        $defaultFolder = 'BIU Meeting Recordings';
        $user->organization->update(['dropbox_folder_name' => $defaultFolder]);
        if ($accessToken) {
            try {
                $api = new \App\Services\DropboxOrgApi($accessToken);
                $api->createFolder('/' . $defaultFolder);
            } catch (\Throwable $e) {
                Log::warning('Dropbox create folder after connect failed', ['error' => $e->getMessage()]);
            }
        }

        return redirect()->route('integrations.dropbox')->with('success', 'Dropbox connected. Meeting recordings will be saved to your Dropbox when you record in a livestream.');
    }

    /**
     * Disconnect Dropbox: clear tokens on the organization.
     */
    public function disconnectDropbox(): RedirectResponse
    {
        $user = Auth::user();
        if ($user->role !== 'organization' || ! $user->organization) {
            return redirect()->route('dashboard')->with('error', 'Only organizations can disconnect Dropbox.');
        }

        $user->organization->forceFill([
            'dropbox_refresh_token' => null,
            'dropbox_access_token' => null,
            'dropbox_token_expires_at' => null,
            'dropbox_folder_name' => null,
        ])->save();

        return redirect()->route('integrations.dropbox')->with('success', 'Dropbox disconnected.');
    }

    /**
     * Update the Dropbox folder name for recordings (organization-level default).
     */
    public function updateDropboxFolder(Request $request): RedirectResponse
    {
        $user = Auth::user();
        if ($user->role !== 'organization' || ! $user->organization) {
            return redirect()->route('dashboard')->with('error', 'Only organizations can update Dropbox folder.');
        }

        $folderName = $request->input('dropbox_folder_name');
        $folderName = is_string($folderName) ? trim($folderName) : '';
        // Dropbox path-safe: no \ / : * ? " < > |
        if ($folderName !== '') {
            $folderName = preg_replace('/[\\\\\/:*?"<>|]+/', ' ', $folderName);
            $folderName = preg_replace('/\s+/', ' ', trim($folderName));
            $folderName = trim($folderName, " \t\n\r\0\x0B.");
            $folderName = substr($folderName, 0, 255);
        }

        $user->organization->update(['dropbox_folder_name' => $folderName === '' ? null : $folderName]);

        // Create the folder in Dropbox when a name is set
        if ($folderName !== '') {
            $token = app(\App\Services\DropboxOAuthService::class)->getAccessTokenForOrganization($user->organization);
            if ($token) {
                try {
                    $api = new \App\Services\DropboxOrgApi($token);
                    $api->createFolder('/' . $folderName);
                } catch (\Throwable $e) {
                    Log::warning('Dropbox create folder on save failed', ['error' => $e->getMessage()]);
                }
            }
        }

        return redirect()->route('integrations.dropbox')->with('success', $folderName === '' ? 'Folder name cleared. Recordings will use the livestream title or default folder.' : 'Recording folder name saved and folder created in Dropbox.');
    }

    /**
     * Move recent recording files from Dropbox root into the org's recording folder.
     * Use when VDO.Ninja saved to root instead of the folder.
     */
    public function moveRecordingsToFolder(): RedirectResponse
    {
        $user = Auth::user();
        if ($user->role !== 'organization' || ! $user->organization) {
            return redirect()->route('dashboard')->with('error', 'Only organizations can run this.');
        }

        $org = $user->organization;
        $token = app(\App\Services\DropboxOAuthService::class)->getAccessTokenForOrganization($org);
        if (! $token) {
            return redirect()->route('integrations.dropbox')->with('error', 'Dropbox not connected or token expired.');
        }

        $folderName = $org->dropbox_folder_name ?: 'BIU Meeting Recordings';
        $folderName = trim(preg_replace('/[\\\\\/:*?"<>|]+/', ' ', $folderName));
        $folderName = trim($folderName, " \t\n\r\0\x0B.") ?: 'BIU Meeting Recordings';
        $folderPath = '/' . $folderName;

        $api = new \App\Services\DropboxOrgApi($token);
        $api->createFolder($folderPath);

        $files = $api->listRecentRecordingsAtRoot();
        $moved = 0;
        foreach ($files as $file) {
            $from = $file['path_display'] ?? '';
            $name = $file['name'] ?? '';
            if ($from === '' || $name === '') {
                continue;
            }
            $toPath = $folderPath . '/' . $name;
            if ($api->moveFile($from, $toPath)) {
                $moved++;
            }
        }

        $message = $moved > 0
            ? "Moved {$moved} recording(s) into \"{$folderName}\"."
            : 'No recent recordings found at Dropbox root. New recordings will be moved here after you record.';
        return redirect()->route('integrations.dropbox')->with('success', $message);
    }

    /**
     * Download a file from the org's Dropbox recording folder (redirect to temporary link).
     */
    public function downloadFile(Request $request): RedirectResponse|Response
    {
        $user = Auth::user();
        if ($user->role !== 'organization' || ! $user->organization) {
            return redirect()->route('dashboard')->with('error', 'Access denied.');
        }

        $path = $request->query('path');
        if (! is_string($path) || $path === '') {
            return redirect()->route('integrations.dropbox')->with('error', 'Invalid file.');
        }
        $path = trim($path);
        if (str_contains($path, '..')) {
            return redirect()->route('integrations.dropbox')->with('error', 'Invalid file path.');
        }

        $folderPath = $this->getDropboxRecordingFolderPath($user->organization);
        if ($folderPath === '' || ! str_starts_with($path, $folderPath)) {
            return redirect()->route('integrations.dropbox')->with('error', 'You can only download files from your recording folder.');
        }

        $token = app(\App\Services\DropboxOAuthService::class)->getAccessTokenForOrganization($user->organization);
        if (! $token) {
            return redirect()->route('integrations.dropbox')->with('error', 'Dropbox not connected.');
        }

        $api = new \App\Services\DropboxOrgApi($token);
        $link = $api->getTemporaryLink($path);
        if (! $link) {
            return redirect()->route('integrations.dropbox')->with('error', 'Could not generate download link.');
        }

        return redirect()->away($link);
    }

    /**
     * Delete a file from the org's Dropbox recording folder.
     */
    public function deleteFile(Request $request): RedirectResponse
    {
        $user = Auth::user();
        if ($user->role !== 'organization' || ! $user->organization) {
            return redirect()->route('dashboard')->with('error', 'Access denied.');
        }

        $path = $request->input('path');
        if (! is_string($path) || $path === '') {
            return redirect()->route('integrations.dropbox')->with('error', 'Invalid file.');
        }
        $path = trim($path);
        if (str_contains($path, '..')) {
            return redirect()->route('integrations.dropbox')->with('error', 'Invalid file path.');
        }

        $folderPath = $this->getDropboxRecordingFolderPath($user->organization);
        if ($folderPath === '' || ! str_starts_with($path, $folderPath)) {
            return redirect()->route('integrations.dropbox')->with('error', 'You can only delete files from your recording folder.');
        }

        $token = app(\App\Services\DropboxOAuthService::class)->getAccessTokenForOrganization($user->organization);
        if (! $token) {
            return redirect()->route('integrations.dropbox')->with('error', 'Dropbox not connected.');
        }

        $api = new \App\Services\DropboxOrgApi($token);
        if (! $api->deleteFile($path)) {
            return redirect()->route('integrations.dropbox')->with('error', 'Could not delete file.');
        }

        return redirect()->route('integrations.dropbox')->with('success', 'File deleted.');
    }

    /**
     * Rename a file in the org's Dropbox recording folder.
     */
    public function renameFile(Request $request): RedirectResponse
    {
        $user = Auth::user();
        if ($user->role !== 'organization' || ! $user->organization) {
            return redirect()->route('dashboard')->with('error', 'Access denied.');
        }

        $path = $request->input('path');
        $newName = $request->input('new_name');
        if (! is_string($path) || $path === '' || ! is_string($newName) || trim($newName) === '') {
            return redirect()->route('integrations.dropbox')->with('error', 'Invalid request.');
        }
        $path = trim($path);
        $newName = trim($newName);
        $newName = preg_replace('/[\\\\\/:*?"<>|]+/', ' ', $newName);
        $newName = trim(preg_replace('/\s+/', ' ', $newName));
        if ($newName === '') {
            return redirect()->route('integrations.dropbox')->with('error', 'Invalid file name.');
        }
        if (str_contains($path, '..')) {
            return redirect()->route('integrations.dropbox')->with('error', 'Invalid file path.');
        }

        $folderPath = $this->getDropboxRecordingFolderPath($user->organization);
        if ($folderPath === '' || ! str_starts_with($path, $folderPath)) {
            return redirect()->route('integrations.dropbox')->with('error', 'You can only rename files in your recording folder.');
        }

        $token = app(\App\Services\DropboxOAuthService::class)->getAccessTokenForOrganization($user->organization);
        if (! $token) {
            return redirect()->route('integrations.dropbox')->with('error', 'Dropbox not connected.');
        }

        $toPath = $folderPath . '/' . $newName;
        $api = new \App\Services\DropboxOrgApi($token);
        if (! $api->moveFile($path, $toPath)) {
            return redirect()->route('integrations.dropbox')->with('error', 'Could not rename file.');
        }

        return redirect()->route('integrations.dropbox')->with('success', 'File renamed.');
    }

    /**
     * Get the Dropbox recording folder path for the organization (e.g. "/BIU Meeting Recordings").
     */
    /**
     * Search Dropbox recording folder. Returns JSON with files array for the frontend.
     */
    public function searchDropbox(Request $request): \Illuminate\Http\JsonResponse
    {
        $user = Auth::user();
        if ($user->role !== 'organization' || ! $user->organization) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $org = $user->organization;
        $token = app(\App\Services\DropboxOAuthService::class)->getAccessTokenForOrganization($org);
        if (! $token) {
            return response()->json(['error' => 'Dropbox not connected'], 400);
        }

        $folderPath = $this->getDropboxRecordingFolderPath($org);
        $query = $request->input('q', '');
        $query = is_string($query) ? trim($query) : '';

        if ($query === '') {
            return response()->json(['files' => []]);
        }

        try {
            $api = new \App\Services\DropboxOrgApi($token);
            $files = $api->search($folderPath, $query);
            return response()->json(['files' => $files]);
        } catch (\Throwable $e) {
            Log::warning('Dropbox search failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Search failed', 'files' => []], 500);
        }
    }

    private function getDropboxRecordingFolderPath(\App\Models\Organization $organization): string
    {
        $folderName = $organization->dropbox_folder_name ? trim($organization->dropbox_folder_name) : 'BIU Meeting Recordings';
        $folderName = trim(preg_replace('/[\\\\\/:*?"<>|]+/', ' ', $folderName));
        $folderName = trim($folderName, " \t\n\r\0\x0B.") ?: 'BIU Meeting Recordings';
        return '/' . $folderName;
    }

    /**
     * HTTP client for YouTube OAuth (SSL verification disabled to avoid cURL 60 on Windows).
     */
    private static function httpClientWithSsl(): \Illuminate\Http\Client\PendingRequest
    {
        return Http::withOptions(['verify' => false]);
    }
}
