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
        Schema::table('plans', function (Blueprint $table) {
            if (!Schema::hasColumn('plans', 'is_popular')) {
                $table->boolean('is_popular')->default(false)->after('is_active');
            }
        });

        Schema::table('plans', function (Blueprint $table) {
            if (!Schema::hasColumn('plans', 'emails_included')) {
                $table->integer('emails_included')->default(0)->after('is_popular');
            }
        });

        Schema::table('plans', function (Blueprint $table) {
            if (!Schema::hasColumn('plans', 'ai_tokens')) {
                $table->string('ai_tokens')->nullable()->after('emails_included');
            }
        });

        Schema::table('plans', function (Blueprint $table) {
            if (!Schema::hasColumn('plans', 'ein_setup_fee')) {
                $table->decimal('ein_setup_fee', 10, 2)->default(10.00)->after('ai_tokens');
            }
        });

        Schema::table('plans', function (Blueprint $table) {
            if (!Schema::hasColumn('plans', 'support_level')) {
                $table->string('support_level')->nullable()->after('ein_setup_fee');
            }
        });

        Schema::table('plans', function (Blueprint $table) {
            if (!Schema::hasColumn('plans', 'sort_order')) {
                $table->integer('sort_order')->default(0)->after('support_level');
            }
        });

        // Drop unique constraints only if they exist
        $indexes = DB::select("
            SELECT INDEX_NAME
            FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'plans'
            AND NON_UNIQUE = 0
        ");

        $indexNames = array_map(function($index) {
            return $index->INDEX_NAME;
        }, $indexes);

        Schema::table('plans', function (Blueprint $table) use ($indexNames) {
            // Drop unique constraint on frequency if it exists
            if (in_array('plans_frequency_unique', $indexNames) || in_array('frequency', $indexNames)) {
                try {
                    $table->dropUnique(['frequency']);
                } catch (\Exception $e) {
                    // Index might have different name, try common variations
                    try {
                        $table->dropUnique('plans_frequency_unique');
                    } catch (\Exception $e2) {
                        // Ignore if doesn't exist
                    }
                }
            }

            // Drop unique constraint on stripe_price_id if it exists
            if (in_array('plans_stripe_price_id_unique', $indexNames) || in_array('stripe_price_id', $indexNames)) {
                try {
                    $table->dropUnique(['stripe_price_id']);
                } catch (\Exception $e) {
                    try {
                        $table->dropUnique('plans_stripe_price_id_unique');
                    } catch (\Exception $e2) {
                        // Ignore if doesn't exist
                    }
                }
            }

            // Drop unique constraint on stripe_product_id if it exists
            if (in_array('plans_stripe_product_id_unique', $indexNames) || in_array('stripe_product_id', $indexNames)) {
                try {
                    $table->dropUnique(['stripe_product_id']);
                } catch (\Exception $e) {
                    try {
                        $table->dropUnique('plans_stripe_product_id_unique');
                    } catch (\Exception $e2) {
                        // Ignore if doesn't exist
                    }
                }
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn(['is_popular', 'emails_included', 'ai_tokens', 'ein_setup_fee', 'support_level', 'sort_order']);
            $table->unique('frequency');
            $table->unique('stripe_price_id');
            $table->unique('stripe_product_id');
        });
    }
};
