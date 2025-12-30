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
        // Check if reviewer_type column already exists
        if (!Schema::hasColumn('service_reviews', 'reviewer_type')) {
            // First, add the reviewer_type column
            Schema::table('service_reviews', function (Blueprint $table) {
                $table->enum('reviewer_type', ['buyer', 'seller'])->default('buyer')->after('user_id');
            });

            // Update existing reviews to be buyer reviews
            DB::table('service_reviews')->update(['reviewer_type' => 'buyer']);
        }

        // Drop foreign key constraint first
        $foreignKeys = DB::select("SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_reviews' AND COLUMN_NAME = 'order_id' AND REFERENCED_TABLE_NAME IS NOT NULL");
        if (!empty($foreignKeys)) {
            $fkName = $foreignKeys[0]->CONSTRAINT_NAME;
            DB::statement("ALTER TABLE service_reviews DROP FOREIGN KEY {$fkName}");
        }

        // Drop the unique constraint
        $indexes = DB::select("SHOW INDEX FROM service_reviews WHERE Key_name = 'service_reviews_order_id_unique'");
        if (!empty($indexes)) {
            DB::statement('ALTER TABLE service_reviews DROP INDEX service_reviews_order_id_unique');
        }

        // Add new unique constraint on order_id + reviewer_type
        $newIndexes = DB::select("SHOW INDEX FROM service_reviews WHERE Key_name = 'order_reviewer_unique'");
        if (empty($newIndexes)) {
            Schema::table('service_reviews', function (Blueprint $table) {
                $table->unique(['order_id', 'reviewer_type'], 'order_reviewer_unique');
            });
        }

        // Recreate foreign key constraint
        if (!empty($foreignKeys)) {
            Schema::table('service_reviews', function (Blueprint $table) {
                $table->foreign('order_id')->references('id')->on('service_orders')->onDelete('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('service_reviews', function (Blueprint $table) {
            // Drop the new unique constraint
            $table->dropUnique('order_reviewer_unique');

            // Remove reviewer_type column
            $table->dropColumn('reviewer_type');

            // Restore original unique constraint
            $table->unique('order_id');
        });
    }
};
