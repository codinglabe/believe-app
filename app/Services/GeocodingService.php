<?php

namespace App\Services;

use App\Models\GeocodeCache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeocodingService
{
    /**
     * @return array{latitude: float, longitude: float}|null
     */
    public function geocode(string $addressQuery): ?array
    {
        $normalized = trim(preg_replace('/\s+/', ' ', $addressQuery) ?? '');
        if ($normalized === '') {
            return null;
        }

        $hash = hash('sha256', strtolower($normalized));

        $cached = GeocodeCache::query()->where('address_hash', $hash)->first();
        if ($cached !== null) {
            return [
                'latitude' => (float) $cached->latitude,
                'longitude' => (float) $cached->longitude,
            ];
        }

        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'User-Agent' => config('proximity.geocoder_user_agent'),
                    'Accept' => 'application/json',
                ])
                ->get('https://nominatim.openstreetmap.org/search', [
                    'q' => $normalized,
                    'format' => 'json',
                    'limit' => 1,
                    'countrycodes' => 'us',
                ]);

            if (! $response->successful()) {
                Log::warning('Geocoding request failed', [
                    'status' => $response->status(),
                    'address' => $normalized,
                ]);

                return null;
            }

            $results = $response->json();
            if (! is_array($results) || count($results) === 0) {
                return null;
            }

            $first = $results[0];
            $lat = isset($first['lat']) ? (float) $first['lat'] : null;
            $lng = isset($first['lon']) ? (float) $first['lon'] : null;

            if ($lat === null || $lng === null) {
                return null;
            }

            GeocodeCache::query()->create([
                'address_hash' => $hash,
                'address_query' => $normalized,
                'latitude' => $lat,
                'longitude' => $lng,
            ]);

            return ['latitude' => $lat, 'longitude' => $lng];
        } catch (\Throwable $e) {
            Log::warning('Geocoding exception', [
                'address' => $normalized,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }
}
