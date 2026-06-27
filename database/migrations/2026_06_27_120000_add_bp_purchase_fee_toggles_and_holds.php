<?php

use App\Models\AdminSetting;
use App\Services\BelievePointsPurchaseSettingsService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('believe_point_purchases', function (Blueprint $table) {
            if (! Schema::hasColumn('believe_point_purchases', 'is_trusted_instrument')) {
                $table->boolean('is_trusted_instrument')->default(false)->after('payment_method');
            }
        });

        $defaults = [
            BelievePointsPurchaseSettingsService::KEY_SUPPORTER_PAYS_PROCESSING_FEE => ['1', 'boolean'],
            BelievePointsPurchaseSettingsService::KEY_SUPPORTER_PAYS_PLATFORM_FEE => ['1', 'boolean'],
            BelievePointsPurchaseSettingsService::KEY_ACH_HOLD_HOURS => ['0', 'integer'],
        ];

        foreach ($defaults as $key => [$value, $type]) {
            if (AdminSetting::query()->where('key', $key)->doesntExist()) {
                AdminSetting::set($key, $value, $type);
            }
        }
    }

    public function down(): void
    {
        Schema::table('believe_point_purchases', function (Blueprint $table) {
            if (Schema::hasColumn('believe_point_purchases', 'is_trusted_instrument')) {
                $table->dropColumn('is_trusted_instrument');
            }
        });

        AdminSetting::query()
            ->whereIn('key', [
                BelievePointsPurchaseSettingsService::KEY_SUPPORTER_PAYS_PROCESSING_FEE,
                BelievePointsPurchaseSettingsService::KEY_SUPPORTER_PAYS_PLATFORM_FEE,
                BelievePointsPurchaseSettingsService::KEY_ACH_HOLD_HOURS,
            ])
            ->delete();
    }
};
