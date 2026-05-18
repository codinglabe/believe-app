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
        Schema::create('send_jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('scheduled_drop_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade'); // Recipient
            $table->string('channel'); // push, whatsapp, web
            $table->string('status')->default('queued'); // queued, sent, delivered, failed
            $table->string('idempotency_key')->unique();
            $table->text('error')->nullable();
            $table->dateTime('sent_at')->nullable();
            $table->json('metadata')->nullable(); // delivery data, response, etc.
            $table->timestamps();

            $table->index(['scheduled_drop_id', 'user_id', 'channel']);
            $table->index(['status', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('send_jobs');
    }
};
