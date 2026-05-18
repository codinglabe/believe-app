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
        Schema::create('reward_point_ledgers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('source')->comment('Source of the transaction: nonprofit_assessment, merchant_reward_redemption, etc.');
            $table->enum('type', ['credit', 'debit'])->comment('Type of transaction: credit (points added) or debit (points deducted)');
            $table->unsignedBigInteger('reference_id')->nullable()->comment('Reference to the source record (e.g., assessment_id, redemption_id)');
            $table->integer('points')->comment('Points amount (positive for credit, negative for debit, or absolute value with type)');
            $table->text('description')->nullable()->comment('Description of the transaction');
            $table->json('metadata')->nullable()->comment('Additional metadata (base_points, multiplier, grade, etc.)');
            $table->timestamps();

            // Indexes for performance
            $table->index('user_id');
            $table->index(['source', 'reference_id']);
            $table->index('type');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reward_point_ledgers');
    }
};
