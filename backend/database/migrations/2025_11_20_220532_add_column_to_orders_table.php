<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->timestamp('shipped_at')->nullable()->after('updated_at');
            $table->timestamp('sent_to_production_at')->nullable()->after('shipped_at');
            $table->timestamp('delivered_at')->nullable()->after('sent_to_production_at');
            $table->integer('fulfilled_items_count')->nullable()->after('delivered_at');
            $table->integer('delivered_items_count')->nullable()->after('fulfilled_items_count');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'shipped_at',
                'sent_to_production_at',
                'delivered_at',
                'fulfilled_items_count',
                'delivered_items_count'
            ]);
        });
    }
};
