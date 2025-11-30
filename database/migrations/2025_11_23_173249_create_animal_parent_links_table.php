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
        Schema::create('animal_parent_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('child_id')->constrained('livestock_animals')->onDelete('cascade');
            $table->foreignId('father_id')->nullable()->constrained('livestock_animals')->onDelete('set null');
            $table->foreignId('mother_id')->nullable()->constrained('livestock_animals')->onDelete('set null');
            $table->foreignId('breeding_event_id')->nullable()->constrained('breeding_events')->onDelete('set null');
            $table->timestamps();
            
            $table->unique('child_id'); // Each animal can only have one parent link record
            $table->index('father_id');
            $table->index('mother_id');
            $table->index('breeding_event_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('animal_parent_links');
    }
};
