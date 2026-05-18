<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('challenge_questions', function (Blueprint $table) {
            $table->id();
            $table->string('category', 128);
            $table->string('subcategory', 128)->nullable();
            $table->text('question');
            $table->string('option_a', 512);
            $table->string('option_b', 512);
            $table->string('option_c', 512);
            $table->string('option_d', 512);
            $table->char('correct_option', 1); // A B C D
            $table->text('explanation')->nullable();
            $table->string('difficulty', 32)->nullable();
            $table->string('source', 32); // csv_import | openai
            $table->string('content_hash', 64);
            $table->timestamps();

            $table->unique('content_hash');
            $table->index(['category', 'subcategory']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('challenge_questions');
    }
};
