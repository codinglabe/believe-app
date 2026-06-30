<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('believe_point_reserve_settlement_credits')) {
            Schema::create('believe_point_reserve_settlement_credits', function (Blueprint $table) {
            $table->id();
            $table->decimal('amount', 12, 2);
            $table->decimal('allocated_amount', 12, 2)->default(0);
            $table->string('bridge_transfer_id')->nullable();
            $table->string('bridge_activity_id')->nullable();
            $table->string('bridge_wallet_id')->nullable();
            $table->string('bridge_customer_id')->nullable();
            $table->string('bridge_state')->nullable();
            $table->string('source_type')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('credited_at');
            $table->timestamps();

            $table->unique('bridge_transfer_id', 'bp_reserve_credit_transfer_uidx');
            $table->unique('bridge_activity_id', 'bp_reserve_credit_activity_uidx');
            $table->index('credited_at');
            });
        }

        if (! Schema::hasTable('believe_point_reserve_settlement_allocations')) {
            Schema::create('believe_point_reserve_settlement_allocations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('believe_point_reserve_settlement_credit_id');
            $table->unsignedBigInteger('believe_point_purchase_id');
            $table->decimal('amount', 12, 2);
            $table->timestamps();

            $table->foreign('believe_point_reserve_settlement_credit_id', 'bp_rs_alloc_credit_fk')
                ->references('id')
                ->on('believe_point_reserve_settlement_credits')
                ->cascadeOnDelete();
            $table->foreign('believe_point_purchase_id', 'bp_rs_alloc_purchase_fk')
                ->references('id')
                ->on('believe_point_purchases')
                ->cascadeOnDelete();

            $table->unique('believe_point_purchase_id', 'bp_reserve_alloc_purchase_uidx');
            });
        }

        Schema::table('believe_point_purchases', function (Blueprint $table) {
            if (! Schema::hasColumn('believe_point_purchases', 'stripe_funds_available_at')) {
                $table->timestamp('stripe_funds_available_at')->nullable()->after('points_available_at');
            }
            if (! Schema::hasColumn('believe_point_purchases', 'bridge_reserve_confirmed_at')) {
                $table->timestamp('bridge_reserve_confirmed_at')->nullable()->after('stripe_funds_available_at');
            }
            if (! Schema::hasColumn('believe_point_purchases', 'bridge_settlement_reference')) {
                $table->string('bridge_settlement_reference')->nullable()->after('bridge_reserve_confirmed_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('believe_point_purchases', function (Blueprint $table) {
            foreach (['stripe_funds_available_at', 'bridge_reserve_confirmed_at', 'bridge_settlement_reference'] as $col) {
                if (Schema::hasColumn('believe_point_purchases', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        Schema::dropIfExists('believe_point_reserve_settlement_allocations');
        Schema::dropIfExists('believe_point_reserve_settlement_credits');
    }
};
