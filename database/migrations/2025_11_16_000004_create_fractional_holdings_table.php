<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('fractional_holdings')) {
            return;
        }

        Schema::create('fractional_holdings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('offering_id')->constrained('fractional_offerings')->cascadeOnDelete();
            $table->unsignedBigInteger('shares')->default(0);
            $table->decimal('avg_cost_per_share', 12, 4)->default(0);
            $table->timestamps();
            $table->unique(['user_id', 'offering_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fractional_holdings');
    }
};



