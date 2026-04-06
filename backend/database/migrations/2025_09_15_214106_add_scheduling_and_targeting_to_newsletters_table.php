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
        Schema::table('newsletters', function (Blueprint $table) {
            // Date-wise scheduling
            $table->timestamp('send_date')->nullable()->after('scheduled_at');
            $table->enum('schedule_type', ['immediate', 'scheduled', 'recurring'])->default('immediate')->after('send_date');
            $table->json('recurring_settings')->nullable()->after('schedule_type'); // For recurring newsletters
            
            // User targeting
            $table->enum('target_type', ['all', 'users', 'organizations', 'specific'])->default('all')->after('recurring_settings');
            $table->json('target_users')->nullable()->after('target_type'); // Array of user IDs
            $table->json('target_organizations')->nullable()->after('target_users'); // Array of organization IDs
            $table->json('target_roles')->nullable()->after('target_organizations'); // Array of role names
            
            // Additional targeting options
            $table->json('target_criteria')->nullable()->after('target_roles'); // Custom targeting criteria
            $table->boolean('is_public')->default(false)->after('target_criteria'); // Public newsletter
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('newsletters', function (Blueprint $table) {
            $table->dropColumn([
                'send_date',
                'schedule_type',
                'recurring_settings',
                'target_type',
                'target_users',
                'target_organizations',
                'target_roles',
                'target_criteria',
                'is_public'
            ]);
        });
    }
};
