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
        Schema::create('volunteer_assessments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('submission_id')->nullable()->comment('Reference to volunteer task submission');
            $table->unsignedBigInteger('nonprofit_id')->nullable()->comment('Nonprofit organization that created the assessment');
            $table->string('grade', 50)->comment('Assessment grade: excellent, good, acceptable, needs_improvement, rejected');
            $table->decimal('multiplier', 5, 2)->default(0)->comment('Multiplier percentage (0.00 to 1.00 representing 0% to 100%)');
            $table->integer('final_points')->default(0)->comment('Calculated final points: base_points × multiplier');
            $table->text('review_notes')->nullable()->comment('Review notes and comments');
            $table->unsignedBigInteger('reviewed_by')->nullable()->comment('User ID of the reviewer');
            $table->timestamp('reviewed_at')->nullable()->comment('When the assessment was completed');
            $table->timestamps();

            // Foreign key constraints
            $table->foreign('nonprofit_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('reviewed_by')->references('id')->on('users')->onDelete('set null');
            
            // Indexes for performance
            $table->index('submission_id');
            $table->index('nonprofit_id');
            $table->index('reviewed_by');
            $table->index('reviewed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('volunteer_assessments');
    }
};
