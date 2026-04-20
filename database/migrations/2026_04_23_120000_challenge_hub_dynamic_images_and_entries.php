<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('level_up_tracks', function (Blueprint $table) {
            $table->string('cover_image_path', 512)->nullable()->after('subject_categories');
            $table->text('hub_card_description')->nullable()->after('cover_image_path');
        });

        Schema::table('challenge_hub_categories', function (Blueprint $table) {
            $table->string('cover_image_path', 512)->nullable()->after('icon');
        });

        Schema::create('level_up_challenge_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('level_up_track_id')->constrained('level_up_tracks')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            /** Matches `challenge_questions.subcategory` for stats / grouping; null = all questions in track categories */
            $table->string('subcategory_key', 191)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->string('cover_image_path', 512)->nullable();
            $table->text('last_image_prompt')->nullable();
            $table->timestamps();

            $table->index(['level_up_track_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('level_up_challenge_entries');

        Schema::table('challenge_hub_categories', function (Blueprint $table) {
            $table->dropColumn('cover_image_path');
        });

        Schema::table('level_up_tracks', function (Blueprint $table) {
            $table->dropColumn(['cover_image_path', 'hub_card_description']);
        });
    }
};
