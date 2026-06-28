<?php

use App\Models\AdminSetting;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $existing = AdminSetting::query()->where('key', 'believe_points_min_purchase')->first();

        if ($existing === null) {
            AdminSetting::set('believe_points_min_purchase', '10', 'float');

            return;
        }

        if ((float) $existing->value <= 1.0) {
            AdminSetting::set('believe_points_min_purchase', '10', 'float');
        }
    }

    public function down(): void
    {
        // Intentionally left blank — do not revert a business-rule minimum.
    }
};
