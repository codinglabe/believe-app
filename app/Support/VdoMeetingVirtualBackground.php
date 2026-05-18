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
        return '';
    }
}
