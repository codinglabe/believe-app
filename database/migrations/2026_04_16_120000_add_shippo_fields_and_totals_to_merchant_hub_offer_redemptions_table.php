<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('merchant_hub_offer_redemptions', function (Blueprint $table) {
            if (! Schema::hasColumn('merchant_hub_offer_redemptions', 'subtotal_amount')) {
                $table->decimal('subtotal_amount', 10, 2)->nullable()->after('cash_spent');
            }
            if (! Schema::hasColumn('merchant_hub_offer_redemptions', 'platform_fee_amount')) {
                $table->decimal('platform_fee_amount', 10, 2)->nullable()->after('subtotal_amount');
            }
            if (! Schema::hasColumn('merchant_hub_offer_redemptions', 'shipping_cost')) {
                $table->decimal('shipping_cost', 10, 2)->nullable()->after('platform_fee_amount');
            }
            if (! Schema::hasColumn('merchant_hub_offer_redemptions', 'tax_amount')) {
                $table->decimal('tax_amount', 10, 2)->nullable()->after('shipping_cost');
            }
            if (! Schema::hasColumn('merchant_hub_offer_redemptions', 'total_amount')) {
                $table->decimal('total_amount', 10, 2)->nullable()->after('tax_amount');
            }

            if (! Schema::hasColumn('merchant_hub_offer_redemptions', 'shippo_shipment_id')) {
                $table->string('shippo_shipment_id', 80)->nullable()->after('total_amount');
            }
            if (! Schema::hasColumn('merchant_hub_offer_redemptions', 'shippo_rate_object_id')) {
                $table->string('shippo_rate_object_id', 80)->nullable()->after('shippo_shipment_id');
            }
            if (! Schema::hasColumn('merchant_hub_offer_redemptions', 'shippo_transaction_id')) {
                $table->string('shippo_transaction_id', 80)->nullable()->after('shippo_rate_object_id');
            }
            if (! Schema::hasColumn('merchant_hub_offer_redemptions', 'carrier')) {
                $table->string('carrier', 80)->nullable()->after('shippo_transaction_id');
            }
            if (! Schema::hasColumn('merchant_hub_offer_redemptions', 'tracking_number')) {
                $table->string('tracking_number', 120)->nullable()->after('carrier');
            }
            if (! Schema::hasColumn('merchant_hub_offer_redemptions', 'tracking_url')) {
                $table->text('tracking_url')->nullable()->after('tracking_number');
            }
            if (! Schema::hasColumn('merchant_hub_offer_redemptions', 'label_url')) {
                $table->text('label_url')->nullable()->after('tracking_url');
            }
            if (! Schema::hasColumn('merchant_hub_offer_redemptions', 'shipping_status')) {
                $table->string('shipping_status', 40)->nullable()->after('label_url');
            }
            if (! Schema::hasColumn('merchant_hub_offer_redemptions', 'shipped_at')) {
                $table->timestamp('shipped_at')->nullable()->after('shipping_status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('merchant_hub_offer_redemptions', function (Blueprint $table) {
            $cols = [
                'subtotal_amount',
                'platform_fee_amount',
                'shipping_cost',
                'tax_amount',
                'total_amount',
                'shippo_shipment_id',
                'shippo_rate_object_id',
                'shippo_transaction_id',
                'carrier',
                'tracking_number',
                'tracking_url',
                'label_url',
                'shipping_status',
                'shipped_at',
            ];
            $toDrop = array_filter($cols, fn ($c) => Schema::hasColumn('merchant_hub_offer_redemptions', $c));
            if (! empty($toDrop)) {
                $table->dropColumn($toDrop);
            }
        });
    }
};
