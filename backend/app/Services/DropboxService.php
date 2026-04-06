<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class DropboxService
{
    protected $accessToken;
    protected $apiUrl = 'https://api.dropboxapi.com/2';
    protected $contentUrl = 'https://content.dropboxapi.com/2';

    public function __construct()
    {
        $this->accessToken = config('services.dropbox.access_token');
    }

    public function uploadFile(string $localPath, string $dropboxPath): array
    {
        try {
            $fileContent = Storage::disk('local')->get($localPath);
            $fileSize = Storage::disk('local')->size($localPath);

            Log::info('Starting Dropbox upload', [
                'local_path' => $localPath,
                'dropbox_path' => $dropboxPath,
                'file_size' => $fileSize,
            ]);

            // For files larger than 150MB, use upload session
            if ($fileSize > 150 * 1024 * 1024) {
                return $this->uploadLargeFile($fileContent, $dropboxPath, $fileSize);
            }

            // Simple upload for smaller files
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->accessToken,
                'Content-Type' => 'application/octet-stream',
                'Dropbox-API-Arg' => json_encode([
                    'path' => $dropboxPath,
                    'mode' => 'add',
                    'autorename' => true,
                ]),
            ])->withBody($fileContent, 'application/octet-stream')
              ->post($this->contentUrl . '/files/upload');

            if ($response->successful()) {
                $result = $response->json();
                
                Log::info('Dropbox upload successful', [
                    'dropbox_path' => $dropboxPath,
                    'file_id' => $result['id'] ?? null,
                ]);

                return [
                    'success' => true,
                    'path' => $result['path_display'],
                    'id' => $result['id'],
                ];
            }

            Log::error('Dropbox upload failed', [
                'status' => $response->status(),
                'response' => $response->body(),
            ]);

            return [
                'success' => false,
                'error' => 'Upload failed: ' . $response->body(),
            ];
        } catch (\Exception $e) {
            Log::error('Dropbox upload exception', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    protected function uploadLargeFile(string $fileContent, string $dropboxPath, int $fileSize): array
    {
        try {
            // Start upload session
            $sessionResponse = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->accessToken,
                'Content-Type' => 'application/octet-stream',
            ])->post($this->contentUrl . '/files/upload_session/start');

            if (!$sessionResponse->successful()) {
                return [
                    'success' => false,
                    'error' => 'Failed to start upload session',
                ];
            }

            $sessionId = $sessionResponse->json()['session_id'];
            $chunkSize = 8 * 1024 * 1024; // 8MB chunks
            $offset = 0;

            // Upload chunks
            while ($offset < $fileSize) {
                $chunk = substr($fileContent, $offset, $chunkSize);
                $chunkLength = strlen($chunk);

                $appendResponse = Http::withHeaders([
                    'Authorization' => 'Bearer ' . $this->accessToken,
                    'Content-Type' => 'application/octet-stream',
                    'Dropbox-API-Arg' => json_encode([
                        'session_id' => $sessionId,
                        'offset' => $offset,
                    ]),
                ])->withBody($chunk, 'application/octet-stream')
                  ->post($this->contentUrl . '/files/upload_session/append_v2');

                if (!$appendResponse->successful()) {
                    return [
                        'success' => false,
                        'error' => 'Failed to upload chunk at offset ' . $offset,
                    ];
                }

                $offset += $chunkLength;
            }

            // Finish upload session
            $finishResponse = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->accessToken,
                'Content-Type' => 'application/octet-stream',
                'Dropbox-API-Arg' => json_encode([
                    'cursor' => [
                        'session_id' => $sessionId,
                        'offset' => $offset,
                    ],
                    'commit' => [
                        'path' => $dropboxPath,
                        'mode' => 'add',
                        'autorename' => true,
                    ],
                ]),
            ])->post($this->contentUrl . '/files/upload_session/finish');

            if ($finishResponse->successful()) {
                $result = $finishResponse->json();
                
                return [
                    'success' => true,
                    'path' => $result['path_display'],
                    'id' => $result['id'],
                ];
            }

            return [
                'success' => false,
                'error' => 'Failed to finish upload session',
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    public function getTemporaryDownloadUrl(string $dropboxPath): string
    {
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->accessToken,
            'Content-Type' => 'application/json',
        ])->post($this->apiUrl . '/files/get_temporary_link', [
            'path' => $dropboxPath,
        ]);

        if ($response->successful()) {
            return $response->json()['link'];
        }

        throw new \Exception('Failed to get download URL: ' . $response->body());
    }

    public function getStreamingUrl(string $dropboxPath): string
    {
        // For streaming, we can use the same temporary link
        return $this->getTemporaryDownloadUrl($dropboxPath);
    }

    public function deleteFile(string $dropboxPath): bool
    {
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->accessToken,
            'Content-Type' => 'application/json',
        ])->post($this->apiUrl . '/files/delete_v2', [
            'path' => $dropboxPath,
        ]);

        return $response->successful();
    }

    public function getFileInfo(string $dropboxPath): ?array
    {
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->accessToken,
            'Content-Type' => 'application/json',
        ])->post($this->apiUrl . '/files/get_metadata', [
            'path' => $dropboxPath,
        ]);

        if ($response->successful()) {
            return $response->json();
        }

        return null;
    }
}
