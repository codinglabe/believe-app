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
        Schema::table('fractional_listings', function (Blueprint $table) {
            // Drop the foreign key constraint first
            $table->dropForeign(['livestock_animal_id']);
            
            // Make the column nullable
            $table->unsignedBigInteger('livestock_animal_id')->nullable()->change();
            
            // Re-add the foreign key constraint (nullable)
            $table->foreign('livestock_animal_id')
                ->references('id')
                ->on('livestock_animals')
                ->onDelete('cascade');
        });
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
