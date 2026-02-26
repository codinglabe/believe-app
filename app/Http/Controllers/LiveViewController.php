<?php

namespace App\Http\Controllers;

use App\Models\OrganizationLivestream;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Viewer page at /live/{slug}: view-only VDO iframe with custom Mute + Volume (postMessage).
 * Only active when stream status is "live" (Stream Live).
 */
class LiveViewController extends Controller
{
    public function show(Request $request, string $slug): Response
    {
        $livestream = OrganizationLivestream::query()
            ->where('room_name', $slug)
            ->where('status', 'live')
            ->with('organization:id,name')
            ->firstOrFail();

        $viewUrl = $livestream->getPublicViewUrl();
        if (! $viewUrl) {
            abort(404);
        }

        return Inertia::render('frontend/live/Show', [
            'seo' => [
                'title' => ($livestream->title ?: 'Live') . ' | Believe In Unity',
                'description' => 'Watch ' . ($livestream->title ?: 'this stream') . ' live.',
            ],
            'livestream' => [
                'slug' => $livestream->room_name,
                'title' => $livestream->title ?: 'Live Stream',
                'organizationName' => $livestream->organization?->name ?? 'Organization',
                'viewUrl' => $viewUrl,
            ],
        ]);
    }
}
