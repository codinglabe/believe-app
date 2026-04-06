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
        Schema::create('enrollments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('course_id')->constrained()->onDelete('cascade');
            $table->enum('status', ['active', 'completed', 'cancelled', 'refunded'])->default('active');
            $table->decimal('amount_paid', 10, 2)->default(0);
            $table->string('payment_intent_id')->nullable();
            $table->enum('payment_status', ['pending', 'completed', 'failed', 'not_required'])->default('not_required');
            $table->string('refund_id')->nullable();
            $table->timestamp('enrolled_at');
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->timestamps();

            // Ensure a user can only enroll once per course
            $table->unique(['user_id', 'course_id']);
            
            // Indexes for better performance
            $table->index(['user_id', 'status']);
            $table->index(['course_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('enrollments');
    }
};
