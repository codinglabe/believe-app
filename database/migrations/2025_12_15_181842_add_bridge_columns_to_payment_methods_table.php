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
            // Bridge API keys for sandbox and live environments
            $table->text('sandbox_api_key')->nullable()->after('live_webhook_secret');
            $table->text('live_api_key')->nullable()->after('sandbox_api_key');
            
            // Bridge webhook IDs and public keys
            $table->string('sandbox_webhook_id')->nullable()->after('live_api_key');
            $table->text('sandbox_webhook_public_key')->nullable()->after('sandbox_webhook_id');
            $table->string('live_webhook_id')->nullable()->after('sandbox_webhook_public_key');
            $table->text('live_webhook_public_key')->nullable()->after('live_webhook_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_methods', function (Blueprint $table) {
            $table->dropColumn([
                'sandbox_api_key',
                'live_api_key',
                'sandbox_webhook_id',
                'sandbox_webhook_public_key',
                'live_webhook_id',
                'live_webhook_public_key',
            ]);
        });
    }
};
