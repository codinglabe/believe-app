<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('fractional_assets')) {
            return;
        }

        Schema::create('fractional_assets', function (Blueprint $table) {
            $table->id();
            $table->string('type')->index(); // e.g., gold, real_estate, art
            $table->string('name');
            $table->string('symbol')->nullable(); // for gold tokens or short code
            $table->text('description')->nullable();
            $table->json('media')->nullable(); // images/videos for UI
            $table->json('meta')->nullable(); // extra attributes per asset type
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fractional_assets');
    }
};



