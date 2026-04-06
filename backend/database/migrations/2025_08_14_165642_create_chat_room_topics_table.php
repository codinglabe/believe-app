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
        Schema::create('chat_room_topics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chat_room_id')->constrained("chat_rooms")->cascadeOnDelete();
            $table->foreignId('topic_id')->constrained("chat_topics")->cascadeOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chat_room_topics');
    }
};
