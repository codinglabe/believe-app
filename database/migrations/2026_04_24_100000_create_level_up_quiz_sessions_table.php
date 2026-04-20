<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('level_up_quiz_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('level_up_track_id')->constrained('level_up_tracks')->cascadeOnDelete();
            $table->timestamp('started_at');
            $table->timestamp('ended_at')->nullable();
            $table->unsignedBigInteger('total_elapsed_ms')->nullable();
            $table->unsignedSmallInteger('correct_count')->default(0);
            $table->unsignedSmallInteger('incorrect_count')->default(0);
            $table->unsignedSmallInteger('max_answer_streak')->default(0);
            $table->unsignedSmallInteger('running_answer_streak')->default(0);
            $table->decimal('streak_bonus_awarded', 12, 2)->default(0);
            $table->timestamps();

            $table->index(['user_id', 'level_up_track_id', 'ended_at'], 'luqs_user_track_ended_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('level_up_quiz_sessions');
    }
};
