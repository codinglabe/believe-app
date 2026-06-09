<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('organization_onboarding_documents')) {
            Schema::table('organization_onboarding_documents', function (Blueprint $table) {
                if (! $this->indexExists('organization_onboarding_documents', 'org_onboarding_docs_org_type_unique')) {
                    $table->unique(['organization_id', 'document_type'], 'org_onboarding_docs_org_type_unique');
                }
            });
        }

        if (! Schema::hasColumn('organizations', 'authorized_signer_info')) {
            Schema::table('organizations', function (Blueprint $table) {
                $table->json('authorized_signer_info')->nullable()->after('claim_verification_metadata');
                $table->timestamp('onboarding_completed_at')->nullable()->after('authorized_signer_info');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('organization_onboarding_documents')) {
            Schema::table('organization_onboarding_documents', function (Blueprint $table) {
                $table->dropUnique('org_onboarding_docs_org_type_unique');
            });
        }
    }

    private function indexExists(string $table, string $indexName): bool
    {
        $indexes = Schema::getIndexes($table);

        foreach ($indexes as $index) {
            if (($index['name'] ?? '') === $indexName) {
                return true;
            }
        }

        return false;
    }
};
