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
        Schema::create('service_seller_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');

            // Basic Information
            $table->string('profile_image')->nullable();
            $table->text('bio')->nullable();
            $table->string('location')->nullable();
            $table->string('timezone')->nullable();
            $table->string('phone')->nullable();

            // Skills & Languages
            $table->json('skills')->nullable(); // Array of skills/tags
            $table->json('languages')->nullable(); // Array of languages with proficiency level

            // Professional Information
            $table->json('education')->nullable(); // Array of education entries
            $table->json('experience')->nullable(); // Array of work experience entries
            $table->string('response_time')->nullable(); // e.g., "1 hour", "2-3 hours", "1 day"

            // Social Links
            $table->string('website')->nullable();
            $table->string('linkedin')->nullable();
            $table->string('twitter')->nullable();
            $table->string('facebook')->nullable();
            $table->string('instagram')->nullable();

            // Verification Status
            $table->enum('verification_status', ['pending', 'verified', 'rejected'])->default('pending');
            $table->text('rejection_reason')->nullable();

            // Stats (can be calculated, but cached for performance)
            $table->integer('total_orders')->default(0);
            $table->decimal('average_rating', 3, 2)->default(0);
            $table->integer('response_rate')->default(0); // Percentage
            $table->string('member_since')->nullable(); // Date when profile was created

            $table->timestamps();

            $table->index('user_id');
            $table->index('verification_status');
            $table->unique('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('service_seller_profiles');
    }
};
