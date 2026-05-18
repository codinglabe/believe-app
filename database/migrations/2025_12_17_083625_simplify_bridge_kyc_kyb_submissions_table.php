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
        Schema::table('bridge_kyc_kyb_submissions', function (Blueprint $table) {
            // Remove columns that are now in separate tables or can be retrieved from organizations
            $table->dropColumn([
                'business_name',
                'business_email',
                'business_address',
                'first_name',
                'last_name',
                'email',
                'birth_date',
                'residential_address',
                'control_person', // Now in control_persons table
                'associated_persons', // Now in associated_persons table
                'identifying_information',
                'id_front_image_path', // Now in verification_documents table
                'id_back_image_path', // Now in verification_documents table
            ]);
            
            // Keep only essential columns:
            // - bridge_integration_id (already exists)
            // - type (already exists)
            // - submission_status (already exists)
            // - ein (keep for quick reference)
            // - bridge_customer_id (already exists)
            // - bridge_response (already exists)
            // - submission_data (already exists - for any additional metadata)
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bridge_kyc_kyb_submissions', function (Blueprint $table) {
            // Restore dropped columns (for rollback)
            $table->string('business_name')->nullable();
            $table->string('business_email')->nullable();
            $table->json('business_address')->nullable();
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('email')->nullable();
            $table->date('birth_date')->nullable();
            $table->json('residential_address')->nullable();
            $table->json('control_person')->nullable();
            $table->json('associated_persons')->nullable();
            $table->json('identifying_information')->nullable();
            $table->string('id_front_image_path')->nullable();
            $table->string('id_back_image_path')->nullable();
        });
    }
};
