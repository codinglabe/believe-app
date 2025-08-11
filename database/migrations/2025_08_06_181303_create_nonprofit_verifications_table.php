<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nonprofit_verifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('ein');
            $table->string('organization_legal_name');
            $table->string('manager_name');
            $table->string('manager_title');
            $table->enum('verification_status', [
                'pending',
                'verified',
                'rejected',
                'needs_additional_docs',
                'flagged_fraud'
            ])->default('pending');
            $table->string('verification_method')->default('irs_records');
            
            // Verification checks (booleans)
            $table->boolean('nonprofit_exists')->default(false);
            $table->boolean('nonprofit_in_good_standing')->default(false);
            $table->boolean('bank_account_matches_nonprofit')->default(false);
            $table->boolean('manager_authorized_on_account')->default(false);
            $table->boolean('name_matches_public_records')->default(false);
            $table->boolean('manager_listed_as_officer')->default(false);
            $table->boolean('profile_name_matches_ceo')->default(false);
            $table->boolean('profile_name_matches_any_officer')->default(false);
            $table->boolean('profile_name_matches_organization_name')->default(false);
            
            // JSON fields
            $table->json('propublica_data')->nullable();
            $table->json('officers_list')->nullable();
            $table->json('ceo_info')->nullable();
            $table->json('fraud_flags')->nullable();
            $table->json('bank_verification_data')->nullable();
            $table->json('required_documents')->nullable();
            
            // Other fields
            $table->integer('compliance_score')->default(0);
            $table->text('verification_notes')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->text('rejection_reason')->nullable();
            
            $table->timestamps();
            
            // Indexes for performance
            $table->index(['user_id', 'verification_status']);
            $table->index('verification_status');
            $table->index('ein');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nonprofit_verifications');
    }
};
