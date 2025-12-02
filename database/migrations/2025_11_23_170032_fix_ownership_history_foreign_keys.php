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
        if (Schema::hasTable('ownership_history')) {
            Schema::table('ownership_history', function (Blueprint $table) {
                // Drop existing foreign keys
                $table->dropForeign(['previous_owner_id']);
                $table->dropForeign(['new_owner_id']);
            });

            Schema::table('ownership_history', function (Blueprint $table) {
                // Add new foreign keys pointing to livestock_users
                $table->foreign('previous_owner_id')
                    ->references('id')
                    ->on('livestock_users')
                    ->onDelete('set null');
                    
                $table->foreign('new_owner_id')
                    ->references('id')
                    ->on('livestock_users')
                    ->onDelete('restrict');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('ownership_history')) {
            Schema::table('ownership_history', function (Blueprint $table) {
                // Drop foreign keys
                $table->dropForeign(['previous_owner_id']);
                $table->dropForeign(['new_owner_id']);
            });

            Schema::table('ownership_history', function (Blueprint $table) {
                // Restore original foreign keys pointing to users
                $table->foreign('previous_owner_id')
                    ->references('id')
                    ->on('users')
                    ->onDelete('set null');
                    
                $table->foreign('new_owner_id')
                    ->references('id')
                    ->on('users')
                    ->onDelete('restrict');
            });
        }
    }
};
