<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // <CHANGE> Add shipping cost fields for Printify integration
            if (!Schema::hasColumn('orders', 'shipping_cost')) {
                $table->decimal('shipping_cost', 8, 2)->default(0)->after('total_amount');
            }

            if (!Schema::hasColumn('orders', 'shipping_provider')) {
                $table->string('shipping_provider')->nullable()->after('shipping_cost');
            }

            if (!Schema::hasColumn('orders', 'estimated_delivery_days')) {
                $table->integer('estimated_delivery_days')->nullable()->after('shipping_provider');
            }

            // <CHANGE> Store full Printify response for debugging
            if (!Schema::hasColumn('orders', 'printify_response')) {
                $table->json('printify_response')->nullable()->after('printify_status');
            }

            // <CHANGE> Track if order is pending Printify submission
            if (!Schema::hasColumn('orders', 'printify_submitted')) {
                $table->boolean('printify_submitted')->default(false)->after('printify_order_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'shipping_cost',
                'shipping_provider',
                'estimated_delivery_days',
                'printify_response',
                'printify_submitted'
            ]);
        });
    }
};
