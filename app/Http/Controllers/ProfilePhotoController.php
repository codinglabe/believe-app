<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class ProfilePhotoController extends Controller
{
    /**
     * Upload a new profile photo.
     */
    public function store(Request $request)
    {
        $request->validate([
            'photo' => [
                'required',
                'image',
                'mimes:jpeg,png,jpg',
                'max:5120', // 5MB in kilobytes
            ],
            'x' => 'nullable|numeric',
            'y' => 'nullable|numeric',
            'width' => 'nullable|numeric',
            'height' => 'nullable|numeric',
        ]);

        try {
            $user = Auth::user();
            $photo = $request->file('photo');

            // Create unique filename
            $filename = 'profile-' . $user->id . '-' . time() . '.jpg';

            // Get image info
            $imageInfo = getimagesize($photo->getPathname());
            $originalWidth = $imageInfo[0];
            $originalHeight = $imageInfo[1];
            $mimeType = $imageInfo['mime'];

            // Create image resource based on type
            switch ($mimeType) {
                case 'image/jpeg':
                    $sourceImage = imagecreatefromjpeg($photo->getPathname());
                    break;
                case 'image/png':
                    $sourceImage = imagecreatefrompng($photo->getPathname());
                    break;
                case 'image/gif':
                    $sourceImage = imagecreatefromgif($photo->getPathname());
                    break;
                default:
                    throw new \Exception('Unsupported image type');
            }

            // Apply cropping if coordinates provided
            if ($request->filled(['x', 'y', 'width', 'height'])) {
                $cropX = (int) $request->x;
                $cropY = (int) $request->y;
                $cropWidth = (int) $request->width;
                $cropHeight = (int) $request->height;

                // Create cropped image
                $croppedImage = imagecreatetruecolor($cropWidth, $cropHeight);
                imagecopyresampled(
                    $croppedImage,
                    $sourceImage,
                    0,
                    0,
                    $cropX,
                    $cropY,
                    $cropWidth,
                    $cropHeight,
                    $cropWidth,
                    $cropHeight
                );
                imagedestroy($sourceImage);
                $sourceImage = $croppedImage;
                $originalWidth = $cropWidth;
                $originalHeight = $cropHeight;
            }

            // Resize to 400x400
            $targetSize = 400;
            $resizedImage = imagecreatetruecolor($targetSize, $targetSize);

            // Maintain transparency for PNG
            imagealphablending($resizedImage, false);
            imagesavealpha($resizedImage, true);

            imagecopyresampled(
                $resizedImage,
                $sourceImage,
                0,
                0,
                0,
                0,
                $targetSize,
                $targetSize,
                $originalWidth,
                $originalHeight
            );

            // Save as JPEG
            ob_start();
            imagejpeg($resizedImage, null, 90);
            $imageData = ob_get_contents();
            ob_end_clean();

            // Clean up memory
            imagedestroy($sourceImage);
            imagedestroy($resizedImage);

            // Save to storage
            $path = 'profile-photos/' . $filename;
            Storage::disk('public')->put($path, $imageData);

            // Update user profile
            $user->updateProfilePhoto($path, 'public');

            return response()->json([
                'success' => true,
                'message' => 'Profile photo updated successfully!',
                'photo_url' => $user->fresh()->profile_photo_url,
            ]);

        } catch (\Exception $e) {
            \Log::error('Profile photo upload error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to upload profile photo. Please try again.',
                'error' => config('app.debug') ? $e->getMessage() : 'Upload failed'
            ], 500);
        }
    }

    /**
     * Delete the user's profile photo.
     */
    public function destroy()
    {
        try {
            $user = Auth::user();
            $user->deleteProfilePhoto();

            return response()->json([
                'success' => true,
                'message' => 'Profile photo deleted successfully!',
                'photo_url' => $user->fresh()->profile_photo_url,
            ]);

        } catch (\Exception $e) {
            \Log::error('Profile photo delete error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete profile photo. Please try again.',
                'error' => config('app.debug') ? $e->getMessage() : 'Delete failed'
            ], 500);
        }
    }

    /**
     * Get the user's current profile photo URL.
     */
    public function show()
    {
        $user = Auth::user();

        return response()->json([
            'photo_url' => $user->profile_photo_url,
            'has_custom_photo' => !is_null($user->profile_photo_path),
        ]);
    }
}
