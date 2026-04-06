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
        Schema::create('impact_points', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('source_type'); // 'volunteer', 'donation', 'follow', 'bonus'
            $table->unsignedBigInteger('source_id')->nullable(); // ID of the related record (timesheet_id, donation_id, etc.)
            $table->decimal('points', 10, 2); // Impact points earned
            $table->text('description')->nullable(); // Description of the action
            $table->json('metadata')->nullable(); // Additional data (hours, amount, etc.)
            $table->date('activity_date'); // Date when the activity occurred
            $table->timestamps();

            // Indexes for performance
            $table->index(['user_id', 'activity_date']);
            $table->index(['source_type', 'source_id']);
            $table->index('activity_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('impact_points');
    }
};
