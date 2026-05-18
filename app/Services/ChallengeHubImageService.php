<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;
use RuntimeException;

class ChallengeHubImageService
{
    /**
     * Generate a PNG via OpenAI Images API, resize for small file size, store on public disk.
     *
     * @return string Path relative to the public disk (e.g. challenge-hub/tracks/foo/cover.png)
     */
    public function generateAndStore(string $userPrompt, string $storageRelativeDir, string $filenameBase): string
    {
        $apiKey = config('services.openai.api_key');
        if (! is_string($apiKey) || $apiKey === '') {
            throw new RuntimeException('OPENAI_API_KEY is not configured.');
        }

        $suffix = (string) config('services.challenge_hub.image_prompt_suffix', '');
        $fullPrompt = trim($userPrompt.' '.$suffix);

        if (strlen($fullPrompt) < 8) {
            throw new RuntimeException('Image prompt is too short.');
        }

        $verify = config('services.openai.verify_ssl', true);
        $model = (string) config('services.challenge_hub.image_model', 'dall-e-2');
        $size = (string) config('services.challenge_hub.image_size', '512x512');

        $payload = [
            'model' => $model,
            'prompt' => $fullPrompt,
            'n' => 1,
            'size' => $size,
            'response_format' => 'b64_json',
        ];

        $response = Http::withOptions(['verify' => $verify])
            ->withHeaders([
                'Authorization' => 'Bearer '.$apiKey,
                'Content-Type' => 'application/json',
            ])
            ->timeout(120)
            ->connectTimeout(30)
            ->post('https://api.openai.com/v1/images/generations', $payload);

        if ($response->failed()) {
            Log::error('OpenAI images generations failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            throw new RuntimeException('Image generation failed: '.$response->body());
        }

        $b64 = $response->json('data.0.b64_json');
        if (! is_string($b64) || $b64 === '') {
            throw new RuntimeException('Empty image data from OpenAI.');
        }

        $binary = base64_decode($b64, true);
        if ($binary === false || $binary === '') {
            throw new RuntimeException('Invalid image data from OpenAI.');
        }

        $maxPx = (int) config('services.challenge_hub.image_max_width', 384);

        $manager = new ImageManager(new Driver);
        $image = $manager->read($binary);
        if ($image->width() > $maxPx) {
            $image->scale(width: $maxPx);
        }

        $storageRelativeDir = trim($storageRelativeDir, '/');
        Storage::disk('public')->makeDirectory($storageRelativeDir);
        $path = $storageRelativeDir.'/'.$filenameBase.'.png';
        $fullPath = storage_path('app/public/'.$path);
        $image->toPng()->save($fullPath);

        return $path;
    }

    /**
     * Store an admin-uploaded image, resize like generated covers, save as PNG on public disk.
     *
     * @return string Path relative to the public disk
     */
    public function storeUploadedCover(UploadedFile $file, string $storageRelativeDir, string $filenameBase): string
    {
        if (! $file->isValid()) {
            throw new RuntimeException('Invalid file upload.');
        }

        $mime = $file->getMimeType() ?? '';
        $allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (! in_array($mime, $allowed, true)) {
            throw new RuntimeException('Please upload a JPEG, PNG, WebP, or GIF image.');
        }

        $maxPx = (int) config('services.challenge_hub.image_max_width', 384);

        $manager = new ImageManager(new Driver);
        $image = $manager->read($file->getRealPath());
        if ($image->width() > $maxPx) {
            $image->scale(width: $maxPx);
        }

        $storageRelativeDir = trim($storageRelativeDir, '/');
        Storage::disk('public')->makeDirectory($storageRelativeDir);
        $path = $storageRelativeDir.'/'.$filenameBase.'.png';
        $fullPath = storage_path('app/public/'.$path);
        $image->toPng()->save($fullPath);

        return $path;
    }

    /**
     * Delete previous file on public disk if present.
     */
    public function deleteIfExists(?string $relativePath): void
    {
        if (! is_string($relativePath) || $relativePath === '') {
            return;
        }
        if (Storage::disk('public')->exists($relativePath)) {
            Storage::disk('public')->delete($relativePath);
        }
    }
}
