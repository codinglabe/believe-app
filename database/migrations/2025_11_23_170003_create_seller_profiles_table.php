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
        if (!Schema::hasTable('seller_profiles')) {
            Schema::create('seller_profiles', function (Blueprint $table) {
                $table->id();
                $table->foreignId('livestock_user_id')->constrained('livestock_users')->onDelete('cascade');
                $table->string('farm_name');
                $table->text('address');
                $table->string('phone');
                $table->string('national_id_number')->nullable();
                $table->enum('payee_type', ['individual', 'business', 'bank'])->default('individual');
                $table->json('payee_details')->nullable(); // Store payment info as JSON
                $table->enum('verification_status', ['pending', 'verified', 'rejected'])->default('pending');
                $table->text('rejection_reason')->nullable();
                $table->timestamps();
                
                $table->index('livestock_user_id');
                $table->index('verification_status');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('seller_profiles');
    }
};
