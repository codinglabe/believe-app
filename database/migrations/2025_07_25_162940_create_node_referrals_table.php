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
        Schema::create('node_referrals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('node_boss_id')->constrained()->onDelete('cascade');
            $table->foreignId('node_share_id')->constrained()->onDelete('cascade');
            $table->unsignedBigInteger('node_sell_id')->nullable();
            $table->foreign('node_sell_id')->references('id')->on('node_sells')->onDelete('cascade');
            $table->string('referral_link')->unique();
            $table->decimal('parchentage', 10, 2)->default(20);
            $table->enum('status', ['active', 'inactive'])->default('inactive');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('node_referrals');
    }
};
