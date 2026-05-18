<?php

use App\Support\ProfileReligions;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scripture_books', function (Blueprint $table) {
            $table->id();
            /** Nullable = any learner; else one of {@see ProfileReligions::OPTIONS}. */
            $table->string('religion', 64)->nullable();
            /** Stable key for imports, e.g. kjv, quran-en-asad, bhagavad-gita. */
            $table->string('identifier', 128)->unique();
            $table->string('name', 255);
            $table->string('short_name', 64)->nullable();
            $table->string('language', 32)->nullable();
            $table->string('translation_label', 128)->nullable();
            /** JSON array — same hub matching as `challenge_grounding_passages.topics` (category / subcategory labels). */
            $table->json('topics')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('religion');
            $table->index('is_active');
        });

        Schema::create('scripture_verses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('scripture_book_id')->constrained('scripture_books')->cascadeOnDelete();
            $table->unsignedInteger('chapter_number');
            $table->unsignedInteger('verse_number');
            $table->longText('text');
            $table->timestamps();

            $table->unique(['scripture_book_id', 'chapter_number', 'verse_number'], 'scripture_verses_book_chapter_verse_unique');
            $table->index(['scripture_book_id', 'chapter_number'], 'scripture_verses_book_chapter_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scripture_verses');
        Schema::dropIfExists('scripture_books');
    }
};
