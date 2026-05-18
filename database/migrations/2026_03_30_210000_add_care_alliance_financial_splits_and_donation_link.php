<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('care_alliances', function (Blueprint $table) {
            if (! Schema::hasColumn('care_alliances', 'financial_fixed_splits')) {
                $table->json('financial_fixed_splits')->nullable();
            }
            if (! Schema::hasColumn('care_alliances', 'financial_settings_completed_at')) {
                $table->timestamp('financial_settings_completed_at')->nullable();
            }
        });

        if (! Schema::hasColumn('donations', 'care_alliance_id')) {
            Schema::table('donations', function (Blueprint $table) {
                $table->foreignId('care_alliance_id')->nullable()->after('organization_id')->constrained('care_alliances')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('donations', 'care_alliance_id')) {
            Schema::table('donations', function (Blueprint $table) {
                $table->dropForeign(['care_alliance_id']);
                $table->dropColumn('care_alliance_id');
            });
        }

        Schema::table('care_alliances', function (Blueprint $table) {
            if (Schema::hasColumn('care_alliances', 'financial_fixed_splits')) {
                $table->dropColumn('financial_fixed_splits');
            }
            if (Schema::hasColumn('care_alliances', 'financial_settings_completed_at')) {
                $table->dropColumn('financial_settings_completed_at');
            }
        });
    }
};
