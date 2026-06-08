<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('unity_calls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('caller_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('chat_room_id')->nullable()->constrained('chat_rooms')->nullOnDelete();
            $table->foreignId('user_livestream_id')->constrained('user_livestreams')->cascadeOnDelete();
            $table->string('type', 16)->default('audio');
            $table->string('status', 24)->default('ringing');
            $table->timestamp('ring_expires_at')->nullable();
            $table->timestamp('answered_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'ring_expires_at']);
            $table->index('caller_id');
        });

        Schema::create('unity_call_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('unity_call_id')->constrained('unity_calls')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('role', 16)->default('callee');
            $table->string('status', 24)->default('ringing');
            $table->timestamps();

            $table->unique(['unity_call_id', 'user_id']);
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('unity_call_participants');
        Schema::dropIfExists('unity_calls');
    }
};
