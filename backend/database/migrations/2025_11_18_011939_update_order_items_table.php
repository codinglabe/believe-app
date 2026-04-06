<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            // <CHANGE> Add Printify blueprint and print provider IDs for order creation
            if (!Schema::hasColumn('order_items', 'printify_blueprint_id')) {
                $table->integer('printify_blueprint_id')->nullable()->after('printify_variant_id');
            }

            if (!Schema::hasColumn('order_items', 'printify_print_provider_id')) {
                $table->integer('printify_print_provider_id')->nullable()->after('printify_blueprint_id');
            }

            // <CHANGE> Store variant data JSON for future reference
            if (!Schema::hasColumn('order_items', 'variant_data')) {
                $table->json('variant_data')->nullable()->after('product_details');
            }

            // <CHANGE> Track if order line was successfully created in Printify
            if (!Schema::hasColumn('order_items', 'printify_synced')) {
                $table->boolean('printify_synced')->default(false)->after('variant_data');
            }
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn([
                'printify_blueprint_id',
                'printify_print_provider_id',
                'variant_data',
                'printify_synced'
            ]);
        });
    }
};
