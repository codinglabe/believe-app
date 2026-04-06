<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Drop unused tables - info already in orders and order_items tables
        Schema::dropIfExists('order_order_trackings');
        Schema::dropIfExists('order_printify_products');

        // Check if order_products table has different data than order_items, if not drop it
        if (Schema::hasTable('order_products')) {
            Schema::dropIfExists('order_products');
        }
    }

    public function down(): void
    {
        // Recreate tables if rollback needed
        // This is informational - you may want to backup before migration
    }
};
