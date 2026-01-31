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
     * Post with image using app-specific credentials
     */
    public function postWithImage(FacebookAccount $account, $message, $imagePath, $link = null)
    {
        // First upload the image
        $uploadResponse = Http::attach(
            'source',
            fopen($imagePath, 'r'),
            basename($imagePath)
        )->post("https://graph.facebook.com/v19.0/{$account->facebook_page_id}/photos", [
            'access_token' => $account->page_access_token,
            'published' => false,
        ]);

        if (!$uploadResponse->successful()) {
            throw new \Exception('Failed to upload image: ' . $uploadResponse->body());
        }

        $photoData = $uploadResponse->json();

        // Then create post with the photo
        $params = [
            'message' => $message,
            'attached_media[0]' => json_encode(['media_fbid' => $photoData['id']]),
            'access_token' => $account->page_access_token,
        ];

        if ($link) {
            $params['link'] = $link;
        }

        $postResponse = Http::post(
            "https://graph.facebook.com/v19.0/{$account->facebook_page_id}/feed",
            $params
        );

        if (!$postResponse->successful()) {
            throw new \Exception('Failed to create post with image: ' . $postResponse->body());
        }

        return $postResponse->json();
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
