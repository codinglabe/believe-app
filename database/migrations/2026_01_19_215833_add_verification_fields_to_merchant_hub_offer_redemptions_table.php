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
        Schema::table('merchant_hub_offer_redemptions', function (Blueprint $table) {
            if (!Schema::hasColumn('merchant_hub_offer_redemptions', 'used_at')) {
                $table->timestamp('used_at')->nullable()->after('status');
            }
            if (!Schema::hasColumn('merchant_hub_offer_redemptions', 'verified_by_merchant_id')) {
                $table->foreignId('verified_by_merchant_id')->nullable()->after('used_at')->constrained('merchants')->onDelete('set null');
            }
            if (!Schema::hasColumn('merchant_hub_offer_redemptions', 'eligible_item_id')) {
                $table->foreignId('eligible_item_id')->nullable()->after('verified_by_merchant_id')->constrained('merchant_hub_eligible_items')->onDelete('set null');
            }
            if (!Schema::hasColumn('merchant_hub_offer_redemptions', 'discount_amount')) {
                $table->decimal('discount_amount', 10, 2)->nullable()->after('eligible_item_id')->comment('Actual discount amount applied');
            }
        });

        // Add indexes separately if columns exist
        if (Schema::hasColumn('merchant_hub_offer_redemptions', 'used_at')) {
            try {
                Schema::table('merchant_hub_offer_redemptions', function (Blueprint $table) {
                    $table->index('used_at');
                });
            } catch (\Exception $e) {
                // Index might already exist, ignore
            }
        }
        
        if (Schema::hasColumn('merchant_hub_offer_redemptions', 'verified_by_merchant_id')) {
            try {
                Schema::table('merchant_hub_offer_redemptions', function (Blueprint $table) {
                    $table->index('verified_by_merchant_id');
                });
            } catch (\Exception $e) {
                // Index might already exist, ignore
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('merchant_hub_offer_redemptions', function (Blueprint $table) {
            $table->dropForeign(['verified_by_merchant_id']);
            $table->dropForeign(['eligible_item_id']);
            $table->dropIndex(['used_at']);
            $table->dropIndex(['verified_by_merchant_id']);
            $table->dropColumn(['used_at', 'verified_by_merchant_id', 'eligible_item_id', 'discount_amount']);
        });
    }
};
