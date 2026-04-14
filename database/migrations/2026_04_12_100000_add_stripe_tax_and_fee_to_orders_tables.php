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
                if (! Schema::hasColumn($tableName, 'stripe_tax_amount')) {
                    $table->decimal('stripe_tax_amount', 12, 2)->nullable()->after('tax_amount');
                }
                if (! Schema::hasColumn($tableName, 'stripe_tax_calculation_id')) {
                    $table->string('stripe_tax_calculation_id', 191)->nullable()->after('stripe_tax_amount');
                }
            });
        }

        if (Schema::hasTable('orders') && ! Schema::hasColumn('orders', 'stripe_fee_amount')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->decimal('stripe_fee_amount', 12, 2)->nullable()->after('stripe_tax_calculation_id');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                if (Schema::hasColumn('orders', 'stripe_fee_amount')) {
                    $table->dropColumn('stripe_fee_amount');
                }
                if (Schema::hasColumn('orders', 'stripe_tax_calculation_id')) {
                    $table->dropColumn('stripe_tax_calculation_id');
                }
                if (Schema::hasColumn('orders', 'stripe_tax_amount')) {
                    $table->dropColumn('stripe_tax_amount');
                }
            });
        }

        if (Schema::hasTable('temp_orders')) {
            Schema::table('temp_orders', function (Blueprint $table) {
                if (Schema::hasColumn('temp_orders', 'stripe_tax_calculation_id')) {
                    $table->dropColumn('stripe_tax_calculation_id');
                }
                if (Schema::hasColumn('temp_orders', 'stripe_tax_amount')) {
                    $table->dropColumn('stripe_tax_amount');
                }
            });
        }
    }
};
