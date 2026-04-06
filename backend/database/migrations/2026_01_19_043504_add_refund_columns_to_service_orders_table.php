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
        Schema::table('service_orders', function (Blueprint $table) {
            $table->boolean('is_refunded')->default(false)->after('status');
            $table->timestamp('refunded_at')->nullable()->after('is_refunded');
            $table->string('refund_reason')->nullable()->after('refunded_at');
            $table->decimal('refund_amount', 10, 2)->nullable()->after('refund_reason');
            $table->string('stripe_refund_id')->nullable()->after('refund_amount');
            $table->string('refund_status')->nullable()->after('stripe_refund_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('service_orders', function (Blueprint $table) {
            //
        });
    }
};
