<?php

use App\Models\AdminSetting;
use App\Models\BelievePointPurchase;
use App\Services\BelievePointPurchaseSettlementService;
use App\Services\BelievePointsPurchaseSettingsService;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        AdminSetting::set(
            BelievePointsPurchaseSettingsService::KEY_CARD_HOLD_HOURS,
            0,
            'integer'
        );

        BelievePointPurchase::query()
            ->where('status', 'completed')
            ->where('points_released', false)
            ->orderBy('id')
            ->each(function (BelievePointPurchase $purchase) {
                $purchase->update(['points_available_at' => now()]);
                BelievePointPurchaseSettlementService::releasePurchasePoints($purchase->fresh());
            });
    }

    public function down(): void
    {
        AdminSetting::set(
            BelievePointsPurchaseSettingsService::KEY_CARD_HOLD_HOURS,
            24,
            'integer'
        );
    }
};
