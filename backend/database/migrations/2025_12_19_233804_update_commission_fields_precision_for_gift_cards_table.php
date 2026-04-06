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
     * Updates commission fields to support very small decimal values (e.g., 0.0048, 0.0004)
     * Changes from decimal(12,2) to decimal(18,8) to support up to 8 decimal places
     */
    public function up(): void
    {
        Schema::table('gift_cards', function (Blueprint $table) {
            // Update commission fields to support more decimal precision
            // decimal(18, 8) allows values up to 9999999999.99999999 with 8 decimal places
            DB::statement('ALTER TABLE gift_cards MODIFY commission_percentage DECIMAL(10, 6) NULL COMMENT "Commission percentage from Phaze API"');
            DB::statement('ALTER TABLE gift_cards MODIFY total_commission DECIMAL(18, 8) NULL COMMENT "Total commission amount from Phaze"');
            DB::statement('ALTER TABLE gift_cards MODIFY platform_commission DECIMAL(18, 8) NULL COMMENT "Platform commission (8% of total commission)"');
            DB::statement('ALTER TABLE gift_cards MODIFY nonprofit_commission DECIMAL(18, 8) NULL COMMENT "Nonprofit commission (remaining after platform takes 8%)"');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('gift_cards', function (Blueprint $table) {
            // Revert back to original precision
            DB::statement('ALTER TABLE gift_cards MODIFY commission_percentage DECIMAL(5, 2) NULL COMMENT "Commission percentage from Phaze API"');
            DB::statement('ALTER TABLE gift_cards MODIFY total_commission DECIMAL(12, 2) NULL COMMENT "Total commission amount from Phaze"');
            DB::statement('ALTER TABLE gift_cards MODIFY platform_commission DECIMAL(12, 2) NULL COMMENT "Platform commission (8% of total commission)"');
            DB::statement('ALTER TABLE gift_cards MODIFY nonprofit_commission DECIMAL(12, 2) NULL COMMENT "Nonprofit commission (remaining after platform takes 8%)"');
        });
    }
};
