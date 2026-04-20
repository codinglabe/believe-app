<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('user_challenge_question_events');

        Schema::create('user_challenge_question_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('level_up_track_id')->constrained('level_up_tracks')->cascadeOnDelete();
            $table->foreignId('challenge_question_id')->constrained('challenge_questions')->cascadeOnDelete();
            $table->string('status', 32)->default('pending'); // pending | answered
            $table->char('selected_option', 1)->nullable();
            $table->boolean('is_correct')->nullable();
            $table->decimal('points_awarded', 12, 2)->default(0);
            $table->timestamp('answered_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'challenge_question_id'], 'ucq_user_question_unique');
            $table->index(['user_id', 'level_up_track_id', 'status'], 'ucq_user_track_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_challenge_question_events');
    }
};
