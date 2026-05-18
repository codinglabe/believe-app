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
        // Check if table exists
        if (Schema::hasTable('email_verification_codes')) {
            // Use raw SQL to rename column (MySQL doesn't support renameColumn without DBAL)
            if (Schema::hasColumn('email_verification_codes', 'used') && !Schema::hasColumn('email_verification_codes', 'is_used')) {
                DB::statement('ALTER TABLE `email_verification_codes` CHANGE `used` `is_used` TINYINT(1) NOT NULL DEFAULT 0');
            }
            
            // Add 'used_at' column if it doesn't exist
            if (!Schema::hasColumn('email_verification_codes', 'used_at')) {
                Schema::table('email_verification_codes', function (Blueprint $table) {
                    $table->timestamp('used_at')->nullable()->after('is_used');
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('email_verification_codes')) {
            // Use raw SQL to rename column back
            if (Schema::hasColumn('email_verification_codes', 'is_used') && !Schema::hasColumn('email_verification_codes', 'used')) {
                DB::statement('ALTER TABLE `email_verification_codes` CHANGE `is_used` `used` TINYINT(1) NOT NULL DEFAULT 0');
            }
            
            // Drop 'used_at' column if it exists
            if (Schema::hasColumn('email_verification_codes', 'used_at')) {
                Schema::table('email_verification_codes', function (Blueprint $table) {
                    $table->dropColumn('used_at');
                });
            }
        }
    }
};
