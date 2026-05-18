<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('bids', 'shippo_shipment_id')) {
            Schema::table('bids', function (Blueprint $table) {
                $table->string('shippo_shipment_id', 120)->nullable()->after('shippo_rate_object_id');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('bids', 'shippo_shipment_id')) {
            Schema::table('bids', function (Blueprint $table) {
                $table->dropColumn('shippo_shipment_id');
            });
        }
    }
};
