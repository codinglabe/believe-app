<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Builds the VDO.Ninja query segment for virtual backgrounds (&virtualbackground + &imagelist).
 *
 * @see https://docs.vdo.ninja/advanced-settings/video-parameters/effects/and-virtualbackground.md
 */
final class VdoMeetingVirtualBackground
{
    /**
     * Returns e.g. `&virtualbackground&imagelist=%5B...%5D` or `&effects=` when no valid URLs are configured.
     */
    public static function querySegment(): string
    {
        $urls = config('vdo_meeting.virtual_background_urls', []);
        if (! is_array($urls) || $urls === []) {
            return '&effects=';
        }

        $filtered = [];
        foreach ($urls as $u) {
            if (is_string($u) && filter_var($u, FILTER_VALIDATE_URL)) {
                $filtered[] = $u;
            }
        }

        if ($filtered === []) {
            return '&effects=';
        }

        $json = json_encode(array_values($filtered), JSON_UNESCAPED_SLASHES);
        if ($json === false || $json === '[]') {
            return '&effects=';
        }

        return '&virtualbackground&imagelist=' . rawurlencode($json);
    }
}
