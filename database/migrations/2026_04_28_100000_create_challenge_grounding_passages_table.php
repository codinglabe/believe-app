<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('challenge_grounding_passages', function (Blueprint $table) {
            $table->id();
            /** Nullable = any learner; otherwise must match App\Support\ProfileReligions option strings. */
            $table->string('religion', 64)->nullable();
            /** Free label: kjv, quran, reference, article, etc. */
            $table->string('source_type', 64)->default('general');
            $table->string('reference', 255)->nullable();
            $table->longText('text');
            /** JSON array of topic tags — match hub category label and/or quiz subcategory name for retrieval. */
            $table->json('topics')->nullable();
            $table->timestamps();

            $table->index('religion');
            $table->index('source_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('challenge_grounding_passages');
    }
};
