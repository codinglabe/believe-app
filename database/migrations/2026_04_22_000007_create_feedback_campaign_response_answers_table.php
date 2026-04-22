<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('feedback_campaign_response_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('response_id')->constrained('feedback_campaign_responses')->onDelete('cascade');
            $table->foreignId('question_id')->constrained('feedback_campaign_questions')->onDelete('cascade');
            $table->string('answer_text');
            $table->foreignId('option_id')->nullable()->constrained('feedback_campaign_question_options')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feedback_campaign_response_answers');
    }
};
