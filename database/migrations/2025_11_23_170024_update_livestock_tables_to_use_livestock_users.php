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
        // Helper function to check if a foreign key exists
        $hasForeignKey = function($table, $column) {
            try {
                $foreignKeys = DB::select("
                    SELECT CONSTRAINT_NAME 
                    FROM information_schema.KEY_COLUMN_USAGE 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = ? 
                    AND COLUMN_NAME = ? 
                    AND REFERENCED_TABLE_NAME IS NOT NULL
                ", [$table, $column]);
                return !empty($foreignKeys);
            } catch (\Exception $e) {
                return false;
            }
        };

        // Helper function to check if a column exists
        $hasColumn = function($table, $column) {
            return Schema::hasColumn($table, $column);
        };

        // Helper function to safely drop foreign key
        $dropForeignKeyIfExists = function($table, $column) use ($hasForeignKey) {
            if ($hasForeignKey($table, $column)) {
                try {
                    // Get the constraint name
                    $constraints = DB::select("
                        SELECT CONSTRAINT_NAME 
                        FROM information_schema.KEY_COLUMN_USAGE 
                        WHERE TABLE_SCHEMA = DATABASE() 
                        AND TABLE_NAME = ? 
                        AND COLUMN_NAME = ? 
                        AND REFERENCED_TABLE_NAME IS NOT NULL
                        LIMIT 1
                    ", [$table, $column]);
                    
                    if (!empty($constraints)) {
                        $constraintName = $constraints[0]->CONSTRAINT_NAME;
                        DB::statement("ALTER TABLE `{$table}` DROP FOREIGN KEY `{$constraintName}`");
                    }
                } catch (\Exception $e) {
                    // Ignore if foreign key doesn't exist
                }
            }
        };

        // Update seller_profiles table
        if (Schema::hasTable('seller_profiles')) {
            // Only update if user_id column exists (old structure)
            if ($hasColumn('seller_profiles', 'user_id')) {
                $dropForeignKeyIfExists('seller_profiles', 'user_id');
                Schema::table('seller_profiles', function (Blueprint $table) {
                    $table->renameColumn('user_id', 'livestock_user_id');
                });
            }
            // Ensure foreign key exists (in case it was already renamed but FK missing)
            if ($hasColumn('seller_profiles', 'livestock_user_id') && !$hasForeignKey('seller_profiles', 'livestock_user_id')) {
                Schema::table('seller_profiles', function (Blueprint $table) {
                    $table->foreign('livestock_user_id')->references('id')->on('livestock_users')->onDelete('cascade');
                });
            }
        }

        // Update livestock_animals table
        if (Schema::hasTable('livestock_animals')) {
            // Only update if old columns exist
            if ($hasColumn('livestock_animals', 'seller_id')) {
                $dropForeignKeyIfExists('livestock_animals', 'seller_id');
                Schema::table('livestock_animals', function (Blueprint $table) {
                    $table->renameColumn('seller_id', 'livestock_user_id');
                });
            }
            if ($hasColumn('livestock_animals', 'current_owner_id')) {
                $dropForeignKeyIfExists('livestock_animals', 'current_owner_id');
                Schema::table('livestock_animals', function (Blueprint $table) {
                    $table->renameColumn('current_owner_id', 'current_owner_livestock_user_id');
                });
            }
            // Ensure foreign keys exist
            if ($hasColumn('livestock_animals', 'livestock_user_id') && !$hasForeignKey('livestock_animals', 'livestock_user_id')) {
                Schema::table('livestock_animals', function (Blueprint $table) {
                    $table->foreign('livestock_user_id')->references('id')->on('livestock_users')->onDelete('cascade');
                });
            }
            if ($hasColumn('livestock_animals', 'current_owner_livestock_user_id') && !$hasForeignKey('livestock_animals', 'current_owner_livestock_user_id')) {
                Schema::table('livestock_animals', function (Blueprint $table) {
                    $table->foreign('current_owner_livestock_user_id')->references('id')->on('livestock_users')->onDelete('restrict');
                });
            }
        }

        // Update livestock_listings table
        if (Schema::hasTable('livestock_listings')) {
            // Only update if seller_id column exists
            if ($hasColumn('livestock_listings', 'seller_id')) {
                $dropForeignKeyIfExists('livestock_listings', 'seller_id');
                Schema::table('livestock_listings', function (Blueprint $table) {
                    $table->renameColumn('seller_id', 'livestock_user_id');
                });
            }
            // Ensure foreign key exists
            if ($hasColumn('livestock_listings', 'livestock_user_id') && !$hasForeignKey('livestock_listings', 'livestock_user_id')) {
                Schema::table('livestock_listings', function (Blueprint $table) {
                    $table->foreign('livestock_user_id')->references('id')->on('livestock_users')->onDelete('cascade');
                });
            }
        }

        // Update livestock_payouts table
        if (Schema::hasTable('livestock_payouts')) {
            // Only update if user_id column exists
            if ($hasColumn('livestock_payouts', 'user_id')) {
                $dropForeignKeyIfExists('livestock_payouts', 'user_id');
                Schema::table('livestock_payouts', function (Blueprint $table) {
                    $table->renameColumn('user_id', 'livestock_user_id');
                });
            }
            // Ensure foreign key exists
            if ($hasColumn('livestock_payouts', 'livestock_user_id') && !$hasForeignKey('livestock_payouts', 'livestock_user_id')) {
                Schema::table('livestock_payouts', function (Blueprint $table) {
                    $table->foreign('livestock_user_id')->references('id')->on('livestock_users')->onDelete('cascade');
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert livestock_payouts
        if (Schema::hasTable('livestock_payouts')) {
            Schema::table('livestock_payouts', function (Blueprint $table) {
                $table->dropForeign(['livestock_user_id']);
                $table->renameColumn('livestock_user_id', 'user_id');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            });
        }

        // Revert livestock_listings
        if (Schema::hasTable('livestock_listings')) {
            Schema::table('livestock_listings', function (Blueprint $table) {
                $table->dropForeign(['livestock_user_id']);
                $table->renameColumn('livestock_user_id', 'seller_id');
                $table->foreign('seller_id')->references('id')->on('users')->onDelete('cascade');
            });
        }

        // Revert livestock_animals
        if (Schema::hasTable('livestock_animals')) {
            Schema::table('livestock_animals', function (Blueprint $table) {
                $table->dropForeign(['livestock_user_id']);
                $table->dropForeign(['current_owner_livestock_user_id']);
                $table->renameColumn('livestock_user_id', 'seller_id');
                $table->renameColumn('current_owner_livestock_user_id', 'current_owner_id');
                $table->foreign('seller_id')->references('id')->on('users')->onDelete('cascade');
                $table->foreign('current_owner_id')->references('id')->on('users')->onDelete('restrict');
            });
        }

        // Revert seller_profiles
        if (Schema::hasTable('seller_profiles')) {
            Schema::table('seller_profiles', function (Blueprint $table) {
                $table->dropForeign(['livestock_user_id']);
                $table->renameColumn('livestock_user_id', 'user_id');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            });
        }
    }
};
