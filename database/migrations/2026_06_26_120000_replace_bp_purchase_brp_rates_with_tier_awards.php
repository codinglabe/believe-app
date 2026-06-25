<?php

use App\Models\AdminSetting;
use App\Services\BelievePointsPurchaseSettingsService;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $defaults = [
            BelievePointsPurchaseSettingsService::KEY_FREE_BRP_AWARD => ['5', 'float'],
            BelievePointsPurchaseSettingsService::KEY_PRIME_BRP_AWARD => ['10', 'float'],
        ];

        foreach ($defaults as $key => [$value, $type]) {
            if (AdminSetting::query()->where('key', $key)->doesntExist()) {
                AdminSetting::set($key, $value, $type);
            }
        }

        // Retire the percentage/rate-based BRP settings — BRP is now a flat
        // per-purchase award based on the buyer's supporter membership tier.
        AdminSetting::query()
            ->whereIn('key', ['bp_purchase_card_brp_rate', 'bp_purchase_ach_brp_rate'])
            ->delete();
    }

    public function down(): void
    {
        $legacy = [
            'bp_purchase_card_brp_rate' => ['2', 'float'],
            'bp_purchase_ach_brp_rate' => ['1', 'float'],
        ];

        foreach ($legacy as $key => [$value, $type]) {
            if (AdminSetting::query()->where('key', $key)->doesntExist()) {
                AdminSetting::set($key, $value, $type);
            }
        }

        AdminSetting::query()
            ->whereIn('key', [
                BelievePointsPurchaseSettingsService::KEY_FREE_BRP_AWARD,
                BelievePointsPurchaseSettingsService::KEY_PRIME_BRP_AWARD,
            ])
            ->delete();
    }
};
