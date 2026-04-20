<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('challenge_quiz_subcategories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('challenge_hub_category_id')->constrained('challenge_hub_categories')->cascadeOnDelete();
            $table->string('name', 128);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['challenge_hub_category_id', 'name'], 'ch_quiz_subcat_hub_id_name_uq');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('challenge_quiz_subcategories');
    }
};
