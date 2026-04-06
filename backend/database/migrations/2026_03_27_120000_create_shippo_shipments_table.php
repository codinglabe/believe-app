<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shippo_shipments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('order_id')->constrained()->cascadeOnDelete();

            // manual only for now (requirement #9)
            $table->string('product_type', 16)->default('manual');

            // Shippo shipment / rate / transaction
            $table->string('shippo_shipment_id', 100)->nullable();
            $table->string('selected_rate_object_id', 100)->nullable();
            $table->string('shippo_transaction_id', 100)->nullable();

            // Snapshot of address used to create the shipment (ship-to)
            $table->string('ship_to_name', 255)->nullable();
            $table->string('ship_to_street1', 255)->nullable();
            $table->string('ship_to_city', 120)->nullable();
            $table->string('ship_to_state', 120)->nullable();
            $table->string('ship_to_zip', 50)->nullable();
            $table->string('ship_to_country', 2)->nullable();

            // Snapshot of parcel details
            $table->decimal('parcel_weight_oz', 10, 3)->nullable();
            $table->decimal('parcel_length_in', 10, 3)->nullable();
            $table->decimal('parcel_width_in', 10, 3)->nullable();
            $table->decimal('parcel_height_in', 10, 3)->nullable();

            // Label/tracking
            $table->string('tracking_number', 120)->nullable()->unique();
            $table->string('label_url', 500)->nullable();
            $table->string('carrier', 100)->nullable();

            // internal mapping: label_created | shipped | completed
            $table->string('status', 32)->nullable();

            $table->timestamps();

            $table->unique(['order_id', 'product_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shippo_shipments');
    }
};
