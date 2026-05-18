<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_videos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('prompt')->nullable();
            $table->longText('ai_script')->nullable();
            $table->text('caption')->nullable();
            $table->json('hashtags')->nullable();
            $table->string('template_key')->nullable()->index();
            $table->json('template_inputs')->nullable();
            $table->string('fal_provider')->nullable();
            $table->string('fal_model')->nullable();
            $table->string('fal_job_id')->nullable()->index();
            $table->text('video_source_url')->nullable();
            $table->unsignedSmallInteger('duration_seconds')->nullable();
            $table->string('resolution', 32)->nullable();
            $table->string('orientation', 16)->nullable();
            $table->string('dropbox_path', 2048)->nullable();
            $table->text('dropbox_shared_link')->nullable();
            $table->string('youtube_video_id', 64)->nullable()->index();
            $table->string('instagram_post_id', 128)->nullable();
            $table->string('tiktok_post_id', 128)->nullable();
            $table->string('status', 48)->default('pending_prompt')->index();
            $table->decimal('generation_cost', 12, 4)->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->text('failure_message')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_videos');
    }
};
