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
        Schema::table('plans', function (Blueprint $table) {
            $table->boolean('is_popular')->default(false)->after('is_active');
            $table->integer('emails_included')->default(0)->after('is_popular');
            $table->string('ai_tokens')->nullable()->after('emails_included');
            $table->decimal('ein_setup_fee', 10, 2)->default(10.00)->after('ai_tokens');
            $table->string('support_level')->nullable()->after('ein_setup_fee');
            $table->integer('sort_order')->default(0)->after('support_level');
            $table->dropUnique(['frequency']); // Remove unique constraint on frequency
            $table->dropUnique(['stripe_price_id']); // Make optional
            $table->dropUnique(['stripe_product_id']); // Make optional
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
