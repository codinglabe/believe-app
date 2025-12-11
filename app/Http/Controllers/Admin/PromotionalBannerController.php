<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\BaseController;
use App\Models\PromotionalBanner;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class PromotionalBannerController extends BaseController
{
    /**
     * Display a listing of promotional banners.
     */
    public function index(Request $request)
    {
        $this->authorizeRole($request, 'admin');
        $this->authorizePermission($request, 'promotional.banner.read');

        $banners = PromotionalBanner::ordered()->get()->map(function ($banner) {
            $imageUrl = $banner->image_url;
            // Convert path to full URL if needed (handle both old full URLs and new paths)
            if ($imageUrl) {
                $baseUrl = Storage::disk('public')->url('');
                if (strpos($imageUrl, $baseUrl) !== 0) {
                    // It's a path, convert to full URL
                    $imageUrl = Storage::disk('public')->url($imageUrl);
                }
            }
            
            return [
                'id' => $banner->id,
                'title' => $banner->title,
                'type' => $banner->type,
                'image_url' => $imageUrl,
                'text_content' => $banner->text_content,
                'external_link' => $banner->external_link,
                'is_active' => $banner->is_active,
                'display_order' => $banner->display_order,
                'starts_at' => $banner->starts_at,
                'ends_at' => $banner->ends_at,
                'background_color' => $banner->background_color,
                'text_color' => $banner->text_color,
                'description' => $banner->description,
                'created_at' => $banner->created_at,
                'updated_at' => $banner->updated_at,
            ];
        });

        return Inertia::render('admin/PromotionalBanners/Index', [
            'banners' => $banners,
        ]);
    }

    /**
     * Show the form for creating a new promotional banner.
     */
    public function create(Request $request)
    {
        $this->authorizeRole($request, 'admin');
        $this->authorizePermission($request, 'promotional.banner.create');

        return Inertia::render('admin/PromotionalBanners/Create');
    }

    /**
     * Store a newly created promotional banner.
     */
    public function store(Request $request)
    {
        $this->authorizeRole($request, 'admin');
        $this->authorizePermission($request, 'promotional.banner.create');

        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'type' => 'required|in:image,text',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120|required_if:type,image',
            'image_url' => 'nullable|string',
            'text_content' => 'nullable|string|required_if:type,text',
            'external_link' => 'nullable|url',
            'is_active' => 'boolean',
            'display_order' => 'nullable|integer|min:0',
            'starts_at' => 'nullable|date',
            'ends_at' => 'nullable|date|after_or_equal:starts_at',
            'background_color' => 'nullable|string|max:7',
            'text_color' => 'nullable|string|max:7',
            'description' => 'nullable|string',
        ]);

        try {
            // Handle image upload - store only the path, not full URL
            if ($request->hasFile('image')) {
                $validated['image_url'] = $request->file('image')->store('promotional-banners', 'public');
            }
            
            unset($validated['image']); // Remove the file object from validated data
            
            PromotionalBanner::create($validated);

            return redirect()->route('admin.promotional-banners.index')
                ->with('success', 'Promotional banner created successfully.');
        } catch (\Exception $e) {
            Log::error('Promotional banner creation error: ' . $e->getMessage());
            return redirect()->back()
                ->withInput()
                ->with('error', 'Failed to create promotional banner: ' . $e->getMessage());
        }
    }

    /**
     * Show the form for editing the specified promotional banner.
     */
    public function edit(Request $request, PromotionalBanner $promotionalBanner)
    {
        $this->authorizeRole($request, 'admin');
        $this->authorizePermission($request, 'promotional.banner.edit');

        // Convert image_url path to full URL for frontend
        $banner = $promotionalBanner->toArray();
        if ($banner['image_url']) {
            // Check if it's already a full URL (for existing data) or just a path
            $baseUrl = Storage::disk('public')->url('');
            if (strpos($banner['image_url'], $baseUrl) !== 0) {
                // It's a path, convert to full URL
                $banner['image_url'] = Storage::disk('public')->url($banner['image_url']);
            }
        }

        return Inertia::render('admin/PromotionalBanners/Edit', [
            'banner' => $banner,
        ]);
    }

    /**
     * Update the specified promotional banner.
     */
    public function update(Request $request, PromotionalBanner $promotionalBanner)
    {
        $this->authorizeRole($request, 'admin');
        $this->authorizePermission($request, 'promotional.banner.update');

        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'type' => 'required|in:image,text',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'image_url' => 'nullable|string',
            'text_content' => 'nullable|string|required_if:type,text',
            'external_link' => 'nullable|url',
            'is_active' => 'boolean',
            'display_order' => 'nullable|integer|min:0',
            'starts_at' => 'nullable|date',
            'ends_at' => 'nullable|date|after_or_equal:starts_at',
            'background_color' => 'nullable|string|max:7',
            'text_color' => 'nullable|string|max:7',
            'description' => 'nullable|string',
        ]);

        try {
            // Handle image upload - replace old image if new one is uploaded
            if ($request->hasFile('image')) {
                // Delete old image if it exists
                if ($promotionalBanner->image_url) {
                    // Handle both full URL and path formats
                    $oldPath = $promotionalBanner->image_url;
                    // If it's a full URL, extract the path
                    $baseUrl = Storage::disk('public')->url('');
                    if (strpos($oldPath, $baseUrl) === 0) {
                        $oldPath = str_replace($baseUrl, '', $oldPath);
                    }
                    // Remove leading slash if present
                    $oldPath = ltrim($oldPath, '/');
                    
                    if ($oldPath && Storage::disk('public')->exists($oldPath)) {
                        Storage::disk('public')->delete($oldPath);
                    }
                }
                
                // Store new image - store only the path, not full URL
                $validated['image_url'] = $request->file('image')->store('promotional-banners', 'public');
            } elseif ($request->input('type') === 'text') {
                // If type changed to text, delete old image
                if ($promotionalBanner->image_url) {
                    $oldPath = $promotionalBanner->image_url;
                    $baseUrl = Storage::disk('public')->url('');
                    if (strpos($oldPath, $baseUrl) === 0) {
                        $oldPath = str_replace($baseUrl, '', $oldPath);
                    }
                    $oldPath = ltrim($oldPath, '/');
                    
                    if ($oldPath && Storage::disk('public')->exists($oldPath)) {
                        Storage::disk('public')->delete($oldPath);
                    }
                    $validated['image_url'] = null;
                }
            } elseif ($request->input('type') === 'image' && !$request->hasFile('image')) {
                // If type is image but no new image uploaded, preserve existing image_url
                // Don't overwrite it - remove from validated so it stays unchanged
                unset($validated['image_url']);
            }
            
            unset($validated['image']); // Remove the file object from validated data
            
            $promotionalBanner->update($validated);

            return redirect()->route('admin.promotional-banners.index')
                ->with('success', 'Promotional banner updated successfully.');
        } catch (\Exception $e) {
            Log::error('Promotional banner update error: ' . $e->getMessage());
            return redirect()->back()
                ->withInput()
                ->with('error', 'Failed to update promotional banner: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified promotional banner.
     */
    public function destroy(Request $request, PromotionalBanner $promotionalBanner)
    {
        $this->authorizeRole($request, 'admin');
        $this->authorizePermission($request, 'promotional.banner.delete');

        try {
            $promotionalBanner->delete();

            return redirect()->route('admin.promotional-banners.index')
                ->with('success', 'Promotional banner deleted successfully.');
        } catch (\Exception $e) {
            Log::error('Promotional banner deletion error: ' . $e->getMessage());
            return redirect()->back()
                ->with('error', 'Failed to delete promotional banner: ' . $e->getMessage());
        }
    }
}
