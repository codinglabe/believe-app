<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (! Schema::hasColumn('orders', 'shippo_shipment_id')) {
                $table->string('shippo_shipment_id', 100)->nullable()->after('tracking_url');
            }
            if (! Schema::hasColumn('orders', 'shippo_transaction_id')) {
                $table->string('shippo_transaction_id', 100)->nullable()->after('shippo_shipment_id');
            }
            if (! Schema::hasColumn('orders', 'shipping_status')) {
                $table->string('shipping_status', 32)->nullable()->after('shippo_transaction_id'); // pending_label, label_created, shipped, in_transit, delivered
            }
            if (! Schema::hasColumn('orders', 'carrier')) {
                $table->string('carrier', 100)->nullable()->after('shipping_status');
            }
            if (! Schema::hasColumn('orders', 'label_url')) {
                $table->string('label_url', 500)->nullable()->after('carrier');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $cols = ['shippo_shipment_id', 'shippo_transaction_id', 'shipping_status', 'carrier', 'label_url'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('orders', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
