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
        Schema::create('bank_verifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('user_name');
            $table->string('bank_account_owner_name')->nullable();
            $table->string('bank_account_owner_email')->nullable();
            $table->string('bank_account_owner_phone')->nullable();
            $table->json('bank_account_owner_address')->nullable();
            $table->string('bank_name')->nullable();
            $table->string('account_type')->nullable();
            $table->string('account_mask')->nullable();
            $table->decimal('name_similarity_score', 5, 2)->default(0);
            $table->decimal('organization_match_score', 5, 2)->default(0);
            $table->decimal('address_match_score', 5, 2)->default(0);
            $table->boolean('ein_verified')->default(false);
            $table->enum('verification_status', ['pending', 'verified', 'rejected', 'name_mismatch'])->default('pending');
            $table->string('verification_method')->default('plaid_bank_account');
            $table->text('plaid_access_token')->nullable();
            $table->string('plaid_item_id')->nullable();
            $table->json('plaid_data')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'verification_status']);
            $table->index('verification_status');
            $table->index('verified_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bank_verifications');
    }
};
