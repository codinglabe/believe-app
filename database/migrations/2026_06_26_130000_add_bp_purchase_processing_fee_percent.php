<?php

use App\Models\AdminSetting;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        if (AdminSetting::query()->where('key', 'bp_purchase_processing_fee_percent')->doesntExist()) {
            AdminSetting::set('bp_purchase_processing_fee_percent', '1', 'float');
        }
    }

    public function down(): void
    {
        AdminSetting::query()->where('key', 'bp_purchase_processing_fee_percent')->delete();
    }
};
