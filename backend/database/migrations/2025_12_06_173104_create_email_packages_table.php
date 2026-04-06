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
        Schema::create('email_packages', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // e.g., "Micro Pack", "Value Pack"
            $table->string('description')->nullable(); // e.g., "+100 Emails"
            $table->integer('emails_count'); // Number of emails in the package
            $table->decimal('price', 10, 2); // Price in USD
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('email_packages');
    }
};
