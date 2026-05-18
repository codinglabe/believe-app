<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_saved_nonprofit_news', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('nonprofit_news_article_id')->constrained('nonprofit_news_articles')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['user_id', 'nonprofit_news_article_id'], 'user_saved_nonprofit_news_user_article_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_saved_nonprofit_news');
    }
};
