<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['temp_orders', 'orders'] as $tableName) {
            if (! Schema::hasTable($tableName)) {
                continue;
            }
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                if (Schema::hasColumn($tableName, 'stripe_processing_fee_addon')) {
                    return;
                }
                if (Schema::hasColumn($tableName, 'stripe_fee_amount')) {
                    $table->decimal('stripe_processing_fee_addon', 12, 2)->nullable()->after('stripe_fee_amount');
                } elseif (Schema::hasColumn($tableName, 'stripe_tax_calculation_id')) {
                    $table->decimal('stripe_processing_fee_addon', 12, 2)->nullable()->after('stripe_tax_calculation_id');
                } else {
                    $table->decimal('stripe_processing_fee_addon', 12, 2)->nullable();
                }
            });
        }
    }

    public function down(): void
    {
        foreach (['orders', 'temp_orders'] as $tableName) {
            if (! Schema::hasTable($tableName)) {
                continue;
            }
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                if (Schema::hasColumn($tableName, 'stripe_processing_fee_addon')) {
                    $table->dropColumn('stripe_processing_fee_addon');
                }
            });
        }
    }
};
