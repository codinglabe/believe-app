<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('temp_orders', function (Blueprint $table) {
            if (! Schema::hasColumn('temp_orders', 'shippo_shipment_id')) {
                $table->string('shippo_shipment_id', 100)->nullable()->after('shippo_rate_object_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('temp_orders', function (Blueprint $table) {
            if (Schema::hasColumn('temp_orders', 'shippo_shipment_id')) {
                $table->dropColumn('shippo_shipment_id');
            }
        });
    }
};
