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
        if (Schema::hasTable('mating_fees')) {
            return;
        }

        Schema::create('mating_fees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('male_id')->constrained('livestock_animals')->onDelete('restrict');
            $table->foreignId('service_provider_seller_id')->constrained('users')->onDelete('restrict');
            $table->foreignId('requesting_seller_id')->constrained('users')->onDelete('restrict');
            $table->foreignId('breeding_event_id')->nullable()->constrained('breeding_events')->onDelete('set null');
            $table->decimal('fee_amount', 10, 2);
            $table->string('currency', 3)->default('USD');
            $table->enum('status', ['pending', 'paid', 'cancelled', 'refunded'])->default('pending');
            $table->timestamp('paid_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->index('male_id');
            $table->index('service_provider_seller_id');
            $table->index('requesting_seller_id');
            $table->index('status');
            $table->index('breeding_event_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mating_fees');
    }
};
