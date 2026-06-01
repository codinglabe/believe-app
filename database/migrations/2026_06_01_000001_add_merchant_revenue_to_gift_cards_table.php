<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('gift_cards', function (Blueprint $table) {
            $table->decimal('merchant_revenue', 18, 8)
                ->default(0)
                ->after('nonprofit_commission')
                ->comment('Merchant share of provider commission (always 0 for Phaze gift cards)');
        });
    }

    public function down(): void
    {
        Schema::table('gift_cards', function (Blueprint $table) {
            $table->dropColumn('merchant_revenue');
        });
    }
};
