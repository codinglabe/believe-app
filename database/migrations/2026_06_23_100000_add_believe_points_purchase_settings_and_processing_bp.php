<?php

use App\Models\AdminSetting;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'processing_believe_points')) {
                $table->decimal('processing_believe_points', 12, 2)->default(0)->after('believe_points');
            }
        });

        Schema::table('believe_point_purchases', function (Blueprint $table) {
            if (! Schema::hasColumn('believe_point_purchases', 'platform_fee')) {
                $table->decimal('platform_fee', 10, 2)->default(0)->after('processing_fee_estimate');
            }
            if (! Schema::hasColumn('believe_point_purchases', 'points_available_at')) {
                $table->timestamp('points_available_at')->nullable()->after('reward_points_awarded');
            }
            if (! Schema::hasColumn('believe_point_purchases', 'points_released')) {
                $table->boolean('points_released')->default(false)->after('points_available_at');
            }
        });

        $defaults = [
            'bp_purchase_brp_value' => ['0.005', 'float'],
            'bp_purchase_platform_fee_percent' => ['1', 'float'],
            'bp_purchase_card_brp_rate' => ['2', 'float'],
            'bp_purchase_ach_brp_rate' => ['1', 'float'],
            'bp_purchase_card_hold_hours' => ['24', 'integer'],
        ];

        foreach ($defaults as $key => [$value, $type]) {
            if (AdminSetting::query()->where('key', $key)->doesntExist()) {
                AdminSetting::set($key, $value, $type);
            }
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'processing_believe_points')) {
                $table->dropColumn('processing_believe_points');
            }
        });

        Schema::table('believe_point_purchases', function (Blueprint $table) {
            $cols = ['platform_fee', 'points_available_at', 'points_released'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('believe_point_purchases', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
