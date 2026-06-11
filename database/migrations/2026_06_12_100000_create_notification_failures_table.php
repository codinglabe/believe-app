<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_failures', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('notification_id');
            $table->unsignedBigInteger('push_notification_recipient_id')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('device_token', 512)->nullable();
            $table->string('firebase_error_code', 128)->nullable();
            $table->string('failure_reason', 512)->nullable();
            $table->json('firebase_response')->nullable();
            $table->unsignedTinyInteger('attempt_count')->default(1);
            $table->timestamp('failed_at');
            $table->timestamps();

            $table->foreign('notification_id')
                ->references('id')
                ->on('push_notification_logs')
                ->cascadeOnDelete();

            $table->foreign('push_notification_recipient_id')
                ->references('id')
                ->on('push_notification_recipients')
                ->nullOnDelete();

            $table->index(['notification_id', 'failed_at']);
            $table->index(['user_id', 'failed_at']);
            $table->index(['device_token', 'failed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_failures');
    }
};
