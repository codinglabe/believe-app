<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bids', function (Blueprint $table) {
            if (! Schema::hasColumn('bids', 'address_line1')) {
                $table->string('address_line1', 255)->nullable()->after('state');
            }
            if (! Schema::hasColumn('bids', 'address_line2')) {
                $table->string('address_line2', 255)->nullable()->after('address_line1');
            }
            if (! Schema::hasColumn('bids', 'zip')) {
                $table->string('zip', 20)->nullable()->after('address_line2');
            }
            if (! Schema::hasColumn('bids', 'country')) {
                $table->string('country', 2)->nullable()->after('zip');
            }

            // Store Shippo selection so winner payment success can be consistent
            if (! Schema::hasColumn('bids', 'shippo_rate_object_id')) {
                $table->string('shippo_rate_object_id', 100)->nullable()->after('country');
            }
            if (! Schema::hasColumn('bids', 'shippo_shipping_cost')) {
                $table->decimal('shippo_shipping_cost', 10, 2)->nullable()->after('shippo_rate_object_id')->default(null);
            }
            if (! Schema::hasColumn('bids', 'shippo_tax_amount')) {
                $table->decimal('shippo_tax_amount', 10, 2)->nullable()->after('shippo_shipping_cost')->default(null);
            }
            if (! Schema::hasColumn('bids', 'shippo_carrier')) {
                $table->string('shippo_carrier', 100)->nullable()->after('shippo_tax_amount');
            }
            if (! Schema::hasColumn('bids', 'shippo_currency')) {
                $table->string('shippo_currency', 3)->nullable()->after('shippo_carrier');
            }
        });
    }

    public function down(): void
    {
        Schema::table('bids', function (Blueprint $table) {
            $cols = [
                'address_line1',
                'address_line2',
                'zip',
                'country',
                'shippo_rate_object_id',
                'shippo_shipping_cost',
                'shippo_tax_amount',
                'shippo_carrier',
                'shippo_currency',
            ];

            foreach ($cols as $col) {
                if (Schema::hasColumn('bids', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};

