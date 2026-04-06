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
        Schema::create('courses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('topic_id')->nullable()->constrained('topics')->onDelete('set null');
            $table->foreignId('organization_id')->constrained('users')->onDelete('cascade'); // References users table
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade'); // References users table
            
            // Basic Information
            $table->string('name');
            $table->string('slug')->unique();
            $table->longText('description');
            
            // Pricing (Simplified for Nonprofits)
            $table->enum('pricing_type', ['free', 'paid'])->default('free');
            $table->decimal('course_fee', 8, 2)->nullable(); // Only used when pricing_type is 'paid'
            
            // Schedule & Format
            $table->date('start_date');
            $table->time('start_time');
            $table->date('end_date')->nullable();
            $table->string('duration'); // e.g., "1_week", "1_month", "6_weeks"
            $table->enum('format', ['online', 'in_person', 'hybrid'])->default('online');
            
            // Configuration
            $table->integer('max_participants')->default(20);
            $table->string('language')->default('English');
            
            // Target Audience & Impact
            $table->string('target_audience'); // e.g., "Adults 50+", "Job seekers"
            $table->longText('community_impact')->nullable();
            
            // Course Content (JSON Arrays)
            $table->json('learning_outcomes')->nullable(); // What participants will learn
            $table->json('prerequisites')->nullable(); // Requirements
            $table->json('materials_needed')->nullable(); // What to bring
            $table->json('accessibility_features')->nullable(); // Accessibility options
            
            // Nonprofit-Specific Features
            $table->boolean('certificate_provided')->default(false);
            $table->boolean('volunteer_opportunities')->default(false);
            
            // Media
            $table->string('image')->nullable(); // Course image
            
            // Metadata
            $table->integer('enrolled')->default(0);
            $table->float('rating', 2, 1)->default(0.0);
            $table->integer('total_reviews')->default(0);
            $table->timestamp('last_updated')->nullable();
            $table->timestamps();

            // Add indexes for better performance
            $table->index(['organization_id', 'start_date']);
            $table->index(['user_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('courses');
    }
};
