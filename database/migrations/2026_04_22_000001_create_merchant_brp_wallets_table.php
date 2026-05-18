<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('merchant_brp_wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('merchant_id')->constrained('merchants')->onDelete('cascade');
            $table->bigInteger('balance_brp')->default(0);
            $table->bigInteger('reserved_brp')->default(0);
            $table->bigInteger('spent_brp')->default(0);
            $table->timestamps();

            $table->unique('merchant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('merchant_brp_wallets');
    }
};
