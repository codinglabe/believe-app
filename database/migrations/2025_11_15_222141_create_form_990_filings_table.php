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
        if (Schema::hasTable('form_990_filings')) {
            return;
        }

        Schema::create('form_990_filings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('tax_year', 4); // e.g., "2023"
            $table->string('form_type', 20)->nullable(); // 990, 990-EZ, 990-PF, etc.
            $table->date('filing_date')->nullable();
            $table->boolean('is_filed')->default(false);
            $table->date('due_date')->nullable();
            $table->date('extended_due_date')->nullable();
            $table->boolean('is_extended')->default(false);
            $table->timestamp('last_checked_at')->nullable();
            $table->json('irs_data')->nullable(); // Store raw IRS XML/JSON data
            $table->json('meta')->nullable(); // Additional metadata
            $table->timestamps();
            
            // Unique constraint: one filing record per organization per tax year
            $table->unique(['organization_id', 'tax_year']);
            $table->index(['organization_id', 'is_filed']);
            $table->index('tax_year');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('form_990_filings');
    }
};
