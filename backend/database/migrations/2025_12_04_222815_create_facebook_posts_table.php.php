<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('facebook_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('organization_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('facebook_account_id')->nullable()->constrained()->onDelete('set null');
            $table->string('facebook_post_id')->nullable();
            $table->text('message');
            $table->string('link')->nullable();
            $table->string('image')->nullable();
            $table->string('video')->nullable();
            $table->enum('status', ['draft', 'pending', 'published', 'failed'])->default('draft');
            $table->timestamp('scheduled_for')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->json('response_data')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'status']);
            $table->index(['scheduled_for', 'status']);
            $table->index(['facebook_account_id', 'published_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('facebook_posts');
    }
};
