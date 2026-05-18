<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('believe_point_purchases', function (Blueprint $table) {
            $table->decimal('checkout_total', 12, 2)->nullable()->after('amount');
            $table->decimal('processing_fee_estimate', 12, 2)->nullable()->after('checkout_total');
        });
    }

    public function down(): void
    {
        Schema::table('believe_point_purchases', function (Blueprint $table) {
            $table->dropColumn(['checkout_total', 'processing_fee_estimate']);
        });
    }
};
