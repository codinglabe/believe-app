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
        Schema::create('org_livestreams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->onDelete('cascade');
            $table->string('room_name'); // e.g., "believe-stjohnbaptist"
            $table->string('room_password'); // 8-char random token (encrypted)
            $table->text('youtube_stream_key')->nullable(); // Encrypted YouTube stream key
            $table->string('youtube_broadcast_id')->nullable(); // YouTube broadcast ID if created via API
            $table->enum('status', ['draft', 'scheduled', 'live', 'ended', 'cancelled'])->default('draft');
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            $table->timestamp('scheduled_at')->nullable(); // When the stream is scheduled to start
            $table->timestamp('started_at')->nullable(); // When the stream actually started
            $table->timestamp('ended_at')->nullable(); // When the stream ended
            $table->json('settings')->nullable(); // Additional settings (codec, etc.)
            $table->timestamps();

            // Indexes
            $table->index('organization_id');
            $table->index('room_name');
            $table->index('status');
            $table->index('scheduled_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('org_livestreams');
    }
};
