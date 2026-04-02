<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('believe_points_auto_replenish_enabled')->default(false)->after('believe_points');
            $table->decimal('believe_points_auto_replenish_threshold', 12, 2)->nullable()->after('believe_points_auto_replenish_enabled');
            $table->decimal('believe_points_auto_replenish_amount', 12, 2)->nullable()->after('believe_points_auto_replenish_threshold');
            $table->string('believe_points_auto_replenish_pm_id')->nullable()->after('believe_points_auto_replenish_amount');
            $table->string('believe_points_auto_replenish_card_brand', 32)->nullable()->after('believe_points_auto_replenish_pm_id');
            $table->string('believe_points_auto_replenish_card_last4', 4)->nullable()->after('believe_points_auto_replenish_card_brand');
            $table->timestamp('believe_points_auto_replenish_agreed_at')->nullable()->after('believe_points_auto_replenish_card_last4');
            $table->timestamp('believe_points_last_auto_replenish_at')->nullable()->after('believe_points_auto_replenish_agreed_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'believe_points_auto_replenish_enabled',
                'believe_points_auto_replenish_threshold',
                'believe_points_auto_replenish_amount',
                'believe_points_auto_replenish_pm_id',
                'believe_points_auto_replenish_card_brand',
                'believe_points_auto_replenish_card_last4',
                'believe_points_auto_replenish_agreed_at',
                'believe_points_last_auto_replenish_at',
            ]);
        });
    }
};
