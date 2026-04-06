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
        Schema::table('volunteer_assessments', function (Blueprint $table) {
            $table->foreignId('timesheet_id')->nullable()->after('submission_id')->constrained('volunteer_timesheets')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('volunteer_assessments', function (Blueprint $table) {
            $table->dropForeign(['timesheet_id']);
            $table->dropColumn('timesheet_id');
        });
    }
};
