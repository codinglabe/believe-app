<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('phaze_balance_wallets', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique()->default('default');
            $table->decimal('available_balance', 12, 2)->default(0);
            $table->decimal('total_funded', 12, 2)->default(0);
            $table->decimal('total_consumed', 12, 2)->default(0);
            $table->string('currency', 3)->default('USD');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('phaze_balance_wallets');
    }
};
