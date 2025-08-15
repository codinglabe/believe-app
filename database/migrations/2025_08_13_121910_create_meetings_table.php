<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('meetings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained()->onDelete('cascade');
            $table->foreignId('instructor_id')->constrained('users')->onDelete('cascade');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('meeting_id')->unique();
            $table->timestamp('scheduled_at');
            $table->integer('duration_minutes')->default(60);
            $table->enum('status', ['scheduled', 'active', 'ended', 'cancelled'])->default('scheduled');
            $table->integer('max_participants')->nullable();
            $table->boolean('is_recording_enabled')->default(true);
            $table->boolean('is_chat_enabled')->default(true);
            $table->boolean('is_screen_share_enabled')->default(true);
            $table->string('meeting_password')->nullable();
            $table->json('settings')->nullable();
            $table->timestamps();

            $table->index(['course_id', 'status']);
            $table->index(['instructor_id', 'scheduled_at']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('meetings');
    }
};
