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
            $path = '/'.$path;
        }

        // If folder already exists, do nothing — avoids multiple folders
        if ($this->folderExists($path)) {
            return true;
        }

        $response = Http::withHeaders([
            'Authorization' => 'Bearer '.$this->accessToken,
            'Content-Type' => 'application/json',
        ])->withOptions(['verify' => config('services.dropbox.verify', true)])
            ->post(self::API_URL.'/files/create_folder_v2', [
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
            $path = '/'.$path;
        }

        $response = Http::withHeaders([
            'Authorization' => 'Bearer '.$this->accessToken,
            'Content-Type' => 'application/json',
        ])->withOptions(['verify' => config('services.dropbox.verify', true)])
            ->post(self::API_URL.'/files/get_metadata', [
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
                'Authorization' => 'Bearer '.$this->accessToken,
                'Content-Type' => 'application/json',
            ])->withOptions(['verify' => config('services.dropbox.verify', true)])
                ->post(self::API_URL.$endpoint, $body);

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
            'Authorization' => 'Bearer '.$this->accessToken,
            'Content-Type' => 'application/json',
        ])->withOptions(['verify' => config('services.dropbox.verify', true)])
            ->post(self::API_URL.'/files/move_v2', [
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
            $path = '/'.$path;
        }

        $out = [];
        $cursor = null;

        do {
            $body = $cursor !== null
                ? ['cursor' => $cursor]
                : ['path' => $path, 'recursive' => false];
            $endpoint = $cursor !== null ? '/files/list_folder/continue' : '/files/list_folder';

            $response = Http::withHeaders([
                'Authorization' => 'Bearer '.$this->accessToken,
                'Content-Type' => 'application/json',
            ])->withOptions(['verify' => config('services.dropbox.verify', true)])
                ->post(self::API_URL.$endpoint, $body);

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
     * List all entries under a path recursively (files and folders).
     *
     * @return array<int, array{name: string, path_display: string, tag: string}>
     */
    public function listFolderRecursive(string $path): array
    {
        $path = trim($path);
        if ($path === '' || $path[0] !== '/') {
            $path = '/'.$path;
        }

        $out = [];
        $cursor = null;

        do {
            $body = $cursor !== null
                ? ['cursor' => $cursor]
                : ['path' => $path, 'recursive' => true];
            $endpoint = $cursor !== null ? '/files/list_folder/continue' : '/files/list_folder';

            $response = Http::withHeaders([
                'Authorization' => 'Bearer '.$this->accessToken,
                'Content-Type' => 'application/json',
            ])->withOptions(['verify' => config('services.dropbox.verify', true)])
                ->timeout(120)
                ->post(self::API_URL.$endpoint, $body);

            if (! $response->successful()) {
                Log::warning('Dropbox list_folder recursive failed', [
                    'path' => $path,
                    'body' => $response->body(),
                ]);

                return $out;
            }

            $data = $response->json();
            foreach ($data['entries'] ?? [] as $entry) {
                $out[] = [
                    'name' => $entry['name'] ?? '',
                    'path_display' => $entry['path_display'] ?? $entry['path_lower'] ?? '',
                    'tag' => $entry['.tag'] ?? 'file',
                ];
            }
            $cursor = $data['has_more'] ? ($data['cursor'] ?? null) : null;
        } while ($cursor);

        return $out;
    }

    /**
     * Upload file contents to Dropbox (add, autorename on conflict).
     * Pass a stream resource to avoid loading large videos into memory.
     *
     * @param  string|resource  $body
     * @return array{path_display: string}|null
     */
    public function upload(string $path, $body): ?array
    {
        $path = trim($path);
        if ($path === '' || $path[0] !== '/') {
            $path = '/'.$path;
        }

        $arg = json_encode([
            'path' => $path,
            'mode' => 'add',
            'autorename' => true,
            'mute' => false,
        ], JSON_THROW_ON_ERROR);

        $response = Http::withHeaders([
            'Authorization' => 'Bearer '.$this->accessToken,
            'Content-Type' => 'application/octet-stream',
            'Dropbox-API-Arg' => $arg,
        ])->withOptions(['verify' => config('services.dropbox.verify', true)])
            ->timeout(600)
            ->connectTimeout(60)
            ->send('POST', 'https://content.dropboxapi.com/2/files/upload', [
                'body' => $body,
            ]);

        if (! $response->successful()) {
            Log::warning('Dropbox files/upload failed', [
                'path' => $path,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return null;
        }

        $data = $response->json();
        $display = $data['path_display'] ?? $data['path_lower'] ?? null;

        return is_string($display) && $display !== '' ? ['path_display' => $display] : null;
    }

    /** Dropbox single-request upload limit is 150 MB; use sessions above this. */
    private const SINGLE_UPLOAD_MAX_BYTES = 140 * 1024 * 1024;

    private const UPLOAD_SESSION_CHUNK_BYTES = 8 * 1024 * 1024;

    /**
     * Upload a local file path to Dropbox (streams from disk; uses sessions for large files).
     *
     * @return array{path_display: string}|null
     */
    public function uploadFromLocalPath(string $dropboxPath, string $absoluteLocalPath): ?array
    {
        if (! is_readable($absoluteLocalPath)) {
            Log::warning('Dropbox uploadFromLocalPath: file not readable', ['path' => $absoluteLocalPath]);

            return null;
        }

        $size = filesize($absoluteLocalPath);
        if ($size !== false && $size > self::SINGLE_UPLOAD_MAX_BYTES) {
            return $this->uploadLargeFromLocalPath($dropboxPath, $absoluteLocalPath);
        }

        $stream = fopen($absoluteLocalPath, 'rb');
        if ($stream === false) {
            return null;
        }

        try {
            return $this->upload($dropboxPath, $stream);
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
        }
    }

    /**
     * Upload large local files via Dropbox upload sessions (chunked).
     *
     * @return array{path_display: string}|null
     */
    public function uploadLargeFromLocalPath(string $dropboxPath, string $absoluteLocalPath): ?array
    {
        $dropboxPath = trim($dropboxPath);
        if ($dropboxPath === '' || $dropboxPath[0] !== '/') {
            $dropboxPath = '/'.$dropboxPath;
        }

        $handle = fopen($absoluteLocalPath, 'rb');
        if ($handle === false) {
            return null;
        }

        $sessionId = null;
        $offset = 0;

        try {
            while (! feof($handle)) {
                $chunk = fread($handle, self::UPLOAD_SESSION_CHUNK_BYTES);
                if ($chunk === false || $chunk === '') {
                    break;
                }

                $chunkLen = strlen($chunk);
                $isLast = feof($handle);

                if ($sessionId === null) {
                    $startArg = json_encode([
                        'close' => $isLast,
                        'session_type' => ['.tag' => 'sequential'],
                    ], JSON_THROW_ON_ERROR);

                    $response = Http::withHeaders([
                        'Authorization' => 'Bearer '.$this->accessToken,
                        'Content-Type' => 'application/octet-stream',
                        'Dropbox-API-Arg' => $startArg,
                    ])->withOptions(['verify' => config('services.dropbox.verify', true)])
                        ->timeout(7200)
                        ->connectTimeout(60)
                        ->withBody($chunk, 'application/octet-stream')
                        ->post('https://content.dropboxapi.com/2/files/upload_session/start');

                    if (! $response->successful()) {
                        Log::warning('Dropbox upload_session/start failed', [
                            'status' => $response->status(),
                            'body' => $response->body(),
                        ]);

                        return null;
                    }

                    $sessionId = $response->json('session_id');
                    if (! is_string($sessionId) || $sessionId === '') {
                        return null;
                    }

                    $offset += $chunkLen;

                    if ($isLast) {
                        break;
                    }

                    continue;
                }

                $appendArg = json_encode([
                    'cursor' => [
                        'session_id' => $sessionId,
                        'offset' => $offset,
                    ],
                    'close' => $isLast,
                ], JSON_THROW_ON_ERROR);

                $response = Http::withHeaders([
                    'Authorization' => 'Bearer '.$this->accessToken,
                    'Content-Type' => 'application/octet-stream',
                    'Dropbox-API-Arg' => $appendArg,
                ])->withOptions(['verify' => config('services.dropbox.verify', true)])
                    ->timeout(7200)
                    ->connectTimeout(60)
                    ->withBody($chunk, 'application/octet-stream')
                    ->post('https://content.dropboxapi.com/2/files/upload_session/append_v2');

                if (! $response->successful()) {
                    Log::warning('Dropbox upload_session/append_v2 failed', [
                        'offset' => $offset,
                        'status' => $response->status(),
                        'body' => $response->body(),
                    ]);

                    return null;
                }

                $offset += $chunkLen;
            }

            if ($sessionId === null) {
                return null;
            }

            $finishArg = json_encode([
                'cursor' => [
                    'session_id' => $sessionId,
                    'offset' => $offset,
                ],
                'commit' => [
                    'path' => $dropboxPath,
                    'mode' => 'add',
                    'autorename' => true,
                    'mute' => false,
                ],
            ], JSON_THROW_ON_ERROR);

            $response = Http::withHeaders([
                'Authorization' => 'Bearer '.$this->accessToken,
                'Content-Type' => 'application/octet-stream',
                'Dropbox-API-Arg' => $finishArg,
            ])->withOptions(['verify' => config('services.dropbox.verify', true)])
                ->timeout(7200)
                ->connectTimeout(60)
                ->withBody('', 'application/octet-stream')
                ->post('https://content.dropboxapi.com/2/files/upload_session/finish');

            if (! $response->successful()) {
                Log::warning('Dropbox upload_session/finish failed', [
                    'path' => $dropboxPath,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return null;
            }

            $data = $response->json();
            $display = $data['path_display'] ?? $data['path_lower'] ?? null;

            return is_string($display) && $display !== '' ? ['path_display' => $display] : null;
        } finally {
            if (is_resource($handle)) {
                fclose($handle);
            }
        }
    }

    /**
     * Create a viewable shared link for a file path (best-effort).
     */
    public function createSharedLink(string $path): ?string
    {
        $path = trim($path);
        if ($path === '' || $path[0] !== '/') {
            $path = '/'.$path;
        }

        $response = Http::withHeaders([
            'Authorization' => 'Bearer '.$this->accessToken,
            'Content-Type' => 'application/json',
        ])->withOptions(['verify' => config('services.dropbox.verify', true)])
            ->post(self::API_URL.'/sharing/create_shared_link_with_settings', [
                'path' => $path,
                'settings' => [
                    'requested_visibility' => ['.tag' => 'public'],
                ],
            ]);

        if (! $response->successful()) {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer '.$this->accessToken,
                'Content-Type' => 'application/json',
            ])->withOptions(['verify' => config('services.dropbox.verify', true)])
                ->post(self::API_URL.'/sharing/create_shared_link_with_settings', [
                    'path' => $path,
                ]);
        }

        if ($response->successful()) {
            $url = $response->json('url');
            if (is_string($url) && $url !== '') {
                return str_contains($url, '?') ? $url.'&raw=1' : $url.'?raw=1';
            }
        }

        $body = $response->json();
        $err = $body['error'] ?? [];
        $errTag = is_array($err) ? ($err['.tag'] ?? '') : '';
        if ($errTag === 'shared_link_already_exists' && is_array($err['shared_link_already_exists'] ?? null)) {
            $inner = $err['shared_link_already_exists'];
            $url = $inner['url'] ?? ($inner['metadata']['url'] ?? null);
            if (is_string($url) && $url !== '') {
                return str_contains($url, '?') ? $url.'&raw=1' : $url.'?raw=1';
            }
        }

        Log::warning('Dropbox create_shared_link_with_settings failed', [
            'path' => $path,
            'body' => $response->body(),
        ]);

        return null;
    }

    /**
     * Download a file from Dropbox to a local path (for server-side processing).
     */
    public function downloadToPath(string $path, string $localPath): bool
    {
        $path = $this->normalizeDropboxPath($path);

        $dir = dirname($localPath);
        if (! is_dir($dir) && ! mkdir($dir, 0755, true) && ! is_dir($dir)) {
            return false;
        }

        if ($this->downloadToPathViaContentApi($path, $localPath)) {
            return true;
        }

        $resolvedPath = $this->resolveDownloadPath($path);
        if ($resolvedPath !== null && $resolvedPath !== $path && $this->downloadToPathViaContentApi($resolvedPath, $localPath)) {
            return true;
        }

        return $this->downloadToPathViaTemporaryLink($resolvedPath ?? $path, $localPath);
    }

    private function normalizeDropboxPath(string $path): string
    {
        $path = trim($path);
        if ($path === '' || $path[0] !== '/') {
            $path = '/'.$path;
        }

        return preg_replace('#/+#', '/', $path) ?: $path;
    }

    private function downloadToPathViaContentApi(string $path, string $localPath): bool
    {
        if (is_file($localPath)) {
            @unlink($localPath);
        }

        $apiArg = json_encode(['path' => $path], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);

        $response = Http::withHeaders([
            'Authorization' => 'Bearer '.$this->accessToken,
            'Content-Type' => 'application/octet-stream',
            'Dropbox-API-Arg' => $apiArg,
        ])->withOptions(['verify' => config('services.dropbox.verify', true)])
            ->timeout(7200)
            ->connectTimeout(60)
            ->withBody('', 'application/octet-stream')
            ->sink($localPath)
            ->post('https://content.dropboxapi.com/2/files/download');

        if ($response->successful() && is_file($localPath) && filesize($localPath) > 0) {
            return true;
        }

        if (is_file($localPath)) {
            @unlink($localPath);
        }

        Log::warning('Dropbox files/download failed', [
            'path' => $path,
            'status' => $response->status(),
            'body' => $response->body(),
        ]);

        return false;
    }

    private function downloadToPathViaTemporaryLink(string $path, string $localPath): bool
    {
        $link = $this->getTemporaryLink($path);
        if ($link === null || $link === '') {
            Log::warning('Dropbox get_temporary_link failed for download fallback', ['path' => $path]);

            return false;
        }

        if (is_file($localPath)) {
            @unlink($localPath);
        }

        $response = Http::withOptions(['verify' => config('services.dropbox.verify', true)])
            ->timeout(7200)
            ->connectTimeout(60)
            ->sink($localPath)
            ->get($link);

        if ($response->successful() && is_file($localPath) && filesize($localPath) > 0) {
            Log::info('Dropbox download succeeded via temporary link', ['path' => $path]);

            return true;
        }

        if (is_file($localPath)) {
            @unlink($localPath);
        }

        Log::warning('Dropbox temporary link download failed', [
            'path' => $path,
            'status' => $response->status(),
        ]);

        return false;
    }

    /**
     * Resolve canonical path_display from Dropbox metadata (fixes path casing / encoding mismatches).
     */
    private function resolveDownloadPath(string $path): ?string
    {
        $path = $this->normalizeDropboxPath($path);

        $response = Http::withHeaders([
            'Authorization' => 'Bearer '.$this->accessToken,
            'Content-Type' => 'application/json',
        ])->withOptions(['verify' => config('services.dropbox.verify', true)])
            ->post(self::API_URL.'/files/get_metadata', [
                'path' => $path,
                'include_media_info' => false,
            ]);

        if (! $response->successful()) {
            return null;
        }

        $data = $response->json();
        $display = $data['path_display'] ?? null;

        return is_string($display) && $display !== '' ? $this->normalizeDropboxPath($display) : null;
    }

    /**
     * Get a temporary download link for a file (valid for a few hours).
     */
    public function getTemporaryLink(string $path): ?string
    {
        $path = trim($path);
        if ($path === '' || $path[0] !== '/') {
            $path = '/'.$path;
        }

        $response = Http::withHeaders([
            'Authorization' => 'Bearer '.$this->accessToken,
            'Content-Type' => 'application/json',
        ])->withOptions(['verify' => config('services.dropbox.verify', true)])
            ->post(self::API_URL.'/files/get_temporary_link', [
                'path' => $path,
            ]);

        if (! $response->successful()) {
            Log::warning('Dropbox get_temporary_link failed', [
                'path' => $path,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

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
            $path = '/'.$path;
        }

        $response = Http::withHeaders([
            'Authorization' => 'Bearer '.$this->accessToken,
            'Content-Type' => 'application/json',
        ])->withOptions(['verify' => config('services.dropbox.verify', true)])
            ->post(self::API_URL.'/files/delete_v2', [
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
            $path = '/'.$path;
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
                'Authorization' => 'Bearer '.$this->accessToken,
                'Content-Type' => 'application/json',
            ])->withOptions(['verify' => config('services.dropbox.verify', true)])
                ->post(self::API_URL.$endpoint, $body);

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

        return self::sortByModifiedDesc($out);
    }

    /**
     * @param  array<int, array{client_modified?: ?string, ...}>  $files
     * @return array<int, array{client_modified?: ?string, ...}>
     */
    public static function sortByModifiedDesc(array $files): array
    {
        usort($files, static function (array $a, array $b): int {
            $tb = strtotime((string) ($b['client_modified'] ?? '')) ?: 0;
            $ta = strtotime((string) ($a['client_modified'] ?? '')) ?: 0;

            return $tb <=> $ta;
        });

        return $files;
    }
}
