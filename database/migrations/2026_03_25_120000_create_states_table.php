<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('states')) {
            return;
        }

        Schema::create('states', function (Blueprint $table) {
            $table->id();
            $table->foreignId('country_id')->constrained('countries')->cascadeOnDelete();
            $table->string('name');
            $table->string('abbr', 8);
            $table->timestamps();

            $table->unique(['country_id', 'abbr']);
            $table->index(['country_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('states');
    }
};
