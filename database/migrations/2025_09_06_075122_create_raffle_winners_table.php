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
        Schema::create('raffle_winners', function (Blueprint $table) {
            $table->id();
            $table->foreignId('raffle_id')->constrained()->onDelete('cascade');
            $table->foreignId('raffle_ticket_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->integer('position'); // 1st, 2nd, 3rd place
            $table->string('prize_name');
            $table->text('prize_description')->nullable();
            $table->datetime('announced_at');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('raffle_winners');
    }
};
