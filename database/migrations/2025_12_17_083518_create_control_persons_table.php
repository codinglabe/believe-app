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
        Schema::create('control_persons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bridge_kyc_kyb_submission_id')->constrained('bridge_kyc_kyb_submissions')->onDelete('cascade');
            
            // Personal Information
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email');
            $table->date('birth_date');
            $table->string('ssn')->nullable(); // Encrypted or hashed
            
            // Role and Ownership
            $table->string('title')->nullable(); // CEO, President, etc.
            $table->decimal('ownership_percentage', 5, 2)->nullable(); // 0.00 to 100.00
            
            // Address
            $table->string('street_line_1');
            $table->string('city');
            $table->string('state'); // State or subdivision
            $table->string('postal_code');
            $table->string('country')->default('USA');
            
            // ID Information
            $table->string('id_type')->nullable(); // drivers_license, passport
            $table->string('id_number')->nullable();
            // ID images are stored in verification_documents table
            
            // Bridge API
            $table->string('bridge_associated_person_id')->nullable(); // ID from Bridge API after creation
            
            $table->timestamps();
            
            $table->index('bridge_kyc_kyb_submission_id');
            $table->index('bridge_associated_person_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('control_persons');
    }
};
