<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('temp_orders')) {
            Schema::table('temp_orders', function (Blueprint $table) {
                if (! Schema::hasColumn('temp_orders', 'printify_tax_amount')) {
                    $table->decimal('printify_tax_amount', 12, 2)->default(0)->after('tax_amount');
                }
                if (! Schema::hasColumn('temp_orders', 'additional_sales_tax_adjustment')) {
                    $table->decimal('additional_sales_tax_adjustment', 12, 2)->default(0)->after('printify_tax_amount');
                }
            });
        }

        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                if (! Schema::hasColumn('orders', 'printify_tax_amount')) {
                    $table->decimal('printify_tax_amount', 12, 2)->default(0)->after('tax_amount');
                }
                if (! Schema::hasColumn('orders', 'additional_sales_tax_adjustment')) {
                    $table->decimal('additional_sales_tax_adjustment', 12, 2)->default(0)->after('printify_tax_amount');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('temp_orders')) {
            Schema::table('temp_orders', function (Blueprint $table) {
                if (Schema::hasColumn('temp_orders', 'additional_sales_tax_adjustment')) {
                    $table->dropColumn('additional_sales_tax_adjustment');
                }
                if (Schema::hasColumn('temp_orders', 'printify_tax_amount')) {
                    $table->dropColumn('printify_tax_amount');
                }
            });
        }

        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                if (Schema::hasColumn('orders', 'additional_sales_tax_adjustment')) {
                    $table->dropColumn('additional_sales_tax_adjustment');
                }
                if (Schema::hasColumn('orders', 'printify_tax_amount')) {
                    $table->dropColumn('printify_tax_amount');
                }
            });
        }
    }
};
