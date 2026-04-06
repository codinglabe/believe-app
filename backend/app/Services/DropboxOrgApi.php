<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Dropbox API calls using an organization's OAuth access token.
 * Used to create the recordings folder and (optionally) move files into it.
 */
class DropboxOrgApi
{
    private string $accessToken;

    private const API_URL = 'https://api.dropboxapi.com/2';

    public function __construct(string $accessToken)
    {
        $this->accessToken = $accessToken;
    }

    /**
     * Create a folder in Dropbox at the given path (e.g. "/BIU Meeting Recordings").
     * Path must start with /. Returns true if created or already existed.
     * Only calls create_folder_v2 when the folder does NOT exist, so we never create duplicates.
     */
    public function createFolder(string $path): bool
    {
        $path = trim($path);
        if ($path === '' || $path[0] !== '/') {
            $path = '/' . $path;
        }

        // If folder already exists, do nothing — avoids multiple folders
        if ($this->folderExists($path)) {
            return true;
        }

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->accessToken,
            'Content-Type' => 'application/json',
        ])->withOptions(['verify' => config('services.dropbox.verify', true)])
          ->post(self::API_URL . '/files/create_folder_v2', [
              'path' => $path,
              'autorename' => false,
          ]);

        if ($response->successful()) {
            return true;
        }

        $body = $response->json();
        $errorTag = $body['error']['.tag'] ?? '';
        if ($errorTag === 'path' && ($body['error']['path']['.tag'] ?? '') === 'conflict') {
            return true;
        }

        Log::warning('Dropbox create_folder_v2 failed', [
            'path' => $path,
            'body' => $response->body(),
        ]);
        return false;
    }

    /**
     * Check if a path exists and is a folder in Dropbox.
     */
    public function folderExists(string $path): bool
    {
        $path = trim($path);
        if ($path === '' || $path[0] !== '/') {
            $path = '/' . $path;
        }

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->accessToken,
            'Content-Type' => 'application/json',
        ])->withOptions(['verify' => config('services.dropbox.verify', true)])
          ->post(self::API_URL . '/files/get_metadata', [
              'path' => $path,
          ]);

        if (! $response->successful()) {
            return false;
        }

        $data = $response->json();
        return ($data['.tag'] ?? '') === 'folder';
    }

    /** Extensions for recording files to move into folder. */
    private const RECORDING_EXTENSIONS = ['webm', 'mp4', 'mkv'];

    /** Only consider files modified in the last N seconds. */
    private const RECENT_SECONDS = 86400; // 24 hours

    /**
     * List files at path that look like recordings and were modified recently.
     * Returns array of [ 'path_display' => string, 'name' => string ].
     */
    public function listRecentRecordingsAtRoot(): array
    {
        $cutoff = now()->subSeconds(self::RECENT_SECONDS)->format('Y-m-d\TH:i:s\Z');
        $out = [];
        $cursor = null;

        do {
            $body = $cursor !== null
                ? ['cursor' => $cursor]
                : ['path' => '', 'recursive' => false];
            $endpoint = $cursor !== null ? '/files/list_folder/continue' : '/files/list_folder';

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->accessToken,
                'Content-Type' => 'application/json',
            ])->withOptions(['verify' => config('services.dropbox.verify', true)])
              ->post(self::API_URL . $endpoint, $body);

            if (! $response->successful()) {
                break;
            }

            $data = $response->json();
            foreach ($data['entries'] ?? [] as $entry) {
                if (($entry['.tag'] ?? '') !== 'file') {
                    continue;
                }
                $name = $entry['name'] ?? '';
                $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
                if (! in_array($ext, self::RECORDING_EXTENSIONS, true)) {
                    continue;
                }
                $modified = $entry['client_modified'] ?? $entry['server_modified'] ?? null;
                if ($modified !== null && $modified < $cutoff) {
                    continue;
                }
                $out[] = [
                    'path_display' => $entry['path_display'] ?? $entry['path_lower'] ?? '',
                    'name' => $name,
                ];
            }
            $cursor = $data['has_more'] ? ($data['cursor'] ?? null) : null;
        } while ($cursor);

        return $out;
    }

    /**
     * Move a file to the target folder. toPath must be full path including filename.
     */
    public function moveFile(string $fromPath, string $toPath): bool
    {
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->accessToken,
            'Content-Type' => 'application/json',
        ])->withOptions(['verify' => config('services.dropbox.verify', true)])
          ->post(self::API_URL . '/files/move_v2', [
              'from_path' => $fromPath,
              'to_path' => $toPath,
              'autorename' => true,
          ]);

        if (! $response->successful()) {
            Log::warning('Dropbox move_v2 failed', ['from' => $fromPath, 'to' => $toPath, 'body' => $response->body()]);
            return false;
        }
        return true;
    }

    /**
     * List contents of a folder (files and subfolders). Returns array of file/folder info.
     *
     * @return array<int, array{name: string, path_display: string, tag: string, size?: int, client_modified?: string}> 
     */
    public function listFolder(string $path): array
    {
        $path = trim($path);
        if ($path === '' || $path[0] !== '/') {
            $path = '/' . $path;
        }

        $out = [];
        $cursor = null;

        do {
            $body = $cursor !== null
                ? ['cursor' => $cursor]
                : ['path' => $path, 'recursive' => false];
            $endpoint = $cursor !== null ? '/files/list_folder/continue' : '/files/list_folder';

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->accessToken,
                'Content-Type' => 'application/json',
            ])->withOptions(['verify' => config('services.dropbox.verify', true)])
              ->post(self::API_URL . $endpoint, $body);

            if (! $response->successful()) {
                return $out;
            }

            $data = $response->json();
            foreach ($data['entries'] ?? [] as $entry) {
                $tag = $entry['.tag'] ?? 'file';
                $out[] = [
                    'name' => $entry['name'] ?? '',
                    'path_display' => $entry['path_display'] ?? $entry['path_lower'] ?? '',
                    'tag' => $tag,
                    'size' => $entry['size'] ?? null,
                    'client_modified' => $entry['client_modified'] ?? $entry['server_modified'] ?? null,
                ];
            }
            $cursor = $data['has_more'] ? ($data['cursor'] ?? null) : null;
        } while ($cursor);

        return $out;
    }

    /**
     * Get a temporary download link for a file (valid for a few hours).
     */
    public function getTemporaryLink(string $path): ?string
    {
        $path = trim($path);
        if ($path === '' || $path[0] !== '/') {
            $path = '/' . $path;
        }

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->accessToken,
            'Content-Type' => 'application/json',
        ])->withOptions(['verify' => config('services.dropbox.verify', true)])
          ->post(self::API_URL . '/files/get_temporary_link', [
              'path' => $path,
          ]);

        if (! $response->successful()) {
            return null;
        }

        $data = $response->json();
        return $data['link'] ?? null;
    }

    /**
     * Delete a file or folder at the given path.
     */
    public function deleteFile(string $path): bool
    {
        $path = trim($path);
        if ($path === '' || $path[0] !== '/') {
            $path = '/' . $path;
        }

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->accessToken,
            'Content-Type' => 'application/json',
        ])->withOptions(['verify' => config('services.dropbox.verify', true)])
          ->post(self::API_URL . '/files/delete_v2', [
              'path' => $path,
          ]);

        if (! $response->successful()) {
            Log::warning('Dropbox delete_v2 failed', ['path' => $path, 'body' => $response->body()]);
            return false;
        }
        return true;
    }

    /**
     * Search for files in a folder by query. Returns same shape as listFolder (file entries only).
     *
     * @return array<int, array{name: string, path_display: string, size: int, client_modified: ?string}>
     */
    public function search(string $path, string $query): array
    {
        $path = trim($path);
        if ($path === '' || $path[0] !== '/') {
            $path = '/' . $path;
        }
        $query = trim($query);
        if ($query === '') {
            return [];
        }

        $out = [];
        $cursor = null;

        do {
            if ($cursor !== null) {
                $body = ['cursor' => $cursor];
            } else {
                $body = [
                    'query' => $query,
                    'options' => [
                        'path' => $path,
                    ],
                ];
            }

            $endpoint = $cursor !== null ? '/files/search/continue_v2' : '/files/search_v2';
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->accessToken,
                'Content-Type' => 'application/json',
            ])->withOptions(['verify' => config('services.dropbox.verify', true)])
              ->post(self::API_URL . $endpoint, $body);

            if (! $response->successful()) {
                Log::warning('Dropbox search_v2 failed', ['path' => $path, 'query' => $query, 'body' => $response->body()]);
                break;
            }

            $data = $response->json();
            $matches = $data['matches'] ?? [];
            foreach ($matches as $match) {
                $meta = $match['metadata']['metadata'] ?? $match['metadata'] ?? [];
                $tag = $meta['.tag'] ?? '';
                if ($tag !== 'file') {
                    continue;
                }
                $out[] = [
                    'name' => $meta['name'] ?? '',
                    'path_display' => $meta['path_display'] ?? $meta['path_lower'] ?? '',
                    'size' => (int) ($meta['size'] ?? 0),
                    'client_modified' => $meta['client_modified'] ?? $meta['server_modified'] ?? null,
                ];
            }
            $cursor = isset($data['has_more']) && $data['has_more'] ? ($data['cursor'] ?? null) : null;
        } while ($cursor);

        return $out;
    }
}
