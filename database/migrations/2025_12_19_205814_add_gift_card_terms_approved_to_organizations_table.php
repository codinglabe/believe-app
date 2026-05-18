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
        Schema::table('organizations', function (Blueprint $table) {
            $table->boolean('gift_card_terms_approved')->default(false)->after('is_compliance_locked');
            $table->timestamp('gift_card_terms_approved_at')->nullable()->after('gift_card_terms_approved');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn([
                'gift_card_terms_approved',
                'gift_card_terms_approved_at',
            ]);
        });
    }
};
