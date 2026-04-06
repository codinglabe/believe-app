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
        Schema::create('irs_board_members', function (Blueprint $table) {
            $table->id();
            $table->string('ein', 20)->index(); // Organization EIN
            $table->string('name'); // Board member name
            $table->string('position')->nullable(); // Position/Title (e.g., President, Treasurer, Director)
            $table->enum('status', ['active', 'inactive', 'expired', 'removed'])->default('active');
            $table->string('tax_year', 4)->nullable()->index(); // Tax year from IRS filing
            $table->date('appointed_date')->nullable(); // When they were appointed
            $table->date('term_end_date')->nullable(); // When their term ends
            $table->date('removed_date')->nullable(); // When they were removed (if applicable)
            $table->text('notes')->nullable(); // Additional notes
            $table->json('irs_data')->nullable(); // Store raw IRS XML data for this member
            $table->timestamps();
            $table->softDeletes(); // Soft delete to maintain history

            // Indexes for better query performance
            $table->index(['ein', 'tax_year']);
            $table->index(['ein', 'status']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('irs_board_members');
    }
};
