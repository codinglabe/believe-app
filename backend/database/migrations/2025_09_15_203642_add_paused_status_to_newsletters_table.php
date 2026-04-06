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
        Schema::table('newsletters', function (Blueprint $table) {
            // Add 'paused' to the existing status enum
            DB::statement("ALTER TABLE newsletters MODIFY COLUMN status ENUM('draft', 'paused', 'scheduled', 'sending', 'sent', 'failed') NOT NULL DEFAULT 'draft'");
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('newsletters', function (Blueprint $table) {
            // Remove 'paused' from the status enum
            DB::statement("ALTER TABLE newsletters MODIFY COLUMN status ENUM('draft', 'scheduled', 'sending', 'sent', 'failed') NOT NULL DEFAULT 'draft'");
        });
    }
};
