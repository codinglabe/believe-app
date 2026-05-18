<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('feedback_campaigns', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('merchant_id')->constrained('merchants')->onDelete('cascade');
            $table->string('title');
            $table->enum('type', ['quick_vote', 'short_feedback', 'standard_survey', 'deep_feedback']);
            $table->bigInteger('reward_per_response_brp');
            $table->bigInteger('total_budget_brp');
            $table->bigInteger('reserved_budget_brp')->default(0);
            $table->bigInteger('spent_budget_brp')->default(0);
            $table->bigInteger('remaining_budget_brp')->default(0);
            $table->unsignedInteger('max_responses')->default(0);
            $table->unsignedInteger('responses_count')->default(0);
            $table->enum('status', ['draft', 'active', 'paused', 'completed', 'cancelled'])->default('draft');
            $table->timestamps();

            $table->index(['merchant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feedback_campaigns');
    }
};
