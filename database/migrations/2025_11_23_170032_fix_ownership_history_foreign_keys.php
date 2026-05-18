<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('ownership_history')) {
            // Get actual foreign key constraint names from database
            $getForeignKeyInfo = function($table, $column) {
                try {
                    $constraints = DB::select("
                        SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME 
                        FROM information_schema.KEY_COLUMN_USAGE 
                        WHERE TABLE_SCHEMA = DATABASE() 
                        AND TABLE_NAME = ? 
                        AND COLUMN_NAME = ? 
                        AND REFERENCED_TABLE_NAME IS NOT NULL
                        LIMIT 1
                    ", [$table, $column]);
                    
                    if (!empty($constraints)) {
                        return [
                            'name' => $constraints[0]->CONSTRAINT_NAME,
                            'referenced_table' => $constraints[0]->REFERENCED_TABLE_NAME
                        ];
                    }
                    return null;
                } catch (\Exception $e) {
                    return null;
                }
            };

            // Check and drop existing foreign keys if they point to 'users' table
            $previousOwnerFk = $getForeignKeyInfo('ownership_history', 'previous_owner_id');
            $newOwnerFk = $getForeignKeyInfo('ownership_history', 'new_owner_id');

            // Drop if they point to 'users' (old structure)
            if ($previousOwnerFk && $previousOwnerFk['referenced_table'] === 'users') {
                try {
                    DB::statement("ALTER TABLE `ownership_history` DROP FOREIGN KEY `{$previousOwnerFk['name']}`");
                } catch (\Exception $e) {
                    // Ignore if already dropped
                }
            }

            if ($newOwnerFk && $newOwnerFk['referenced_table'] === 'users') {
                try {
                    DB::statement("ALTER TABLE `ownership_history` DROP FOREIGN KEY `{$newOwnerFk['name']}`");
                } catch (\Exception $e) {
                    // Ignore if already dropped
                }
            }

            // Add new foreign keys pointing to livestock_users (only if they don't already exist)
            Schema::table('ownership_history', function (Blueprint $table) use ($previousOwnerFk, $newOwnerFk) {
                // Only add if foreign key doesn't exist or points to wrong table
                if (!$previousOwnerFk || $previousOwnerFk['referenced_table'] !== 'livestock_users') {
                    $table->foreign('previous_owner_id')
                        ->references('id')
                        ->on('livestock_users')
                        ->onDelete('set null');
                }
                    
                if (!$newOwnerFk || $newOwnerFk['referenced_table'] !== 'livestock_users') {
                    $table->foreign('new_owner_id')
                        ->references('id')
                        ->on('livestock_users')
                        ->onDelete('restrict');
                }
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
