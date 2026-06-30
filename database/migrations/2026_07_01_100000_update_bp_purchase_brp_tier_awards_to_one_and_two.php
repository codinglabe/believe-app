<?php

use App\Models\AdminSetting;
use App\Services\BelievePointsPurchaseSettingsService;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $this->migrateAwardIfStillLegacy(
            BelievePointsPurchaseSettingsService::KEY_FREE_BRP_AWARD,
            ['5', '5.0', '5.00'],
            '1'
        );

        $this->migrateAwardIfStillLegacy(
            BelievePointsPurchaseSettingsService::KEY_PRIME_BRP_AWARD,
            ['10', '10.0', '10.00'],
            '2'
        );
    }

    /**
     * @param  list<string>  $legacyValues
     */
    private function migrateAwardIfStillLegacy(string $key, array $legacyValues, string $newValue): void
    {
        $setting = AdminSetting::query()->where('key', $key)->first();

        if ($setting === null) {
            AdminSetting::set($key, $newValue, 'float');

            return;
        }

        if (in_array((string) $setting->value, $legacyValues, true)) {
            AdminSetting::set($key, $newValue, 'float');
        }
    }

    public function down(): void
    {
        $this->migrateAwardIfStillLegacy(
            BelievePointsPurchaseSettingsService::KEY_FREE_BRP_AWARD,
            ['1', '1.0', '1.00'],
            '5'
        );

        $this->migrateAwardIfStillLegacy(
            BelievePointsPurchaseSettingsService::KEY_PRIME_BRP_AWARD,
            ['2', '2.0', '2.00'],
            '10'
        );
    }
};
