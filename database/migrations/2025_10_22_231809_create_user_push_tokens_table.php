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
        Schema::create('user_push_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained("users")->onDelete('cascade');
            $table->string('push_token');
            $table->string('device_id'); // Unique device identifier
            $table->string('device_type')->default('web'); // web, android, ios
            $table->string('device_name')->nullable();
            $table->string('browser')->nullable();
            $table->string('platform')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_used_at');
            $table->timestamps();

            $table->unique(['user_id', 'device_id']);
            $table->index('push_token');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_push_tokens');
    }
};
