<?php

namespace App\Http\Controllers;

use App\Models\ContentItem;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;

class ContentItemController extends Controller
{
    public function __construct()
    {
        $this->authorizeResource(ContentItem::class, 'content_item');
    }

    public function index(Request $request)
    {
        $organizationId = auth()->user()->organization->id;

        $contentItems = ContentItem::with(['user'])
        ->forOrganization($organizationId)
        ->when($request->search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                    ->orWhere('body', 'like', "%{$search}%")
                    ->orWhereJsonContains('meta->scripture_ref', $search)
                    ->orWhereJsonContains('meta->tags', $search);
                });
            })
            ->when($request->type, function ($query, $type) {
                $query->where('type', $type);
            })
            ->paginate(12)
            ->withQueryString();

            // dd($contentItems);
        return Inertia::render('Content/Index', [
            'contentItems' => $contentItems,
            'filters' => $request->only('search', 'type')
        ]);
    }

    public function create()
    {
        return Inertia::render('Content/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'body' => 'required|string|min:10',
            'type' => 'required|in:prayer,devotional,scripture',
            'meta.scripture_ref' => 'nullable|string|max:255',
            'meta.image' => 'nullable|image|max:2048',
            'meta.tags' => 'nullable|array',
            'meta.tags.*' => 'string|max:50',
        ]);

        $metaData = [
            'scripture_ref' => $validated['meta']['scripture_ref'] ?? '',
            'tags' => $validated['meta']['tags'] ?? [],
        ];

        // Handle image upload
        if ($request->hasFile('meta.image')) {
            $path = $request->file('meta.image')->store('content-images', 'public');
            $metaData['image_url'] = Storage::url($path);
        }

        $contentItem = ContentItem::create([
            'organization_id' => auth()->user()->organization->id,
            'user_id' => auth()->id(),
            'title' => $validated['title'],
            'body' => $validated['body'],
            'type' => $validated['type'],
            'meta' => $metaData,
        ]);

        return redirect()->route('content.items.index')
            ->with('success', 'Content created successfully!');
    }

    public function edit(ContentItem $contentItem)
    {
        return Inertia::render('Content/Edit', [
            'contentItem' => $contentItem
        ]);
    }

    public function update(Request $request, ContentItem $contentItem)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'body' => 'required|string|min:10',
            'type' => 'required|in:prayer,devotional,scripture',
            'meta.scripture_ref' => 'nullable|string|max:255',
            'meta.image' => 'nullable|image|max:2048',
            'meta.tags' => 'nullable|array',
            'meta.tags.*' => 'string|max:50',
        ]);

        $metaData = [
            'scripture_ref' => $validated['meta']['scripture_ref'] ?? '',
            'tags' => $validated['meta']['tags'] ?? [],
        ];

        // Handle image upload
        if ($request->hasFile('meta.image')) {
            // Delete old image if exists
            if ($contentItem->meta['image_url'] ?? false) {
                $oldPath = str_replace('/storage/', '', $contentItem->meta['image_url']);
                Storage::disk('public')->delete($oldPath);
            }

            $path = $request->file('meta.image')->store('content-images', 'public');
            $metaData['image_url'] = Storage::url($path);
        } elseif (isset($contentItem->meta['image_url'])) {
            $metaData['image_url'] = $contentItem->meta['image_url'];
        }

        $contentItem->update([
            'title' => $validated['title'],
            'body' => $validated['body'],
            'type' => $validated['type'],
            'meta' => $metaData,
        ]);

        return redirect()->route('content.items.index')
            ->with('success', 'Content updated successfully!');
    }

    public function destroy(ContentItem $contentItem)
    {
        // Delete associated image
        if ($contentItem->meta['image_url'] ?? false) {
            $oldPath = str_replace('/storage/', '', $contentItem->meta['image_url']);
            Storage::disk('public')->delete($oldPath);
        }

        $contentItem->delete();

        return redirect()->route('content.items.index')
            ->with('success', 'Content deleted successfully!');
    }
}
