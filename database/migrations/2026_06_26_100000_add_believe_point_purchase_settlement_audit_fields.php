<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('believe_point_purchases', function (Blueprint $table) {
            if (! Schema::hasColumn('believe_point_purchases', 'settlement_status')) {
                $table->string('settlement_status', 32)->nullable()->after('bridge_settlement_reference');
            }
            if (! Schema::hasColumn('believe_point_purchases', 'settlement_at')) {
                $table->timestamp('settlement_at')->nullable()->after('settlement_status');
            }
            if (! Schema::hasColumn('believe_point_purchases', 'stripe_settlement_reference')) {
                $table->string('stripe_settlement_reference')->nullable()->after('settlement_at');
            }
        });

        if (class_exists(\App\Models\AdminSetting::class)) {
            \App\Models\AdminSetting::set('bp_purchase_free_brp_award', '5', 'float');
            \App\Models\AdminSetting::set('bp_purchase_prime_brp_award', '10', 'float');
        }
    }

    public function down(): void
    {
        Schema::table('believe_point_purchases', function (Blueprint $table) {
            foreach (['settlement_status', 'settlement_at', 'stripe_settlement_reference'] as $col) {
                if (Schema::hasColumn('believe_point_purchases', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
