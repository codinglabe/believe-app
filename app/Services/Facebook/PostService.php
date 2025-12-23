<?php

namespace App\Services\Facebook;

use App\Models\FacebookAccount;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\Client\Response;
use Exception;

class PostService
{
    private string $apiVersion = 'v21.0';

    /**
     * Post a simple message to Facebook page
    */
    // public function postMessage(FacebookAccount $account, string $message, ?string $link = null): array
    // {
    //     $url = "https://graph.facebook.com/{$this->apiVersion}/{$account->facebook_page_id}/feed";

    //     $data = [
    //         'message' => $message,
    //         'access_token' => $account->page_access_token,
    //     ];

    //     if ($link) {
    //         $data['link'] = $link;
    //     }

    //     $response = Http::post($url, $data);

    //     return $this->handleResponse($response);
    // }

    /**
     * Post with image
     */

    public function postWithImage(FacebookAccount $account, string $message, string $imagePath, ?string $link = null): array
    {
        \Log::info('postWithImage called:', [
            'image_path' => $imagePath,
            'file_exists' => file_exists($imagePath),
            'is_file' => is_file($imagePath),
        ]);

        try {
            // Check if file exists
            if (!file_exists($imagePath) || !is_file($imagePath)) {
                throw new Exception('Image file not found: ' . $imagePath);
            }

            // Upload image directly to Facebook using multipart form
            $url = "https://graph.facebook.com/{$this->apiVersion}/{$account->facebook_page_id}/photos";

            $params = [
                'message' => $message,
                'access_token' => $account->page_access_token,
            ];

            if ($link) {
                $params['link'] = $link;
            }

            \Log::info('Uploading to Facebook:', [
                'url' => $url,
                'page_id' => $account->facebook_page_id,
                'file_size' => filesize($imagePath),
                'mime_type' => mime_content_type($imagePath),
            ]);

            // Use multipart form data for file upload
            $response = Http::timeout(60)
                ->attach(
                    'source',
                    fopen($imagePath, 'r'),
                    basename($imagePath)
                )
                ->post($url, $params);

            \Log::info('Facebook API response:', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return $this->handleResponse($response);

        } catch (Exception $e) {
            \Log::error('postWithImage error:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    /**
     * Alternative method: Direct image upload (simpler)
     */
    public function postImageDirect(FacebookAccount $account, string $message, string $imagePath, ?string $link = null): array
    {
        $url = "https://graph.facebook.com/{$this->apiVersion}/{$account->facebook_page_id}/photos";

        // Create multipart form data
        $multipart = [
            [
                'name' => 'message',
                'contents' => $message,
            ],
            [
                'name' => 'access_token',
                'contents' => $account->page_access_token,
            ],
        ];

        if ($link) {
            $multipart[] = [
                'name' => 'link',
                'contents' => $link,
            ];
        }

        // Add image file
        if (file_exists($imagePath)) {
            $multipart[] = [
                'name' => 'source',
                'contents' => fopen($imagePath, 'r'),
                'filename' => basename($imagePath),
            ];
        }

        $response = Http::timeout(60)
            ->withOptions([
                'multipart' => $multipart,
            ])
            ->post($url);

        return $this->handleResponse($response);
    }

    /**
     * Method 3: Using Guzzle directly (most reliable)
     */
    public function postImageWithGuzzle(FacebookAccount $account, string $message, string $imagePath, ?string $link = null): array
    {
        $client = new \GuzzleHttp\Client(['timeout' => 60]);

        $url = "https://graph.facebook.com/{$this->apiVersion}/{$account->facebook_page_id}/photos";

        $multipart = [
            [
                'name' => 'message',
                'contents' => $message,
            ],
            [
                'name' => 'access_token',
                'contents' => $account->page_access_token,
            ],
        ];

        if ($link) {
            $multipart[] = [
                'name' => 'link',
                'contents' => $link,
            ];
        }

        // Add image
        if (file_exists($imagePath)) {
            $multipart[] = [
                'name' => 'source',
                'contents' => fopen($imagePath, 'r'),
                'filename' => basename($imagePath),
                'headers' => [
                    'Content-Type' => mime_content_type($imagePath),
                ],
            ];
        }

        try {
            $response = $client->post($url, [
                'multipart' => $multipart,
            ]);

            $body = json_decode($response->getBody()->getContents(), true);

            \Log::info('Guzzle response:', $body);

            return $body;

        } catch (\GuzzleHttp\Exception\RequestException $e) {
            $error = json_decode($e->getResponse()->getBody()->getContents(), true);
            throw new Exception('Facebook API Error: ' . ($error['error']['message'] ?? $e->getMessage()));
        }
    }

    // ... keep other methods as they are ...

    /**
     * Post a simple message to Facebook page
     */
    public function postMessage(FacebookAccount $account, string $message, ?string $link = null): array
    {
        $url = "https://graph.facebook.com/{$this->apiVersion}/{$account->facebook_page_id}/feed";

        $data = [
            'message' => $message,
            'access_token' => $account->page_access_token,
        ];

        if ($link) {
            $data['link'] = $link;
        }

        $response = Http::post($url, $data);

        \Log::info('Text post response:', [
            'status' => $response->status(),
            'body' => $response->body(),
        ]);

        return $this->handleResponse($response);
    }

    /**
     * Post with video
     */
    public function postWithVideo(FacebookAccount $account, string $message, $video, ?string $description = null): array
    {
        $url = "https://graph.facebook.com/{$this->apiVersion}/{$account->facebook_page_id}/videos";

        if ($video instanceof \Illuminate\Http\UploadedFile) {
            $response = Http::attach(
                'source',
                fopen($video->path(), 'r'),
                $video->getClientOriginalName()
            )->post($url, [
                        'title' => $message,
                        'description' => $description,
                        'access_token' => $account->page_access_token,
                    ]);

            return $this->handleResponse($response);
        }

        // Handle file path (string)
        if (is_string($video) && file_exists($video)) {
            $response = Http::timeout(120) // Videos can take longer
                ->attach(
                    'source',
                    fopen($video, 'r'),
                    basename($video)
                )->post($url, [
                    'title' => $message,
                    'description' => $description ?? $message,
                    'access_token' => $account->page_access_token,
                ]);

            return $this->handleResponse($response);
        }

        throw new Exception('Invalid video format. Expected UploadedFile or valid file path.');
    }

    /**
     * Upload image to Facebook
     */
    private function uploadImage(FacebookAccount $account, $image): string
    {
        if (is_string($image) && filter_var($image, FILTER_VALIDATE_URL)) {
            return $image;
        }

        if ($image instanceof \Illuminate\Http\UploadedFile) {
            // Store locally temporarily
            $path = $image->store('temp/facebook');
            $fullPath = Storage::path($path);

            // Upload to Facebook
            $url = "https://graph.facebook.com/{$this->apiVersion}/{$account->facebook_page_id}/photos";

            $response = Http::attach(
                'source',
                fopen($fullPath, 'r'),
                basename($fullPath)
            )->post($url, [
                        'published' => false,
                        'access_token' => $account->page_access_token,
                    ]);

            // Clean up temp file
            Storage::delete($path);

            $data = $this->handleResponse($response);

            if (isset($data['id'])) {
                // Get the uploaded image URL
                $photoUrl = "https://graph.facebook.com/{$this->apiVersion}/{$data['id']}?fields=images&access_token={$account->page_access_token}";
                $photoResponse = Http::get($photoUrl);
                $photoData = $photoResponse->json();

                return $photoData['images'][0]['source'] ?? '';
            }
        }

        throw new Exception('Invalid image format');
    }

    /**
     * Delete a post
     */
    public function deletePost(FacebookAccount $account, string $postId): bool
    {
        $url = "https://graph.facebook.com/{$this->apiVersion}/{$postId}";

        $response = Http::delete($url, [
            'access_token' => $account->page_access_token,
        ]);

        return $response->successful();
    }

    /**
     * Get page insights
     */
    public function getPageInsights(FacebookAccount $account, string $metric = 'page_impressions'): array
    {
        $url = "https://graph.facebook.com/{$this->apiVersion}/{$account->facebook_page_id}/insights";

        $response = Http::get($url, [
            'metric' => $metric,
            'access_token' => $account->page_access_token,
        ]);

        return $this->handleResponse($response);
    }

    /**
     * Test connection to Facebook page
     */
    public function testConnection(FacebookAccount $account): bool
    {
        try {
            $url = "https://graph.facebook.com/{$this->apiVersion}/{$account->facebook_page_id}";

            $response = Http::get($url, [
                'fields' => 'id,name',
                'access_token' => $account->page_access_token,
            ]);

            return $response->successful();
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Get page basic info
     */
    public function getPageInfo(FacebookAccount $account): array
    {
        $url = "https://graph.facebook.com/{$this->apiVersion}/{$account->facebook_page_id}";

        $response = Http::get($url, [
            'fields' => 'id,name,username,picture{url},fan_count,followers_count,link,verification_status,category',
            'access_token' => $account->page_access_token,
        ]);

        return $this->handleResponse($response);
    }

    /**
     * Handle API response
     */
    private function handleResponse(Response $response): array
    {
        if ($response->successful()) {
            return $response->json();
        }

        $errorData = $response->json();
        $errorMessage = $errorData['error']['message'] ?? 'Unknown Facebook API error';
        $errorCode = $errorData['error']['code'] ?? 0;

        throw new Exception("Facebook API Error {$errorCode}: {$errorMessage}");
    }
}
