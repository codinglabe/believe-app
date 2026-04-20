<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('challenge_hub_categories', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 64)->unique();
            $table->string('label');
            /** Lucide icon key (e.g. heart, globe2) — resolved on the frontend */
            $table->string('icon', 64);
            /** Value used with track filtering (may differ from slug, e.g. civics → history) */
            $table->string('filter_key', 64);
            $table->boolean('is_new')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('challenge_hub_categories');
    }
};
