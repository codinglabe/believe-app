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
            $table->enum('status', ['pending', 'approved', 'rejected', 'in_progress'])->default('pending')->after('notes');
            $table->date('start_date')->nullable()->after('work_date');
            $table->date('end_date')->nullable()->after('start_date');
            $table->boolean('is_completion_request')->default(false)->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('volunteer_timesheets', function (Blueprint $table) {
            $table->dropColumn(['status', 'start_date', 'end_date', 'is_completion_request']);
        });
    }
};
