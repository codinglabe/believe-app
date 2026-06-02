<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('push_notification_logs') && ! Schema::hasColumn('push_notification_logs', 'module_name')) {
            Schema::rename('push_notification_logs', 'push_notification_delivery_logs_legacy');
        } elseif (
            Schema::hasTable('push_notification_logs')
            && Schema::hasColumn('push_notification_logs', 'module_name')
            && ! Schema::hasTable('push_notification_recipients')
        ) {
            Schema::drop('push_notification_logs');
        } elseif (
            ! Schema::hasTable('push_notification_logs')
            && Schema::hasTable('push_notification_delivery_logs_legacy')
        ) {
            // Renamed on a prior failed run — continue.
        } elseif (Schema::hasTable('push_notification_logs') && ! Schema::hasTable('push_notification_delivery_logs_legacy')) {
            Schema::rename('push_notification_logs', 'push_notification_delivery_logs_legacy');
        }

        if (! Schema::hasTable('push_notification_logs')) {
            Schema::create('push_notification_logs', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('organization_id')->nullable();
                $table->unsignedBigInteger('user_id')->nullable();
                $table->string('module_name', 64);
                $table->unsignedBigInteger('module_record_id')->nullable();
                $table->string('notification_title');
                $table->text('notification_body')->nullable();
                $table->string('audience_type', 64)->default('users');
                $table->unsignedInteger('recipient_count')->default(0);
                $table->unsignedInteger('sent_count')->default(0);
                $table->unsignedInteger('delivered_count')->default(0);
                $table->unsignedInteger('opened_count')->default(0);
                $table->unsignedInteger('failed_count')->default(0);
                $table->string('status', 32)->default('draft');
                $table->string('deep_link', 512)->nullable();
                $table->timestamp('scheduled_at')->nullable();
                $table->timestamp('sent_at')->nullable();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();

                $table->index('organization_id');
                $table->index('module_name');
                $table->index('status');
                $table->index('created_at');
            });

            Schema::table('push_notification_logs', function (Blueprint $table) {
                $table->foreign('organization_id', 'pnl_organization_id_foreign')
                    ->references('id')->on('organizations')->nullOnDelete();
                $table->foreign('user_id', 'pnl_user_id_foreign')
                    ->references('id')->on('users')->nullOnDelete();
                $table->foreign('created_by', 'pnl_created_by_foreign')
                    ->references('id')->on('users')->nullOnDelete();
            });
        }

        if (! Schema::hasTable('push_notification_recipients')) {
            Schema::create('push_notification_recipients', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('push_notification_log_id');
                $table->unsignedBigInteger('recipient_user_id')->nullable();
                $table->string('device_token', 512)->nullable();
                $table->string('status', 32)->default('pending');
                $table->timestamp('delivered_at')->nullable();
                $table->timestamp('opened_at')->nullable();
                $table->timestamp('failed_at')->nullable();
                $table->string('failure_reason', 512)->nullable();
                $table->timestamps();

                $table->foreign('push_notification_log_id', 'pnr_log_id_foreign')
                    ->references('id')->on('push_notification_logs')->cascadeOnDelete();
                $table->foreign('recipient_user_id', 'pnr_recipient_user_id_foreign')
                    ->references('id')->on('users')->nullOnDelete();

                $table->index('push_notification_log_id');
                $table->index('recipient_user_id');
                $table->index('status');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('push_notification_recipients');
        Schema::dropIfExists('push_notification_logs');

        if (Schema::hasTable('push_notification_delivery_logs_legacy')) {
            Schema::rename('push_notification_delivery_logs_legacy', 'push_notification_logs');
        }
    }
};
