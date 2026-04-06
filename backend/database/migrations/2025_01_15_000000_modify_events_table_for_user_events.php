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
        // Only run if events table exists
        if (!Schema::hasTable('events')) {
            return;
        }

        Schema::table('events', function (Blueprint $table) {
            // Make organization_id nullable to allow user-created events
            $table->foreignId('organization_id')->nullable()->change();
            
            // Add user_id for user-created events
            if (!Schema::hasColumn('events', 'user_id')) {
                $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('cascade');
            }
            
            // Add event_type_id if it doesn't exist
            if (!Schema::hasColumn('events', 'event_type_id')) {
                $table->foreignId('event_type_id')->nullable()->constrained('event_types')->onDelete('set null');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn('user_id');
            
            // Revert organization_id to not nullable
            $table->foreignId('organization_id')->nullable(false)->change();
        });
    }
};


