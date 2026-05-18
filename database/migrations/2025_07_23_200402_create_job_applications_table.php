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
        Schema::create('job_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_post_id')->constrained('job_posts')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained("users")->cascadeOnDelete();
            $table->string('address')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('country')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('postal_code')->nullable();
            $table->string('emergency_contact_name');
            $table->string('emergency_contact_relationship');
            $table->string('emergency_contact_phone');

            // 🔹 Experience & Background
            $table->text('volunteer_experience')->nullable();
            $table->text('work_or_education_background')->nullable();
            $table->json('languages_spoken')->nullable();
            $table->json('certifications')->nullable(); // e.g., ["CPR", "First Aid"]

            // 🔹 Health and Accessibility
            $table->text('medical_conditions')->nullable();
            $table->text('physical_limitations')->nullable();

            // 🔹 Background Check & Legal
            $table->boolean('consent_background_check')->default(false);
            $table->string('drivers_license_number')->nullable();
            $table->boolean('willing_background_check')->default(false);
            $table->boolean('ever_convicted')->default(false);
            $table->text('conviction_explanation')->nullable();

            // 🔹 References
            $table->string('reference_name')->nullable();
            $table->string('reference_relationship')->nullable();
            $table->string('reference_contact')->nullable();

            // 🔹 Signature & Agreement
            $table->boolean('agreed_to_terms')->default(false);
            $table->string('digital_signature')->nullable();
            $table->date('signed_date')->nullable();

            // 🔹 Optional Fields
            $table->string('tshirt_size')->nullable();
            $table->string('heard_about_us')->nullable();
            $table->string('social_media_handle')->nullable();

            $table->enum('status', ['pending', 'reviewed', 'accepted', 'rejected'])->default('pending'); // pending, reviewed, accepted, rejected
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_applications');
    }
};
