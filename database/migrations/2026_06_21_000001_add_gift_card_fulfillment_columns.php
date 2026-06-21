<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('gift_cards', function (Blueprint $table) {
            $table->timestamp('requested_at')->nullable()->after('purchased_at');
            $table->timestamp('scheduled_fulfillment_at')->nullable()->after('requested_at');
            $table->timestamp('fulfilled_at')->nullable()->after('scheduled_fulfillment_at');
            $table->timestamp('fulfillment_locked_at')->nullable()->after('fulfilled_at');
            $table->timestamp('last_fulfillment_attempt_at')->nullable()->after('fulfillment_locked_at');
            $table->unsignedSmallInteger('fulfillment_attempt_count')->default(0)->after('last_fulfillment_attempt_at');
            $table->text('failure_reason')->nullable()->after('fulfillment_attempt_count');

            $table->index(['status', 'scheduled_fulfillment_at'], 'gift_cards_status_scheduled_fulfillment_idx');
        });
    }

    public function down(): void
    {
        Schema::table('gift_cards', function (Blueprint $table) {
            $table->dropIndex('gift_cards_status_scheduled_fulfillment_idx');
            $table->dropColumn([
                'requested_at',
                'scheduled_fulfillment_at',
                'fulfilled_at',
                'fulfillment_locked_at',
                'last_fulfillment_attempt_at',
                'fulfillment_attempt_count',
                'failure_reason',
            ]);
        });
    }
};
