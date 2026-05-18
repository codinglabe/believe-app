<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('feedback_campaign_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained('feedback_campaigns')->onDelete('cascade');
            $table->text('question_text');
            $table->enum('question_type', ['yes_no', 'true_false', 'multiple_choice']);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feedback_campaign_questions');
    }
};
