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
        Schema::create('meeting_chat_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meeting_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->text('message');
            $table->enum('message_type', ['text', 'emoji', 'file', 'system'])->default('text');
            $table->boolean('is_private')->default(false);
            $table->foreignId('recipient_id')->nullable()->constrained('users')->onDelete('cascade');
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['meeting_id', 'created_at']);
            $table->index(['meeting_id', 'is_private']);
            $table->index(['user_id', 'recipient_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('meeting_chat_messages');
    }
};
