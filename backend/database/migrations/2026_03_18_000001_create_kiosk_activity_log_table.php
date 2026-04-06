<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kiosk_activity_log', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('category_slug', 64);
            $table->string('action_key', 64); // e.g. opened_dashboard, launched_provider, set_reminder, confirmed_completion
            $table->string('metadata', 500)->nullable(); // optional JSON or text
            $table->timestamps();

            $table->index(['user_id', 'category_slug']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kiosk_activity_log');
    }
};
