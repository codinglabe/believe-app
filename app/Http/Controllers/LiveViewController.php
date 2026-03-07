<?php

namespace App\Http\Controllers;

use App\Models\OrganizationLivestream;
use App\Models\UserLivestream;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Viewer page at /live/{slug}: view-only VDO iframe with custom Mute + Volume (postMessage).
 * Supports both org and supporter livestreams when status is "live".
 */
class LiveViewController extends Controller
{
    public function show(Request $request, string $slug): Response
    {
        $orgStream = OrganizationLivestream::query()
            ->where('room_name', $slug)
            ->where('status', 'live')
            ->with('organization:id,name')
            ->first();

        if ($orgStream) {
            $viewUrl = $orgStream->getPublicViewUrl();
            if (! $viewUrl) {
                abort(404);
            }
            return Inertia::render('frontend/live/Show', [
                'seo' => [
                    'title' => ($orgStream->title ?: 'Live') . ' | Believe In Unity',
                    'description' => 'Watch ' . ($orgStream->title ?: 'this stream') . ' live.',
                ],
                'livestream' => [
                    'slug' => $orgStream->room_name,
                    'title' => $orgStream->title ?: 'Live Stream',
                    'organizationName' => $orgStream->organization?->name ?? 'Organization',
                    'viewUrl' => $viewUrl,
                ],
            ]);
        }

        $userStream = UserLivestream::query()
            ->where('room_name', $slug)
            ->where('status', 'live')
            ->with('user:id,name')
            ->first();

        if ($userStream) {
            $viewUrl = $userStream->getPublicViewUrl();
            if (! $viewUrl) {
                abort(404);
            }
            return Inertia::render('frontend/live/Show', [
                'seo' => [
                    'title' => ($userStream->title ?: 'Live') . ' | Believe In Unity',
                    'description' => 'Watch ' . ($userStream->title ?: 'this stream') . ' live.',
                ],
                'livestream' => [
                    'slug' => $userStream->room_name,
                    'title' => $userStream->title ?: 'Live Stream',
                    'organizationName' => $userStream->user?->name ?? 'Host',
                    'viewUrl' => $viewUrl,
                ],
            ]);
        }

        abort(404, 'Stream not found.');
    }
}
