<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('believe_point_purchases', function (Blueprint $table) {
            $table->string('payment_method', 50)->nullable()->after('payment_rail');
            $table->string('receipt_image')->nullable()->after('payment_method');
        });
    }

    public function down(): void
    {
        Schema::table('believe_point_purchases', function (Blueprint $table) {
            $table->dropColumn(['payment_method', 'receipt_image']);
        });
    }
};
