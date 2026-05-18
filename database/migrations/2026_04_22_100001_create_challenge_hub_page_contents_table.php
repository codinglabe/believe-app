<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('challenge_hub_page_contents', function (Blueprint $table) {
            $table->id();
            $table->string('hero_title');
            $table->text('hero_subtitle')->nullable();
            $table->string('page_meta_title')->nullable();
            $table->text('page_meta_description')->nullable();
            $table->string('choose_challenge_heading');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('challenge_hub_page_contents');
    }
};
