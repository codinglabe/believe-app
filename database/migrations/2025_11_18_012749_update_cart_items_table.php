<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('cart_items', function (Blueprint $table) {
            // <CHANGE> Add Printify variant tracking for cart items
            if (!Schema::hasColumn('cart_items', 'printify_variant_id')) {
                $table->string('printify_variant_id')->nullable()->after('product_id');
            }

            if (!Schema::hasColumn('cart_items', 'printify_blueprint_id')) {
                $table->integer('printify_blueprint_id')->nullable()->after('printify_variant_id');
            }

            if (!Schema::hasColumn('cart_items', 'printify_print_provider_id')) {
                $table->integer('printify_print_provider_id')->nullable()->after('printify_blueprint_id');
            }

            // <CHANGE> Store variant options (size, color, etc) as JSON
            if (!Schema::hasColumn('cart_items', 'variant_options')) {
                $table->json('variant_options')->nullable()->after('printify_print_provider_id');
            }

            // <CHANGE> Track variant price modifier
            if (!Schema::hasColumn('cart_items', 'variant_price_modifier')) {
                $table->decimal('variant_price_modifier', 8, 2)->default(0)->after('unit_price');
            }
        });
    }

    public function down(): void
    {
        Schema::table('cart_items', function (Blueprint $table) {
            $table->dropColumn([
                'printify_variant_id',
                'printify_blueprint_id',
                'printify_print_provider_id',
                'variant_options',
                'variant_price_modifier'
            ]);
        });
    }
};
