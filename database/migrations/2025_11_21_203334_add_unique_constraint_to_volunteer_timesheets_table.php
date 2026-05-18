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
        Schema::table('volunteer_timesheets', function (Blueprint $table) {
            // Add unique constraint: same volunteer (job_application_id) can only have one entry per date per organization
            $table->unique(['job_application_id', 'work_date', 'organization_id'], 'unique_volunteer_date_org');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('volunteer_timesheets', function (Blueprint $table) {
            $table->dropUnique('unique_volunteer_date_org');
        });
    }
};
