<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('fractional_offerings')) {
            return;
        }

        Schema::create('fractional_offerings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained('fractional_assets')->cascadeOnDelete();
            $table->string('title');
            $table->text('summary')->nullable();
            $table->unsignedBigInteger('total_shares'); // total issuable shares
            $table->unsignedBigInteger('available_shares')->index(); // remaining shares
            $table->decimal('price_per_share', 12, 2); // fiat for now (Stripe)
            $table->string('currency', 3)->default('USD');
            $table->enum('status', ['draft', 'live', 'sold_out', 'closed'])->default('draft')->index();
            $table->timestamp('go_live_at')->nullable();
            $table->timestamp('close_at')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fractional_offerings');
    }
};


