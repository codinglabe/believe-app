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
        Schema::table('livestock_users', function (Blueprint $table) {
            if (!Schema::hasColumn('livestock_users', 'stripe_id')) {
                $table->string('stripe_id')->nullable()->index();
            }
            if (!Schema::hasColumn('livestock_users', 'pm_type')) {
                $table->string('pm_type')->nullable();
            }
            if (!Schema::hasColumn('livestock_users', 'pm_last_four')) {
                $table->string('pm_last_four', 4)->nullable();
            }
            if (!Schema::hasColumn('livestock_users', 'trial_ends_at')) {
                $table->timestamp('trial_ends_at')->nullable();
            }
            if (!Schema::hasColumn('livestock_users', 'pm_expires_at')) {
                $table->timestamp('pm_expires_at')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('livestock_users', function (Blueprint $table) {
            $columns = ['stripe_id', 'pm_type', 'pm_last_four', 'trial_ends_at', 'pm_expires_at'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('livestock_users', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
