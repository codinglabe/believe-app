<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->string('preferred_payout_method')->nullable()->after('stripe_connect_payouts_enabled');
            $table->string('paypal_payout_email')->nullable()->after('preferred_payout_method');
            $table->boolean('paypal_payouts_enabled')->default(false)->after('paypal_payout_email');
            $table->timestamp('paypal_payout_connected_at')->nullable()->after('paypal_payouts_enabled');
        });

        Schema::table('merchants', function (Blueprint $table) {
            $table->string('preferred_payout_method')->nullable()->after('status');
            $table->string('stripe_connect_account_id')->nullable()->after('preferred_payout_method');
            $table->boolean('stripe_connect_charges_enabled')->default(false)->after('stripe_connect_account_id');
            $table->boolean('stripe_connect_payouts_enabled')->default(false)->after('stripe_connect_charges_enabled');
            $table->string('paypal_payout_email')->nullable()->after('stripe_connect_payouts_enabled');
            $table->boolean('paypal_payouts_enabled')->default(false)->after('paypal_payout_email');
            $table->timestamp('paypal_payout_connected_at')->nullable()->after('paypal_payouts_enabled');
        });

        Schema::create('entity_payouts', function (Blueprint $table) {
            $table->id();
            $table->string('payable_type');
            $table->unsignedBigInteger('payable_id');
            $table->string('payout_method');
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('USD');
            $table->string('status')->default('pending');
            $table->string('reference_type')->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->string('module')->nullable();
            $table->string('external_batch_id')->nullable();
            $table->string('external_item_id')->nullable();
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->index(['payable_type', 'payable_id']);
            $table->index(['reference_type', 'reference_id']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entity_payouts');

        Schema::table('merchants', function (Blueprint $table) {
            $table->dropColumn([
                'preferred_payout_method',
                'stripe_connect_account_id',
                'stripe_connect_charges_enabled',
                'stripe_connect_payouts_enabled',
                'paypal_payout_email',
                'paypal_payouts_enabled',
                'paypal_payout_connected_at',
            ]);
        });

        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn([
                'preferred_payout_method',
                'paypal_payout_email',
                'paypal_payouts_enabled',
                'paypal_payout_connected_at',
            ]);
        });
    }
};
