<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Modify the status column to include 'queued'
        DB::statement("ALTER TABLE uploaded_files MODIFY COLUMN status ENUM('queued', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'queued'");
    }

    public function down(): void
    {
        // Revert back to original enum values
        DB::statement("ALTER TABLE uploaded_files MODIFY COLUMN status ENUM('processing', 'completed', 'failed') NOT NULL DEFAULT 'processing'");
    }
};
