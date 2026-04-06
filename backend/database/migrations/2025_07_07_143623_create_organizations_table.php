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
        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained("users")->onDelete('cascade');
            $table->string('ein', 9)->unique();
            $table->string('name');
            $table->string('ico')->nullable();
            $table->string('street');
            $table->string('city');
            $table->string('state');
            $table->string('zip');
            $table->string('classification')->nullable();
            $table->string('ruling')->nullable();
            $table->string('deductibility')->nullable();
            $table->string('organization')->nullable();
            $table->string('status')->default('Active');
            $table->string('tax_period')->nullable();
            $table->string('filing_req')->nullable();
            $table->string('ntee_code')->nullable();

            // Contact Information
            $table->string('email');
            $table->string('phone');
            $table->string('contact_name');
            $table->string('contact_title');

            // Additional Information
            $table->string('website')->nullable();
            $table->text('description');
            $table->text('mission');

            // Registration Status
            $table->enum('registration_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->boolean('has_edited_irs_data')->default(false);
            $table->json('original_irs_data')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('organizations');
    }
};
