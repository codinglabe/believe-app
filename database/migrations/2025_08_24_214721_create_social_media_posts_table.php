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
        Schema::create('social_media_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->text('content');
            $table->json('media_files')->nullable(); // Array of media file paths/URLs
            $table->string('status')->default('draft'); // draft, scheduled, published, failed
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->json('analytics')->nullable(); // General analytics
            $table->boolean('is_published')->default(false);
            $table->timestamps();
            
            $table->index(['user_id', 'status']);
            $table->index(['scheduled_at', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('social_media_posts');
    }
};
