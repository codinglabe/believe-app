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
        Schema::create('livestock_payouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('livestock_user_id')->constrained('livestock_users')->onDelete('cascade');
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('USD');
            $table->enum('payout_type', ['animal_sale', 'mating_fee', 'refund'])->default('animal_sale');
            $table->string('reference_model')->nullable(); // e.g., 'LivestockListing', 'MatingFee'
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->enum('status', ['pending', 'paid', 'failed', 'cancelled'])->default('pending');
            $table->text('failure_reason')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->index('livestock_user_id');
            $table->index('status');
            $table->index('payout_type');
            $table->index(['reference_model', 'reference_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('livestock_payouts');
    }
};
