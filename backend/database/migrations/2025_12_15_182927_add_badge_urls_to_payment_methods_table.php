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
            // Badge URLs for sandbox and live environments
            $table->text('sandbox_badge_url')->nullable()->after('sandbox_webhook_url');
            $table->text('live_badge_url')->nullable()->after('live_webhook_public_key');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_methods', function (Blueprint $table) {
            $table->dropColumn([
                'sandbox_badge_url',
                'live_badge_url',
            ]);
        });
    }
};
