<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('order_shipping_infos')) {
            return;
        }

        Schema::table('order_shipping_infos', function (Blueprint $table) {
            if (! Schema::hasColumn('order_shipping_infos', 'shipping_address_line2')) {
                $table->string('shipping_address_line2', 255)->nullable()->after('shipping_address');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('order_shipping_infos')) {
            return;
        }

        Schema::table('order_shipping_infos', function (Blueprint $table) {
            if (Schema::hasColumn('order_shipping_infos', 'shipping_address_line2')) {
                $table->dropColumn('shipping_address_line2');
            }
        });
    }
};
