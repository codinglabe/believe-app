<?php

namespace Tests\Unit\Services;

use App\Enums\PushNotificationLogStatus;
use App\Enums\PushNotificationRecipientStatus;
use App\Models\PushNotificationLog;
use App\Models\PushNotificationRecipient;
use App\Services\FirebaseService;
use App\Services\PushNotificationLogger;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Mockery;
use Tests\TestCase;

class PushNotificationLoggerTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('push_notification_recipients');
        Schema::dropIfExists('push_notification_logs');

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
            });

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
        });

        Schema::create('user_push_tokens', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('push_token');
            $table->string('device_type')->default('web');
            $table->boolean('is_active')->default(true);
            $table->string('status')->default('active');
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();
        });
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('push_notification_recipients');
        Schema::dropIfExists('push_notification_logs');
        Schema::dropIfExists('user_push_tokens');
        Mockery::close();
        parent::tearDown();
    }

    public function test_log_created_starts_in_draft_status(): void
    {
        $logger = app(PushNotificationLogger::class);

        $log = $logger->logCreated([
            'module_name' => 'events',
            'notification_title' => 'New Event',
            'notification_body' => 'Details inside',
        ]);

        $this->assertSame(PushNotificationLogStatus::Draft, $log->status);
        $this->assertSame('events', $log->module_name);
    }

    public function test_log_opened_increments_parent_opened_count(): void
    {
        $log = PushNotificationLog::query()->create([
            'module_name' => 'system',
            'notification_title' => 'Hello',
            'audience_type' => 'user',
            'status' => PushNotificationLogStatus::Sent,
            'recipient_count' => 1,
            'delivered_count' => 1,
        ]);

        $recipient = PushNotificationRecipient::query()->create([
            'push_notification_log_id' => $log->id,
            'status' => PushNotificationRecipientStatus::Delivered,
            'delivered_at' => now(),
        ]);

        $logger = app(PushNotificationLogger::class);
        $updated = $logger->logOpened($recipient);

        $this->assertSame(PushNotificationRecipientStatus::Opened, $recipient->fresh()->status);
        $this->assertSame(1, $updated->opened_count);
    }

    public function test_send_log_marks_recipient_delivered_on_success(): void
    {
        $firebase = Mockery::mock(FirebaseService::class);
        $firebase->shouldReceive('sendToDevice')->once()->andReturn([
            'success' => true,
            'error_code' => null,
            'response' => null,
        ]);
        $this->app->instance(FirebaseService::class, $firebase);

        $log = PushNotificationLog::query()->create([
            'module_name' => 'courses',
            'notification_title' => 'Course update',
            'audience_type' => 'users',
            'status' => PushNotificationLogStatus::Draft,
        ]);

        PushNotificationRecipient::query()->create([
            'push_notification_log_id' => $log->id,
            'device_token' => 'token-abc',
            'status' => PushNotificationRecipientStatus::Pending,
        ]);

        $logger = app(PushNotificationLogger::class);
        $result = $logger->sendLog($log, []);

        $this->assertSame(PushNotificationRecipientStatus::Delivered, $result->recipients()->first()->status);
        $this->assertGreaterThanOrEqual(1, $result->delivered_count);
    }
}
