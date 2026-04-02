<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('donations', function (Blueprint $table) {
            $table->boolean('donor_covers_processing_fees')->default(false);
            $table->decimal('processing_fee_estimate', 10, 2)->nullable();
            $table->decimal('checkout_total', 10, 2)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('donations', function (Blueprint $table) {
            $table->dropColumn(['donor_covers_processing_fees', 'processing_fee_estimate', 'checkout_total']);
        });
    }
};
