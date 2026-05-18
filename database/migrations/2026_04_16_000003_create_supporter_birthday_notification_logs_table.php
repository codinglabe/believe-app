<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('supporter_birthday_notification_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('follower_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('celebrant_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedSmallInteger('year');
            $table->timestamps();

            $table->unique(['follower_id', 'celebrant_id', 'year'], 'supporter_bday_notify_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supporter_birthday_notification_logs');
    }
};
