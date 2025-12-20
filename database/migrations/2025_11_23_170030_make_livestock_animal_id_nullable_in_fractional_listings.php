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
        if (Schema::hasTable('fractional_listings') && Schema::hasColumn('fractional_listings', 'livestock_animal_id')) {
            // Check if column is already nullable
            $columnInfo = DB::select("SHOW COLUMNS FROM `fractional_listings` WHERE Field = 'livestock_animal_id'");
            if (!empty($columnInfo) && $columnInfo[0]->Null === 'YES') {
                // Column is already nullable, skip migration
                return;
            }

            // Find the actual foreign key constraint name
            $foreignKeyName = null;
            try {
                $foreignKeys = DB::select("
                    SELECT CONSTRAINT_NAME
                    FROM information_schema.KEY_COLUMN_USAGE
                    WHERE TABLE_SCHEMA = DATABASE()
                    AND TABLE_NAME = 'fractional_listings'
                    AND COLUMN_NAME = 'livestock_animal_id'
                    AND REFERENCED_TABLE_NAME IS NOT NULL
                ");

                if (!empty($foreignKeys)) {
                    $foreignKeyName = $foreignKeys[0]->CONSTRAINT_NAME;
                }
            } catch (\Exception $e) {
                // If query fails, we'll try alternative methods
            }

            Schema::table('fractional_listings', function (Blueprint $table) use ($foreignKeyName) {
                // Drop foreign key if it exists
                if ($foreignKeyName) {
                    try {
                        // Use the actual constraint name as a string
                        $table->dropForeign($foreignKeyName);
                    } catch (\Exception $e) {
                        // Try alternative method using column name
                        try {
                            $table->dropForeign(['livestock_animal_id']);
                        } catch (\Exception $e2) {
                            // Ignore if foreign key doesn't exist
                        }
                    }
                } else {
                    // Try dropping by column name if we couldn't find the constraint name
                    try {
                        $table->dropForeign(['livestock_animal_id']);
                    } catch (\Exception $e) {
                        // Ignore if foreign key doesn't exist
                    }
                }

                // Make the column nullable
                $table->unsignedBigInteger('livestock_animal_id')->nullable()->change();

                // Re-add the foreign key constraint (nullable)
                $table->foreign('livestock_animal_id')
                    ->references('id')
                    ->on('livestock_animals')
                    ->onDelete('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('fractional_listings', function (Blueprint $table) {
            // Drop the foreign key constraint
            $table->dropForeign(['livestock_animal_id']);

            // Make the column NOT NULL again
            $table->unsignedBigInteger('livestock_animal_id')->nullable(false)->change();

            // Re-add the foreign key constraint (NOT NULL)
            $table->foreign('livestock_animal_id')
                ->references('id')
                ->on('livestock_animals')
                ->onDelete('cascade');
        });
    }
};
