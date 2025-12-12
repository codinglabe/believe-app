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
        Schema::create('bridge_integrations', function (Blueprint $table) {
            $table->id();
            $table->morphs('integratable'); // user_id, integratable_type (User or Organization)
            $table->string('bridge_customer_id')->unique()->nullable();
            $table->string('bridge_wallet_id')->unique()->nullable();
            $table->string('kyc_link_id')->nullable();
            $table->string('kyb_link_id')->nullable();
            $table->enum('kyc_status', ['pending', 'approved', 'rejected', 'not_started'])->default('not_started');
            $table->enum('kyb_status', ['pending', 'approved', 'rejected', 'not_started'])->default('not_started');
            $table->text('kyc_link_url')->nullable();
            $table->text('kyb_link_url')->nullable();
            $table->json('bridge_metadata')->nullable();
            $table->timestamps();
            
            $table->index('bridge_customer_id');
            $table->index('bridge_wallet_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bridge_integrations');
    }
};
