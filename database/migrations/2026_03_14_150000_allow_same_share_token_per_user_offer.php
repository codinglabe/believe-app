<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Allow same share_token on multiple redemptions so one person gets
     * the same share link for the same product when they buy multiple times.
     */
    public function up(): void
    {
        Schema::table('merchant_hub_offer_redemptions', function (Blueprint $table) {
            $table->dropUnique(['share_token']);
        });
    }

    public function down(): void
    {
        Schema::table('merchant_hub_offer_redemptions', function (Blueprint $table) {
            $table->unique('share_token');
        });
    }
};
