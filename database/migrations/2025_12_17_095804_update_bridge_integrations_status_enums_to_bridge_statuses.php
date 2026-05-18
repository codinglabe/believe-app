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
     * Updates kyc_status, kyb_status, and tos_status ENUMs to use Bridge's documented status values.
     * 
     * Bridge KYC/KYB Link statuses:
     * - not_started, incomplete, under_review, awaiting_questionnaire, awaiting_ubo, approved, rejected, paused, offboarded
     * 
     * Bridge ToS statuses:
     * - pending, approved
     */
    public function up(): void
    {
        // First, update any legacy status values to Bridge statuses
        // Only update 'pending' to 'not_started' if it's not already 'approved' or 'rejected'
        DB::statement("UPDATE bridge_integrations SET kyc_status = 'not_started' WHERE kyc_status = 'pending'");
        DB::statement("UPDATE bridge_integrations SET kyb_status = 'not_started' WHERE kyb_status = 'pending'");
        DB::statement("UPDATE bridge_integrations SET tos_status = 'approved' WHERE tos_status = 'accepted'");

        // For MySQL, we need to use raw ALTER TABLE to modify ENUM values
        // Update kyc_status ENUM
        DB::statement("ALTER TABLE bridge_integrations MODIFY COLUMN kyc_status ENUM(
            'not_started',
            'incomplete',
            'under_review',
            'awaiting_questionnaire',
            'awaiting_ubo',
            'approved',
            'rejected',
            'paused',
            'offboarded'
        ) DEFAULT 'not_started'");

        // Update kyb_status ENUM
        DB::statement("ALTER TABLE bridge_integrations MODIFY COLUMN kyb_status ENUM(
            'not_started',
            'incomplete',
            'under_review',
            'awaiting_questionnaire',
            'awaiting_ubo',
            'approved',
            'rejected',
            'paused',
            'offboarded'
        ) DEFAULT 'not_started'");

        // Update tos_status ENUM (Bridge ToS uses: pending, approved)
        DB::statement("ALTER TABLE bridge_integrations MODIFY COLUMN tos_status ENUM(
            'pending',
            'approved'
        ) DEFAULT 'pending'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to original ENUM values
        // First, map Bridge statuses back to legacy values
        DB::statement("UPDATE bridge_integrations SET kyc_status = 'pending' WHERE kyc_status IN ('not_started', 'incomplete', 'under_review', 'awaiting_questionnaire', 'awaiting_ubo')");
        DB::statement("UPDATE bridge_integrations SET kyb_status = 'pending' WHERE kyb_status IN ('not_started', 'incomplete', 'under_review', 'awaiting_questionnaire', 'awaiting_ubo')");
        DB::statement("UPDATE bridge_integrations SET tos_status = 'accepted' WHERE tos_status = 'approved'");

        // Revert kyc_status ENUM
        DB::statement("ALTER TABLE bridge_integrations MODIFY COLUMN kyc_status ENUM(
            'pending',
            'approved',
            'rejected',
            'not_started'
        ) DEFAULT 'not_started'");

        // Revert kyb_status ENUM
        DB::statement("ALTER TABLE bridge_integrations MODIFY COLUMN kyb_status ENUM(
            'pending',
            'approved',
            'rejected',
            'not_started'
        ) DEFAULT 'not_started'");

        // Revert tos_status ENUM
        DB::statement("ALTER TABLE bridge_integrations MODIFY COLUMN tos_status ENUM(
            'pending',
            'accepted',
            'rejected'
        ) DEFAULT 'pending'");
    }
};
