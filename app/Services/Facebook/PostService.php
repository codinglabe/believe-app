<?php

namespace App\Services\Facebook;

use App\Models\FacebookAccount;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PostService
{
    /**
     * Post message to Facebook page using app-specific credentials
     */
    public function postMessage(FacebookAccount $account, $message, $link = null)
    {
        $params = [
            'message' => $message,
            'access_token' => $account->page_access_token,
        ];

        if ($link) {
            $params['link'] = $link;
        }

        $response = Http::post(
            "https://graph.facebook.com/v19.0/{$account->facebook_page_id}/feed",
            $params
        );

        if (!$response->successful()) {
            throw new \Exception('Facebook API error: ' . $response->body());
        }

        return $response->json();
    }

    /**
     * Post with image using app-specific credentials.
     * Uses single-request photo publish (POST to /photos with published=true) so the image
     * appears correctly as a photo post on the page, not as a document/link attachment.
     */
    public function postWithImage(FacebookAccount $account, $message, $imagePath, $link = null)
    {
        if (!file_exists($imagePath) || !is_readable($imagePath)) {
            throw new \Exception('Image file not found or not readable: ' . $imagePath);
        }

        $filename = basename($imagePath);
        if (!preg_match('/\.(jpe?g|png|gif|bmp)$/i', $filename)) {
            $filename = pathinfo($filename, PATHINFO_FILENAME) . '.jpg';
        }
        $mimeType = $this->getImageMimeType($imagePath);

        // Single request: publish photo directly to /photos with published=true.
        // This creates a proper photo post (image visible in feed). The two-step
        // upload-then-feed flow can result in a document-style attachment.
        $fileContents = file_get_contents($imagePath);
        $params = [
            'message' => $message,
            'access_token' => $account->page_access_token,
            'published' => 'true',
        ];
        if ($link) {
            $params['link'] = $link;
        }

        $response = Http::attach(
            'source',
            $fileContents,
            $filename,
            ['Content-Type' => $mimeType]
        )->post("https://graph.facebook.com/v19.0/{$account->facebook_page_id}/photos", $params);

        if (!$response->successful()) {
            Log::error('Facebook image upload failed', [
                'response' => $response->body(),
                'status' => $response->status(),
            ]);
            throw new \Exception('Failed to upload image: ' . $response->body());
        }

        $data = $response->json();
        // /photos with published=true returns id (photo) and post_id (feed post). Use post_id for permalinks.
        if (!isset($data['post_id']) && isset($data['id'])) {
            $data['post_id'] = $data['id'];
        }
        return $data;
    }

    /**
     * Get MIME type for image file (Facebook accepts jpeg, png, gif, bmp)
     */
    private function getImageMimeType(string $path): string
    {
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $map = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'bmp' => 'image/bmp',
        ];
        if (isset($map[$ext])) {
            return $map[$ext];
        }
        $detected = @mime_content_type($path);
        return $detected ?: 'image/jpeg';
    }

    /**
     * Post with video using app-specific credentials
     */
    public function postWithVideo(FacebookAccount $account, $message, $videoPath, $description = null)
    {
        // Facebook video upload is a multi-step process
        // Start upload session
        $startResponse = Http::post(
            "https://graph.facebook.com/v19.0/{$account->facebook_page_id}/videos",
            [
                'access_token' => $account->page_access_token,
                'upload_phase' => 'start',
                'file_size' => filesize($videoPath),
            ]
        );

        if (!$startResponse->successful()) {
            throw new \Exception('Failed to start video upload: ' . $startResponse->body());
        }

        $startData = $startResponse->json();
        $videoId = $startData['video_id'];
        $uploadSessionId = $startData['upload_session_id'];

        // Upload video in chunks
        $chunkSize = 4 * 1024 * 1024; // 4MB chunks
        $fileSize = filesize($videoPath);
        $handle = fopen($videoPath, 'r');

        $startOffset = 0;
        while ($startOffset < $fileSize) {
            $chunk = fread($handle, $chunkSize);
            $endOffset = $startOffset + strlen($chunk) - 1;

            $transferResponse = Http::withHeaders([
                'Content-Type' => 'application/octet-stream',
                'Content-Range' => "bytes {$startOffset}-{$endOffset}/{$fileSize}",
            ])->post($startData['upload_url'], $chunk);

            if (!$transferResponse->successful()) {
                fclose($handle);
                throw new \Exception('Failed to upload video chunk: ' . $transferResponse->body());
            }

            $startOffset = $endOffset + 1;
        }

        fclose($handle);

        // Finish upload
        $finishResponse = Http::post(
            "https://graph.facebook.com/v19.0/{$videoId}",
            [
                'access_token' => $account->page_access_token,
                'upload_phase' => 'finish',
                'upload_session_id' => $uploadSessionId,
                'description' => $description,
            ]
        );

        if (!$finishResponse->successful()) {
            throw new \Exception('Failed to finish video upload: ' . $finishResponse->body());
        }

        // Create post with video
        $postResponse = Http::post(
            "https://graph.facebook.com/v19.0/{$account->facebook_page_id}/feed",
            [
                'message' => $message,
                'attached_media[0]' => json_encode(['media_fbid' => $videoId]),
                'access_token' => $account->page_access_token,
            ]
        );

        if (!$postResponse->successful()) {
            throw new \Exception('Failed to create post with video: ' . $postResponse->body());
        }

        return $postResponse->json();
    }

    /**
     * Get page info using app-specific credentials
     */
    public function getPageInfoForApp(FacebookAccount $account)
    {
        $response = Http::get("https://graph.facebook.com/v19.0/{$account->facebook_page_id}", [
            'access_token' => $account->page_access_token,
            'fields' => 'id,name,category,followers_count,picture{url},cover,about,description',
        ]);

        if (!$response->successful()) {
            throw new \Exception('Failed to get page info: ' . $response->body());
        }

        return $response->json();
    }

    /**
     * Delete post using app-specific credentials
     */
    public function deletePost(FacebookAccount $account, $postId)
    {
        $response = Http::delete("https://graph.facebook.com/v19.0/{$postId}", [
            'access_token' => $account->page_access_token,
        ]);

        if (!$response->successful()) {
            throw new \Exception('Failed to delete post: ' . $response->body());
        }

        return $response->json();
    }

    /**
     * Get page insights using app-specific credentials
     */
    public function getPageInsights(FacebookAccount $account, $metric = 'page_post_engagements')
    {
        $response = Http::get("https://graph.facebook.com/v19.0/{$account->facebook_page_id}/insights/{$metric}", [
            'access_token' => $account->page_access_token,
            'period' => 'day',
        ]);

        if (!$response->successful()) {
            throw new \Exception('Failed to get page insights: ' . $response->body());
        }

        return $response->json('data', []);
    }
}
