<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_challenge_question_events', function (Blueprint $table) {
            $table->foreignId('level_up_quiz_session_id')
                ->nullable()
                ->after('level_up_track_id')
                ->constrained('level_up_quiz_sessions')
                ->nullOnDelete();

            $table->unsignedSmallInteger('response_time_ms')->nullable()->after('answered_at');
            $table->boolean('timed_out')->default(false)->after('response_time_ms');
        });
    }

    public function down(): void
    {
        Schema::table('user_challenge_question_events', function (Blueprint $table) {
            $table->dropForeign(['level_up_quiz_session_id']);
            $table->dropColumn(['level_up_quiz_session_id', 'response_time_ms', 'timed_out']);
        });
    }
};
