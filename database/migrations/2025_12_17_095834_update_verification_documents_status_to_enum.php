<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Updates status from STRING to ENUM for document approval/rejection workflow.
     * 
     * Document statuses:
     * - pending: Document is awaiting review
     * - approved: Document has been approved
     * - rejected: Document has been rejected
     */
    public function up(): void
    {
        // Ensure all existing statuses are valid (should already be pending, approved, or rejected)
        // Update any invalid statuses to 'pending'
        DB::statement("UPDATE verification_documents SET status = 'pending' WHERE status NOT IN ('pending', 'approved', 'rejected')");

        // Change status from STRING to ENUM using raw SQL for MySQL
        DB::statement("ALTER TABLE verification_documents MODIFY COLUMN status ENUM(
            'pending',
            'approved',
            'rejected'
        ) DEFAULT 'pending'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to STRING type
        DB::statement("ALTER TABLE verification_documents MODIFY COLUMN status VARCHAR(255) DEFAULT 'pending'");
    }
};
