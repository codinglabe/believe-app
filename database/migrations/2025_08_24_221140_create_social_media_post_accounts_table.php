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
        Schema::create('social_media_post_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('social_media_post_id')->constrained()->onDelete('cascade');
            $table->foreignId('social_media_account_id')->constrained()->onDelete('cascade');
            $table->string('platform_post_id')->nullable(); // ID from the social media platform
            $table->string('status')->default('pending'); // pending, published, failed
            $table->json('platform_response')->nullable(); // Response from platform API
            $table->text('error_message')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->json('analytics')->nullable(); // Platform-specific analytics
            $table->timestamps();
            
            $table->unique(['social_media_post_id', 'social_media_account_id'], 'post_account_unique');
            $table->index(['social_media_account_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('social_media_post_accounts');
    }
};
