<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_methods', function (Blueprint $table) {
            $table->text('sandbox_publishable_key')->nullable()->after('live_donation_product_id');
            $table->text('sandbox_secret_key')->nullable()->after('sandbox_publishable_key');
            $table->string('sandbox_customer_id')->nullable()->after('sandbox_secret_key');
            $table->text('sandbox_webhook_secret')->nullable()->after('sandbox_customer_id');
            $table->string('sandbox_donation_product_id')->nullable()->after('sandbox_webhook_secret');
        });
    }

    public function down(): void
    {
        Schema::table('payment_methods', function (Blueprint $table) {
            $table->dropColumn([
                'sandbox_publishable_key',
                'sandbox_secret_key',
                'sandbox_customer_id',
                'sandbox_webhook_secret',
                'sandbox_donation_product_id',
            ]);
        });
    }
};
