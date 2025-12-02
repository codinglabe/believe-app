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
            
            Schema::table('fractional_listings', function (Blueprint $table) {
                // Try to drop foreign key if it exists
                try {
                    $table->dropForeign(['fractional_listings_livestock_animal_id_foreign']);
                } catch (\Exception $e) {
                    // Foreign key might have a different name or not exist, try common names
                    try {
                        $table->dropForeign(['livestock_animal_id']);
                    } catch (\Exception $e2) {
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
