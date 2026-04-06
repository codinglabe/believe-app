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
     * Updates submission_status from STRING to ENUM with Bridge's documented status values.
     * Also includes internal statuses like 'needs_more_info' for document rejection workflow.
     * 
     * Bridge KYC/KYB Link statuses:
     * - not_started, incomplete, under_review, awaiting_questionnaire, awaiting_ubo, approved, rejected, paused, offboarded
     * 
     * Internal statuses:
     * - needs_more_info (when documents are rejected and need re-upload)
     */
    public function up(): void
    {
        // First, update any legacy status values to Bridge statuses
        DB::statement("UPDATE bridge_kyc_kyb_submissions SET submission_status = 'not_started' WHERE submission_status = 'pending'");
        DB::statement("UPDATE bridge_kyc_kyb_submissions SET submission_status = 'under_review' WHERE submission_status IN ('submitted', 'in_review')");
        DB::statement("UPDATE bridge_kyc_kyb_submissions SET submission_status = 'approved' WHERE submission_status = 'verified'");

        // Change submission_status from STRING to ENUM using raw SQL for MySQL
        DB::statement("ALTER TABLE bridge_kyc_kyb_submissions MODIFY COLUMN submission_status ENUM(
            'not_started',
            'incomplete',
            'under_review',
            'awaiting_questionnaire',
            'awaiting_ubo',
            'approved',
            'rejected',
            'paused',
            'offboarded',
            'needs_more_info'
        ) DEFAULT 'not_started'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Map Bridge statuses back to legacy values
        DB::statement("UPDATE bridge_kyc_kyb_submissions SET submission_status = 'pending' WHERE submission_status = 'not_started'");
        DB::statement("UPDATE bridge_kyc_kyb_submissions SET submission_status = 'submitted' WHERE submission_status = 'under_review'");
        DB::statement("UPDATE bridge_kyc_kyb_submissions SET submission_status = 'approved' WHERE submission_status = 'approved'");

        // Revert to STRING type
        DB::statement("ALTER TABLE bridge_kyc_kyb_submissions MODIFY COLUMN submission_status VARCHAR(255) DEFAULT 'submitted'");
    }
};
