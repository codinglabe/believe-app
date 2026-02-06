<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('push_notification_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('user_push_token_id')->nullable()->constrained('user_push_tokens')->onDelete('set null');
            $table->string('title');
            $table->text('body')->nullable();
            $table->string('source_type', 64)->nullable(); // campaign, event, chat, job_post, course, etc.
            $table->unsignedBigInteger('source_id')->nullable();
            $table->string('status', 20); // sent, failed
            $table->string('fcm_error_code', 64)->nullable();
            $table->json('fcm_response')->nullable();
            $table->timestamp('sent_at');
            $table->timestamps();

            $table->index(['user_id', 'sent_at']);
            $table->index(['status', 'sent_at']);
            $table->index('source_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_notification_logs');
    }
};
