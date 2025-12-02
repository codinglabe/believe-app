<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Helper function to check if foreign key exists
     */
    private function foreignKeyExists($table, $column, $referencedTable = null)
    {
        $query = "
            SELECT CONSTRAINT_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = '{$table}'
            AND COLUMN_NAME = '{$column}'
            AND REFERENCED_TABLE_NAME IS NOT NULL
        ";

        if ($referencedTable) {
            $query .= " AND REFERENCED_TABLE_NAME = '{$referencedTable}'";
        }

        $foreignKeys = DB::select($query);
        return !empty($foreignKeys);
    }

    /**
     * Helper function to drop foreign key by column name
     */
    private function dropForeignKeyIfExists($table, $column)
    {
        $query = "
            SELECT CONSTRAINT_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = '{$table}'
            AND COLUMN_NAME = '{$column}'
            AND REFERENCED_TABLE_NAME IS NOT NULL
        ";

        $foreignKeys = DB::select($query);

        if (!empty($foreignKeys)) {
            $constraintName = $foreignKeys[0]->CONSTRAINT_NAME;
            Schema::table($table, function (Blueprint $table) use ($constraintName) {
                $table->dropForeign([$constraintName]);
            });
        }
    }

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update seller_profiles table
        if (Schema::hasTable('seller_profiles') && Schema::hasColumn('seller_profiles', 'user_id')) {
            // Drop old foreign key
            $this->dropForeignKeyIfExists('seller_profiles', 'user_id');

            // Rename column
            Schema::table('seller_profiles', function (Blueprint $table) {
                $table->renameColumn('user_id', 'livestock_user_id');
            });

            // Add new foreign key only if it doesn't exist
            if (!$this->foreignKeyExists('seller_profiles', 'livestock_user_id', 'livestock_users')) {
                Schema::table('seller_profiles', function (Blueprint $table) {
                    $table->foreign('livestock_user_id')->references('id')->on('livestock_users')->onDelete('cascade');
                });
            }
        }

        // Update livestock_animals table
        if (Schema::hasTable('livestock_animals')) {
            // Drop old foreign keys
            if (Schema::hasColumn('livestock_animals', 'seller_id')) {
                $this->dropForeignKeyIfExists('livestock_animals', 'seller_id');
            }

            if (Schema::hasColumn('livestock_animals', 'current_owner_id')) {
                $this->dropForeignKeyIfExists('livestock_animals', 'current_owner_id');
            }

            // Rename columns
            Schema::table('livestock_animals', function (Blueprint $table) {
                if (Schema::hasColumn('livestock_animals', 'seller_id')) {
                    $table->renameColumn('seller_id', 'livestock_user_id');
                }
                if (Schema::hasColumn('livestock_animals', 'current_owner_id')) {
                    $table->renameColumn('current_owner_id', 'current_owner_livestock_user_id');
                }
            });

            // Add new foreign keys if they don't exist
            if (
                Schema::hasColumn('livestock_animals', 'livestock_user_id') &&
                !$this->foreignKeyExists('livestock_animals', 'livestock_user_id', 'livestock_users')
            ) {
                Schema::table('livestock_animals', function (Blueprint $table) {
                    $table->foreign('livestock_user_id')->references('id')->on('livestock_users')->onDelete('cascade');
                });
            }

            if (
                Schema::hasColumn('livestock_animals', 'current_owner_livestock_user_id') &&
                !$this->foreignKeyExists('livestock_animals', 'current_owner_livestock_user_id', 'livestock_users')
            ) {
                Schema::table('livestock_animals', function (Blueprint $table) {
                    $table->foreign('current_owner_livestock_user_id')->references('id')->on('livestock_users')->onDelete('restrict');
                });
            }
        }

        // Update livestock_listings table
        if (Schema::hasTable('livestock_listings') && Schema::hasColumn('livestock_listings', 'seller_id')) {
            // Drop old foreign key
            $this->dropForeignKeyIfExists('livestock_listings', 'seller_id');

            // Rename column
            Schema::table('livestock_listings', function (Blueprint $table) {
                $table->renameColumn('seller_id', 'livestock_user_id');
            });

            // Add new foreign key if it doesn't exist
            if (!$this->foreignKeyExists('livestock_listings', 'livestock_user_id', 'livestock_users')) {
                Schema::table('livestock_listings', function (Blueprint $table) {
                    $table->foreign('livestock_user_id')->references('id')->on('livestock_users')->onDelete('cascade');
                });
            }
        }

        // Update livestock_payouts table
        if (Schema::hasTable('livestock_payouts') && Schema::hasColumn('livestock_payouts', 'user_id')) {
            // Drop old foreign key
            $this->dropForeignKeyIfExists('livestock_payouts', 'user_id');

            // Rename column
            Schema::table('livestock_payouts', function (Blueprint $table) {
                $table->renameColumn('user_id', 'livestock_user_id');
            });

            // Add new foreign key if it doesn't exist
            if (!$this->foreignKeyExists('livestock_payouts', 'livestock_user_id', 'livestock_users')) {
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
        if (Schema::hasTable('livestock_payouts') && Schema::hasColumn('livestock_payouts', 'livestock_user_id')) {
            // Drop new foreign key
            $this->dropForeignKeyIfExists('livestock_payouts', 'livestock_user_id');

            // Rename column back
            Schema::table('livestock_payouts', function (Blueprint $table) {
                $table->renameColumn('livestock_user_id', 'user_id');
            });

            // Add old foreign key if it doesn't exist
            if (!$this->foreignKeyExists('livestock_payouts', 'user_id', 'users')) {
                Schema::table('livestock_payouts', function (Blueprint $table) {
                    $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                });
            }
        }

        // Revert livestock_listings
        if (Schema::hasTable('livestock_listings') && Schema::hasColumn('livestock_listings', 'livestock_user_id')) {
            // Drop new foreign key
            $this->dropForeignKeyIfExists('livestock_listings', 'livestock_user_id');

            // Rename column back
            Schema::table('livestock_listings', function (Blueprint $table) {
                $table->renameColumn('livestock_user_id', 'seller_id');
            });

            // Add old foreign key if it doesn't exist
            if (!$this->foreignKeyExists('livestock_listings', 'seller_id', 'users')) {
                Schema::table('livestock_listings', function (Blueprint $table) {
                    $table->foreign('seller_id')->references('id')->on('users')->onDelete('cascade');
                });
            }
        }

        // Revert livestock_animals
        if (Schema::hasTable('livestock_animals')) {
            // Drop new foreign keys
            if (Schema::hasColumn('livestock_animals', 'livestock_user_id')) {
                $this->dropForeignKeyIfExists('livestock_animals', 'livestock_user_id');
            }

            if (Schema::hasColumn('livestock_animals', 'current_owner_livestock_user_id')) {
                $this->dropForeignKeyIfExists('livestock_animals', 'current_owner_livestock_user_id');
            }

            // Rename columns back
            Schema::table('livestock_animals', function (Blueprint $table) {
                if (Schema::hasColumn('livestock_animals', 'livestock_user_id')) {
                    $table->renameColumn('livestock_user_id', 'seller_id');
                }
                if (Schema::hasColumn('livestock_animals', 'current_owner_livestock_user_id')) {
                    $table->renameColumn('current_owner_livestock_user_id', 'current_owner_id');
                }
            });

            // Add old foreign keys if they don't exist
            if (
                Schema::hasColumn('livestock_animals', 'seller_id') &&
                !$this->foreignKeyExists('livestock_animals', 'seller_id', 'users')
            ) {
                Schema::table('livestock_animals', function (Blueprint $table) {
                    $table->foreign('seller_id')->references('id')->on('users')->onDelete('cascade');
                });
            }

            if (
                Schema::hasColumn('livestock_animals', 'current_owner_id') &&
                !$this->foreignKeyExists('livestock_animals', 'current_owner_id', 'users')
            ) {
                Schema::table('livestock_animals', function (Blueprint $table) {
                    $table->foreign('current_owner_id')->references('id')->on('users')->onDelete('restrict');
                });
            }
        }

        // Revert seller_profiles
        if (Schema::hasTable('seller_profiles') && Schema::hasColumn('seller_profiles', 'livestock_user_id')) {
            // Drop new foreign key
            $this->dropForeignKeyIfExists('seller_profiles', 'livestock_user_id');

            // Rename column back
            Schema::table('seller_profiles', function (Blueprint $table) {
                $table->renameColumn('livestock_user_id', 'user_id');
            });

            // Add old foreign key if it doesn't exist
            if (!$this->foreignKeyExists('seller_profiles', 'user_id', 'users')) {
                Schema::table('seller_profiles', function (Blueprint $table) {
                    $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                });
            }
        }
    }
};
