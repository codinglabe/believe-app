<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('temp_orders', function (Blueprint $table) {
            if (! Schema::hasColumn('temp_orders', 'shippo_rate_object_id')) {
                $table->string('shippo_rate_object_id', 100)->nullable()->after('selected_shipping_method');
            }
            if (! Schema::hasColumn('temp_orders', 'shippo_carrier')) {
                $table->string('shippo_carrier', 100)->nullable()->after('shippo_rate_object_id');
            }
            if (! Schema::hasColumn('temp_orders', 'shippo_rate_amount')) {
                $table->decimal('shippo_rate_amount', 10, 2)->nullable()->after('shippo_carrier');
            }
        });
    }

    public function down(): void
    {
        Schema::table('temp_orders', function (Blueprint $table) {
            $cols = ['shippo_rate_object_id', 'shippo_carrier', 'shippo_rate_amount'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('temp_orders', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};

