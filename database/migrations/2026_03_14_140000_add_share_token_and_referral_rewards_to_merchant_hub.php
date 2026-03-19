<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('merchant_hub_offer_redemptions', function (Blueprint $table) {
            if (!Schema::hasColumn('merchant_hub_offer_redemptions', 'share_token')) {
                $table->string('share_token', 32)->nullable()->unique()->after('receipt_code');
            }
        });

        Schema::create('merchant_hub_referral_rewards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('referrer_user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('referral_redemption_id')->constrained('merchant_hub_offer_redemptions')->onDelete('cascade');
            $table->unsignedInteger('points_awarded')->default(500);
            $table->timestamps();
            $table->unique('referral_redemption_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('merchant_hub_referral_rewards');
        Schema::table('merchant_hub_offer_redemptions', function (Blueprint $table) {
            if (Schema::hasColumn('merchant_hub_offer_redemptions', 'share_token')) {
                $table->dropColumn('share_token');
            }
        });
    }
};
