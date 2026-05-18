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
        Schema::create('following_user_positions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('position_id')->constrained("follower_positions")->onDelete('cascade');
            $table->enum('experience_level', ['beginner', 'intermediate', 'expert'])->default('intermediate');
            $table->integer('years_of_experience')->default(0);
            $table->boolean('is_primary')->default(false);
            $table->text('skills')->nullable();
            $table->text('portfolio_url')->nullable();
            $table->boolean('is_verified')->default(false);
            $table->timestamps();

            $table->unique(['user_id', 'position_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('following_user_positions');
    }
};
