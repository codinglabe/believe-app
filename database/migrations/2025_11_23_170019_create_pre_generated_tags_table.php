<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('pre_generated_tags')) {
            return;
        }

        Schema::create('pre_generated_tags', function (Blueprint $table) {
            $table->id();
            $table->string('country_code', 2);
            $table->string('tag_number')->unique();
            $table->foreignId('fractional_asset_id')->nullable()->constrained('fractional_assets')->onDelete('set null');
            $table->foreignId('livestock_animal_id')->nullable()->constrained('livestock_animals')->onDelete('set null');
            $table->enum('status', ['available', 'assigned'])->default('available');
            $table->timestamps();

            $table->index('country_code');
            $table->index('status');
            $table->index('fractional_asset_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pre_generated_tags');
    }
};
