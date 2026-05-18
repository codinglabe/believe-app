<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fundme_donations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fundme_campaign_id')->constrained('fundme_campaigns')->onDelete('cascade');
            $table->foreignId('organization_id')->constrained('organizations')->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->unsignedBigInteger('amount'); // in cents
            $table->string('donor_name')->nullable();
            $table->string('donor_email');
            $table->boolean('anonymous')->default(false);
            $table->enum('status', ['pending', 'succeeded', 'failed', 'refunded'])->default('pending');
            $table->string('payment_reference')->nullable();
            $table->string('receipt_number')->nullable()->unique();
            $table->timestamps();
            $table->index(['fundme_campaign_id', 'status']);
            $table->index('organization_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fundme_donations');
    }
};
