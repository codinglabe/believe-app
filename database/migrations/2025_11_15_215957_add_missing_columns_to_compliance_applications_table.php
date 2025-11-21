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
        Schema::table('compliance_applications', function (Blueprint $table) {
            if (!Schema::hasColumn('compliance_applications', 'description')) {
                $table->text('description')->nullable()->after('assistance_types');
            }
            if (!Schema::hasColumn('compliance_applications', 'documents')) {
                $table->json('documents')->nullable()->after('description');
            }
            if (!Schema::hasColumn('compliance_applications', 'contact_name')) {
                $table->string('contact_name')->nullable()->after('documents');
            }
            if (!Schema::hasColumn('compliance_applications', 'contact_email')) {
                $table->string('contact_email')->nullable()->after('contact_name');
            }
            if (!Schema::hasColumn('compliance_applications', 'contact_phone')) {
                $table->string('contact_phone')->nullable()->after('contact_email');
            }
            if (!Schema::hasColumn('compliance_applications', 'submitted_at')) {
                $table->timestamp('submitted_at')->nullable()->after('contact_phone');
            }
            if (!Schema::hasColumn('compliance_applications', 'reviewed_at')) {
                $table->timestamp('reviewed_at')->nullable()->after('submitted_at');
            }
            if (!Schema::hasColumn('compliance_applications', 'reviewed_by')) {
                $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete()->after('reviewed_at');
            }
            if (!Schema::hasColumn('compliance_applications', 'meta')) {
                $table->json('meta')->nullable()->after('reviewed_by');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('compliance_applications', function (Blueprint $table) {
            if (Schema::hasColumn('compliance_applications', 'meta')) {
                $table->dropColumn('meta');
            }
            if (Schema::hasColumn('compliance_applications', 'reviewed_by')) {
                $table->dropForeign(['reviewed_by']);
                $table->dropColumn('reviewed_by');
            }
            if (Schema::hasColumn('compliance_applications', 'reviewed_at')) {
                $table->dropColumn('reviewed_at');
            }
            if (Schema::hasColumn('compliance_applications', 'submitted_at')) {
                $table->dropColumn('submitted_at');
            }
            if (Schema::hasColumn('compliance_applications', 'contact_phone')) {
                $table->dropColumn('contact_phone');
            }
            if (Schema::hasColumn('compliance_applications', 'contact_email')) {
                $table->dropColumn('contact_email');
            }
            if (Schema::hasColumn('compliance_applications', 'contact_name')) {
                $table->dropColumn('contact_name');
            }
            if (Schema::hasColumn('compliance_applications', 'documents')) {
                $table->dropColumn('documents');
            }
            if (Schema::hasColumn('compliance_applications', 'description')) {
                $table->dropColumn('description');
            }
        });
    }
};
