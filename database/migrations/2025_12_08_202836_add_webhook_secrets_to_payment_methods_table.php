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
        Schema::table('payment_methods', function (Blueprint $table) {
            // Webhook secrets for test and live environments
            $table->text('test_webhook_secret')->nullable()->after('live_customer_id');
            $table->text('live_webhook_secret')->nullable()->after('test_webhook_secret');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_methods', function (Blueprint $table) {
            $table->dropColumn([
                'test_webhook_secret',
                'live_webhook_secret',
            ]);
        });
    }
};
