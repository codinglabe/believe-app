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
        Schema::create('service_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('gig_id')->constrained('gigs')->onDelete('cascade');
            $table->foreignId('buyer_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('seller_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('package_id')->nullable()->constrained('gig_packages')->onDelete('set null');
            $table->string('order_number')->unique();
            $table->string('package_type')->nullable();
            $table->decimal('amount', 10, 2);
            $table->decimal('platform_fee', 10, 2)->default(0);
            $table->decimal('seller_earnings', 10, 2)->default(0);
            $table->string('currency', 3)->default('USD');
            $table->text('requirements')->nullable();
            $table->text('special_instructions')->nullable();
            $table->enum('status', ['pending', 'in_progress', 'delivered', 'completed', 'cancelled'])->default('pending');
            $table->enum('payment_status', ['pending', 'paid', 'refunded'])->default('pending');
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->json('deliverables')->nullable();
            $table->timestamps();

            $table->index(['buyer_id', 'status']);
            $table->index(['seller_id', 'status']);
            $table->index('gig_id');
            $table->index('order_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('service_orders');
    }
};
