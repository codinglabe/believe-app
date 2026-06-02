<?php

namespace App\Services;

use App\Models\ExcelData;
use App\Models\Organization;
use App\Models\ProximityNotificationLog;
use App\Models\User;
use App\Models\UserFavoriteOrganization;
use App\Models\UserPushToken;
use Illuminate\Support\Facades\Log;

class ProximityNotificationService
{
    public function __construct(
        private GeocodingService $geocodingService,
        private FirebaseService $firebaseService,
    ) {}

    /**
     * @return array{processed: bool, notified: int}
     */
    public function processUserLocation(User $user, float $latitude, float $longitude): array
    {
        if ($user->proximity_notifications_enabled === false) {
            return ['processed' => false, 'notified' => 0];
        }

        if (! $this->userHasPushCapability($user)) {
            return ['processed' => false, 'notified' => 0];
        }

        $user->forceFill([
            'last_latitude' => $latitude,
            'last_longitude' => $longitude,
            'last_location_reported_at' => now(),
        ])->save();

        $radiusMiles = (float) config('proximity.radius_miles', 1.0);
        $notified = 0;

        foreach ($this->followedTargetsWithCoordinates($user) as $target) {
            $distance = $this->haversineMiles(
                $latitude,
                $longitude,
                $target['latitude'],
                $target['longitude']
            );

            if ($distance > $radiusMiles) {
                continue;
            }

            if ($this->recentlyNotified($user->id, $target['target_type'], $target['target_id'])) {
                continue;
            }

            if ($this->sendProximityNotification($user, $target, $distance)) {
                ProximityNotificationLog::query()->create([
                    'user_id' => $user->id,
                    'target_type' => $target['target_type'],
                    'target_id' => $target['target_id'],
                    'notified_at' => now(),
                ]);
                $notified++;
            }
        }

        return ['processed' => true, 'notified' => $notified];
    }

    /**
     * @return list<array{
     *   target_type: string,
     *   target_id: int,
     *   name: string,
     *   latitude: float,
     *   longitude: float,
     *   url: string
     * }>
     */
    private function followedTargetsWithCoordinates(User $user): array
    {
        $favorites = UserFavoriteOrganization::query()
            ->where('user_id', $user->id)
            ->where('notifications', true)
            ->get();

        $targets = [];

        foreach ($favorites as $favorite) {
            if ($favorite->organization_id !== null) {
                $org = Organization::query()->with('user:id,slug')->find($favorite->organization_id);
                if ($org === null) {
                    continue;
                }

                $coords = $this->coordinatesForOrganization($org);
                if ($coords === null) {
                    continue;
                }

                $slug = $org->user?->slug ?? $org->id;
                $targets[] = [
                    'target_type' => 'organization',
                    'target_id' => (int) $org->id,
                    'name' => (string) ($org->name ?? 'Organization'),
                    'latitude' => $coords['latitude'],
                    'longitude' => $coords['longitude'],
                    'url' => route('organizations.show', $slug),
                ];

                continue;
            }

            if ($favorite->excel_data_id !== null) {
                $excel = ExcelData::query()->find($favorite->excel_data_id);
                if ($excel === null) {
                    continue;
                }

                $coords = $this->coordinatesForExcelData($excel);
                if ($coords === null) {
                    continue;
                }

                $targets[] = [
                    'target_type' => 'excel_data',
                    'target_id' => (int) $excel->id,
                    'name' => (string) ($excel->name_virtual ?? 'Organization'),
                    'latitude' => $coords['latitude'],
                    'longitude' => $coords['longitude'],
                    'url' => route('organizations.show', $excel->id),
                ];
            }
        }

        return $targets;
    }

    /**
     * Resolve coordinates via geocode_cache (Nominatim + hash). Never ALTER or UPDATE excel_data (millions of rows).
     *
     * @return array{latitude: float, longitude: float}|null
     */
    public function coordinatesForOrganization(Organization $org): ?array
    {
        $address = implode(', ', array_filter([
            trim((string) ($org->street ?? '')),
            trim((string) ($org->city ?? '')),
            trim((string) ($org->state ?? '')),
            trim((string) ($org->zip ?? '')),
            'USA',
        ]));

        return $this->geocodingService->geocode($address);
    }

    /**
     * @return array{latitude: float, longitude: float}|null
     */
    public function coordinatesForExcelData(ExcelData $excel): ?array
    {
        $address = implode(', ', array_filter([
            trim((string) ($excel->name_virtual ?? '')),
            trim((string) ($excel->city_virtual ?? '')),
            trim((string) ($excel->state_virtual ?? '')),
            trim((string) ($excel->zip_virtual ?? '')),
            'USA',
        ]));

        return $this->geocodingService->geocode($address);
    }

    private function recentlyNotified(int $userId, string $targetType, int $targetId): bool
    {
        $cooldownHours = (int) config('proximity.cooldown_hours', 24);

        return ProximityNotificationLog::query()
            ->where('user_id', $userId)
            ->where('target_type', $targetType)
            ->where('target_id', $targetId)
            ->where('notified_at', '>=', now()->subHours($cooldownHours))
            ->exists();
    }

    /**
     * @param  array{target_type: string, target_id: int, name: string, latitude: float, longitude: float, url: string}  $target
     */
    private function sendProximityNotification(User $user, array $target, float $distanceMiles): bool
    {
        $title = "You're near {$target['name']}";
        $distanceLabel = $distanceMiles < 0.2
            ? 'right nearby'
            : 'about '.number_format($distanceMiles, 1).' mi away';
        $body = "{$target['name']} is {$distanceLabel}. Tap to view their profile.";

        $data = [
            'type' => 'proximity_organization',
            'target_type' => $target['target_type'],
            'target_id' => (string) $target['target_id'],
            'url' => $target['url'],
            'click_action' => $target['url'],
            'source_type' => 'proximity',
            'source_id' => (string) $target['target_id'],
        ];

        $results = $this->firebaseService->sendToUser($user->id, $title, $body, $data);
        $successCount = is_array($results)
            ? count(array_filter($results, fn ($r) => ($r['success'] ?? false)))
            : 0;

        if ($successCount > 0) {
            Log::info('Proximity notification sent', [
                'user_id' => $user->id,
                'target_type' => $target['target_type'],
                'target_id' => $target['target_id'],
            ]);

            return true;
        }

        Log::warning('Proximity notification failed to send', [
            'user_id' => $user->id,
            'target_type' => $target['target_type'],
            'target_id' => $target['target_id'],
        ]);

        return false;
    }

    private function userHasPushCapability(User $user): bool
    {
        if (! empty($user->push_token)) {
            return true;
        }

        return UserPushToken::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->exists();
    }

    private function haversineMiles(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadiusMiles = 3958.8;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadiusMiles * $c;
    }
}
