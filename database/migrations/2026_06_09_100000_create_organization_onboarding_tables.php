<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('organization_onboarding_documents')) {
            return;
        }

        Schema::create('organization_onboarding_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('document_type', 64);
            $table->string('file_path')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'document_type'], 'org_onboarding_docs_org_type_unique');
        });

        if (! Schema::hasColumn('organizations', 'authorized_signer_info')) {
            Schema::table('organizations', function (Blueprint $table) {
                $table->json('authorized_signer_info')->nullable()->after('claim_verification_metadata');
                $table->timestamp('onboarding_completed_at')->nullable()->after('authorized_signer_info');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('organization_onboarding_documents');

        if (Schema::hasColumn('organizations', 'onboarding_completed_at')) {
            Schema::table('organizations', function (Blueprint $table) {
                $table->dropColumn(['authorized_signer_info', 'onboarding_completed_at']);
            });
        }
    }
};
