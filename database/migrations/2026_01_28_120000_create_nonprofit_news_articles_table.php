<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nonprofit_news_articles', function (Blueprint $table) {
            $table->id();
            $table->string('source', 120)->index();
            $table->string('title');
            $table->string('link', 1024);
            $table->string('link_hash', 64)->index(); // for unique upsert (source + link)
            $table->text('summary')->nullable();
            $table->timestamp('published_at')->nullable()->index();
            $table->string('image_url', 1024)->nullable();
            $table->string('category', 80)->nullable()->index();
            $table->timestamps();

            $table->unique(['source', 'link_hash'], 'nonprofit_news_articles_source_link_unique');
        });

        if (config('database.default') === 'mysql') {
            DB::statement('ALTER TABLE nonprofit_news_articles ADD FULLTEXT INDEX nonprofit_news_articles_search (title, summary)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('nonprofit_news_articles');
    }
};
