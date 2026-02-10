<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Stores how org claim was verified: "IRS 990 + self attestation" and optional metadata.
     */
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->string('verification_source', 100)->nullable()->after('registration_status');
            $table->json('claim_verification_metadata')->nullable()->after('verification_source');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn(['verification_source', 'claim_verification_metadata']);
        });
    }
};
