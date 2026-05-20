<?php

namespace App\Http\Controllers;

use App\Models\OrganizationLivestream;
use App\Models\UserLivestream;
use App\Support\StreamingWorkerSourceUrl;
use Illuminate\Contracts\View\View;

/**
 * Renders the hidden participant canvas mixer (MVP, approved scope 2026-05-17).
 *
 * Public, room-name addressed (same pattern as guest join). The page itself
 * only talks WHEP/WHIP to the MediaMTX bridge — no secrets are exposed; the
 * stream paths are already the same ids used across the pipeline.
 */
class LivestreamCanvasController extends Controller
{
    public function show(string $roomName): View
    {
        $livestream = OrganizationLivestream::where('room_name', $roomName)->first()
            ?: UserLivestream::where('room_name', $roomName)->firstOrFail();

        $base = StreamingWorkerSourceUrl::bridgeWhepWhipBaseUrl();
        abort_if($base === null, 404, 'Streaming bridge not configured');
        $streamPath = StreamingWorkerSourceUrl::streamPath($livestream); // ls_<id>

        $seatPaths = [];
        for ($n = 1; $n <= 6; $n++) {
            $seatPaths[] = $streamPath.'_s'.$n;
        }

        return view('livestreams.canvas', [
            'cfg' => [
                'whepBase'  => $base,
                'whipUrl'   => $base.'/'.$streamPath.'/whip',
                'seatPaths' => $seatPaths,
                'width'     => 1280,
                'height'    => 720,
                'fps'       => 30,
            ],
        ]);
    }
}
