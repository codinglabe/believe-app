<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_media_studio_subscription_invoice_grants', function (Blueprint $table) {
            $table->string('stripe_invoice_id', 255)->primary();
            $table->unsignedBigInteger('user_id');
            $table->decimal('credits_granted', 12, 2);
            $table->timestamps();

            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_media_studio_subscription_invoice_grants');
    }
};
