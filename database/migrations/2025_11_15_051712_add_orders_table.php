<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if(!Schema::hasColumn('orders', 'organization_id')) {
                $table->foreignId('organization_id')->nullable()->constrained()->onDelete('set null');  // Seller organization
            }

            if (!Schema::hasColumn('orders', 'commission_amount')) {
                $table->decimal('commission_amount', 12, 2)->default(0); // Platform commission
            }

            if (!Schema::hasColumn('orders', 'seller_amount')) {
                $table->decimal('seller_amount', 12, 2)->default(0); // Amount for organization/seller
            }


            // $table->enum('status', ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'])->default('pending');
            $table->enum('payment_status', ['unpaid', 'paid', 'failed', 'refunded'])->default('unpaid');
            $table->string('stripe_payment_intent_id')->nullable();
            $table->string('printify_order_id')->nullable();
            $table->enum('printify_status', ['draft', 'confirmed', 'production', 'shipped', 'delivered', 'cancelled'])->nullable();
            $table->string('tracking_number')->nullable();
            $table->string('tracking_url')->nullable();
            $table->text('notes')->nullable();

            $table->index('status');
            $table->index('payment_status');
            $table->index('stripe_payment_intent_id');
            $table->index('printify_order_id');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // $table->dropIndex(['status']);
            $table->dropColumn([
                'organization_id',
                'commission_amount',
                'seller_amount',
                // 'status',
                'payment_status',
                'stripe_payment_intent_id',
                'printify_order_id',
                'printify_status',
                'tracking_number',
                'tracking_url',
                'notes',
            ]);
        });
    }
};
