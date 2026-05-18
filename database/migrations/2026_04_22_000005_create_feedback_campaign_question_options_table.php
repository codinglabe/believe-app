<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('feedback_campaign_question_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('question_id')->constrained('feedback_campaign_questions')->onDelete('cascade');
            $table->string('option_text');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feedback_campaign_question_options');
    }
};
