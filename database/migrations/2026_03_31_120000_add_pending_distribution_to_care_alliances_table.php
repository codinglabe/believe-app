<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('care_alliances', function (Blueprint $table) {
            $table->json('pending_distribution_json')->nullable()->after('financial_settings_completed_at');
            $table->timestamp('pending_distribution_started_at')->nullable()->after('pending_distribution_json');
        });
    }

    public function down(): void
    {
        Schema::table('care_alliances', function (Blueprint $table) {
            $table->dropColumn(['pending_distribution_json', 'pending_distribution_started_at']);
        });
    }
};
