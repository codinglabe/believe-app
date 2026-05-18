<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kiosk_user_context', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('category_slug', 64);
            $table->boolean('provider_linked')->default(false);
            $table->timestamp('last_accessed_at')->nullable();
            $table->string('next_suggested_action', 255)->nullable();
            $table->string('status', 100)->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'category_slug']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kiosk_user_context');
    }
};
