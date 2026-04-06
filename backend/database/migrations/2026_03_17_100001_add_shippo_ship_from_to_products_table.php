<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Optional ship-from and parcel defaults for manual/bidding products (Shippo).
     * If null, use organization address and default parcel.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (! Schema::hasColumn('products', 'ship_from_name')) {
                $table->string('ship_from_name', 100)->nullable()->after('shipping_charge');
            }
            if (! Schema::hasColumn('products', 'ship_from_street1')) {
                $table->string('ship_from_street1', 255)->nullable()->after('ship_from_name');
            }
            if (! Schema::hasColumn('products', 'ship_from_city')) {
                $table->string('ship_from_city', 100)->nullable()->after('ship_from_street1');
            }
            if (! Schema::hasColumn('products', 'ship_from_state')) {
                $table->string('ship_from_state', 50)->nullable()->after('ship_from_city');
            }
            if (! Schema::hasColumn('products', 'ship_from_zip')) {
                $table->string('ship_from_zip', 20)->nullable()->after('ship_from_state');
            }
            if (! Schema::hasColumn('products', 'ship_from_country')) {
                $table->string('ship_from_country', 2)->nullable()->after('ship_from_zip');
            }
            if (! Schema::hasColumn('products', 'parcel_length_in')) {
                $table->decimal('parcel_length_in', 6, 2)->nullable()->after('ship_from_country');
            }
            if (! Schema::hasColumn('products', 'parcel_width_in')) {
                $table->decimal('parcel_width_in', 6, 2)->nullable()->after('parcel_length_in');
            }
            if (! Schema::hasColumn('products', 'parcel_height_in')) {
                $table->decimal('parcel_height_in', 6, 2)->nullable()->after('parcel_width_in');
            }
            if (! Schema::hasColumn('products', 'parcel_weight_oz')) {
                $table->decimal('parcel_weight_oz', 8, 2)->nullable()->after('parcel_height_in');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $cols = [
                'ship_from_name', 'ship_from_street1', 'ship_from_city', 'ship_from_state',
                'ship_from_zip', 'ship_from_country',
                'parcel_length_in', 'parcel_width_in', 'parcel_height_in', 'parcel_weight_oz',
            ];
            foreach ($cols as $col) {
                if (Schema::hasColumn('products', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
