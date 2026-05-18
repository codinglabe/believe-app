<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('care_alliances', function (Blueprint $table) {
            $table->string('allocation_method', 40)->nullable()->after('management_fee_bps');
            $table->string('distribution_frequency', 24)->nullable()->default('instant')->after('allocation_method');
            $table->unsignedInteger('min_payout_cents')->default(5000)->after('distribution_frequency');
        });
    }

    public function down(): void
    {
        Schema::table('care_alliances', function (Blueprint $table) {
            $table->dropColumn(['allocation_method', 'distribution_frequency', 'min_payout_cents']);
        });
    }
};
