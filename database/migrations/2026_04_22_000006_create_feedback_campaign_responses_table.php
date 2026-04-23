<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('feedback_campaign_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supporter_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('campaign_id')->constrained('feedback_campaigns')->onDelete('cascade');
            $table->bigInteger('reward_brp')->default(0);
            $table->enum('status', ['pending', 'completed', 'rejected'])->default('pending');
            $table->timestamps();

            $table->unique(['supporter_id', 'campaign_id']); // one response per user
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feedback_campaign_responses');
    }
};
