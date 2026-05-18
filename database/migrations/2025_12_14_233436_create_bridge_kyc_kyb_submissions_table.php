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
        Schema::create('bridge_kyc_kyb_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bridge_integration_id')->constrained('bridge_integrations')->onDelete('cascade');
            $table->enum('type', ['kyc', 'kyb']); // Individual or Business
            $table->string('submission_status')->default('submitted'); // submitted, approved, rejected
            
            // Business Information (for KYB)
            $table->string('business_name')->nullable();
            $table->string('business_email')->nullable();
            $table->string('ein')->nullable();
            $table->json('business_address')->nullable();
            
            // Individual Information (for KYC)
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('email')->nullable();
            $table->date('birth_date')->nullable();
            $table->json('residential_address')->nullable();
            
            // Control Person / Beneficial Owner Information (for KYB)
            $table->json('control_person')->nullable(); // Stores control person data
            $table->json('associated_persons')->nullable(); // Stores all associated persons
            
            // Identifying Information
            $table->json('identifying_information')->nullable(); // SSN, EIN, Driver's License, etc.
            
            // Document Storage Paths
            $table->string('id_front_image_path')->nullable(); // Storage path for ID front image
            $table->string('id_back_image_path')->nullable(); // Storage path for ID back image
            
            // Bridge API Response
            $table->string('bridge_customer_id')->nullable();
            $table->json('bridge_response')->nullable(); // Full response from Bridge API
            $table->json('submission_data')->nullable(); // Complete data that was submitted
            
            $table->timestamps();
            
            $table->index('bridge_integration_id');
            $table->index('bridge_customer_id');
            $table->index('type');
            $table->index('submission_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bridge_kyc_kyb_submissions');
    }
};
