<?php

namespace App\Services;

use App\Models\Organization;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DropboxOAuthService
{
    /**
     * Get a valid Dropbox access token for the organization (for VDO.Ninja Cloud Sync).
     * Refreshes the token if necessary. Returns null if org has no Dropbox linked or refresh fails.
     */
    public function getAccessTokenForOrganization(Organization $organization): ?string
    {
        if (empty($organization->dropbox_refresh_token)) {
            return null;
        }

        $cachedAccess = $organization->dropbox_access_token;
        $expiresAt = $organization->dropbox_token_expires_at;
        if ($cachedAccess && $expiresAt && $expiresAt->isAfter(now()->addMinutes(5))) {
            try {
                return Crypt::decryptString($cachedAccess);
            } catch (\Throwable $e) {
                // Fall through to refresh
            }
        }

        try {
            $refreshToken = Crypt::decryptString($organization->dropbox_refresh_token);
        } catch (\Throwable $e) {
            Log::warning('Dropbox refresh token decrypt failed', ['organization_id' => $organization->id]);
            return null;
        }

        $clientId = config('services.dropbox.client_id');
        $clientSecret = config('services.dropbox.client_secret');
        if (empty($clientId) || empty($clientSecret)) {
            return null;
        }

        $response = Http::asForm()
            ->withOptions(['verify' => config('services.dropbox.verify')])
            ->withBasicAuth($clientId, $clientSecret)
            ->post('https://api.dropbox.com/oauth2/token', [
                'grant_type' => 'refresh_token',
                'refresh_token' => $refreshToken,
            ]);

        if (! $response->successful()) {
            Log::warning('Dropbox token refresh failed', [
                'organization_id' => $organization->id,
                'body' => $response->body(),
            ]);
            return null;
        }

        $data = $response->json();
        $accessToken = $data['access_token'] ?? null;
        if (! $accessToken) {
            return null;
        }

        $expiresIn = (int) ($data['expires_in'] ?? 14400);
        $organization->forceFill([
            'dropbox_access_token' => Crypt::encryptString($accessToken),
            'dropbox_token_expires_at' => now()->addSeconds($expiresIn),
        ])->save();

        return $accessToken;
    }

    /**
     * Ensure the Dropbox folder exists before VDO.Ninja records.
     * VDO.Ninja only uploads to dropboxpath when the folder already exists; otherwise it falls back to root.
     */
    public function ensureFolderExists(string $accessToken, string $folderPath): void
    {
        $api = new DropboxOrgApi($accessToken);
        $api->createFolder($folderPath);
    }
}
