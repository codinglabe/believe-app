<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * BMF-derived governance fields: all we need from the BMF file for Governance.
     */
    public function up(): void
    {
        Schema::create('nonprofit_compliance', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('ein', 20)->nullable()->index();
            $table->string('organization_name')->nullable();
            $table->string('irs_status', 100)->nullable(); // Public Charity Status e.g. "Exempt operating foundation"
            $table->string('exempt_since', 50)->nullable(); // Rule Date (Exempt Since) e.g. "Feb 1970"
            $table->string('ntee_category', 200)->nullable(); // NTEE Code + description e.g. "B20 - Elementary & Secondary Schools"
            $table->string('fiscal_year_end', 50)->nullable(); // Tax Year End e.g. "Dec 2023"
            $table->string('return_type', 32)->nullable(); // Last Filed Form 990 Type e.g. "990"
            $table->string('last_return_year', 10)->nullable(); // Year of last filed return
            $table->date('next_due_date')->nullable();
            $table->string('filing_status', 32)->nullable(); // Status Code e.g. "Active"
            $table->timestamps();

            $table->unique('organization_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nonprofit_compliance');
    }
};
