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
        Schema::table('believe_point_purchases', function (Blueprint $table) {
            $table->string('stripe_refund_id')->nullable()->after('stripe_payment_intent_id');
            $table->timestamp('refunded_at')->nullable()->after('stripe_refund_id');
            $table->enum('refund_status', ['pending', 'succeeded', 'failed'])->nullable()->after('refunded_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('believe_point_purchases', function (Blueprint $table) {
            $table->dropColumn(['stripe_refund_id', 'refunded_at', 'refund_status']);
        });
    }
};
