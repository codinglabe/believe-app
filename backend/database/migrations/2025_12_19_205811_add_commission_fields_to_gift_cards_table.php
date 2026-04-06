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
        Schema::table('gift_cards', function (Blueprint $table) {
            $table->decimal('commission_percentage', 5, 2)->nullable()->after('amount')->comment('Commission percentage from Phaze API');
            $table->decimal('total_commission', 12, 2)->nullable()->after('commission_percentage')->comment('Total commission amount from Phaze');
            $table->decimal('platform_commission', 12, 2)->nullable()->after('total_commission')->comment('Platform commission (8% of total commission)');
            $table->decimal('nonprofit_commission', 12, 2)->nullable()->after('platform_commission')->comment('Nonprofit commission (remaining after platform takes 8%)');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('gift_cards', function (Blueprint $table) {
            $table->dropColumn([
                'commission_percentage',
                'total_commission',
                'platform_commission',
                'nonprofit_commission',
            ]);
        });
    }
};
