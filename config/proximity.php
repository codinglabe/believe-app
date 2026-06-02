<?php

return [
    /** Miles from a followed org before we notify the user. */
    'radius_miles' => (float) env('PROXIMITY_RADIUS_MILES', 1.0),

    /** Do not notify again for the same org within this many hours. */
    'cooldown_hours' => (int) env('PROXIMITY_COOLDOWN_HOURS', 24),

    /** Nominatim user agent (required by OSM usage policy). */
    'geocoder_user_agent' => env('PROXIMITY_GEOCODER_USER_AGENT', 'BelieveInUnity/1.0 (proximity-notifications)'),
];
