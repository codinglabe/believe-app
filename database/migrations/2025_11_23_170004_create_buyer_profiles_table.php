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
        Schema::create('buyer_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('livestock_user_id')->constrained('livestock_users')->onDelete('cascade');
            $table->string('farm_name');
            $table->text('address');
            $table->text('description')->nullable();
            $table->string('phone');
            $table->string('email')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('zip_code')->nullable();
            $table->string('country')->nullable();
            $table->string('national_id_number')->nullable();
            $table->string('farm_type')->nullable(); // e.g., dairy, meat, breeding
            $table->integer('farm_size_acres')->nullable();
            $table->integer('number_of_animals')->nullable();
            $table->text('specialization')->nullable(); // e.g., goat breeding, sheep farming
            $table->enum('verification_status', ['pending', 'verified', 'rejected'])->default('pending');
            $table->text('rejection_reason')->nullable();
            $table->timestamps();
            
            $table->index('livestock_user_id');
            $table->index('verification_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('buyer_profiles');
    }
};
