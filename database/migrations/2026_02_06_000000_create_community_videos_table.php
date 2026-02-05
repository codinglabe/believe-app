<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('community_videos', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique()->index();
            $table->text('description')->nullable();
            $table->string('thumbnail_url', 1024)->nullable();
            $table->string('video_url', 1024)->nullable();
            $table->unsignedInteger('duration_seconds')->default(0);
            $table->unsignedInteger('views')->default(0);
            $table->unsignedInteger('likes')->default(0);
            $table->foreignId('organization_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('category', 60)->nullable()->index(); // events, stories, impact
            $table->string('location', 120)->nullable();
            $table->boolean('is_featured')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('community_videos');
    }
};
