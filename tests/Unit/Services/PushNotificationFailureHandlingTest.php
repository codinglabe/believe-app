<?php

namespace Tests\Unit\Services;

use App\Enums\PushNotificationLogStatus;
use App\Enums\PushNotificationRecipientStatus;
use App\Models\NotificationFailure;
use App\Models\PushNotificationLog;
use App\Models\PushNotificationRecipient;
use App\Models\UserPushToken;
use App\Services\FirebaseService;
use App\Services\PushNotificationLogger;
use App\Services\PushNotifications\FcmErrorClassifier;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Mockery;
use Tests\TestCase;

class PushNotificationFailureHandlingTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('notification_failures');
        Schema::dropIfExists('push_notification_recipients');
        Schema::dropIfExists('push_notification_logs');
        Schema::dropIfExists('user_push_tokens');

        Schema::create('push_notification_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->nullable();
            $table->string('module_name', 64);
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
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });

        Schema::create('push_notification_recipients', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('push_notification_log_id');
            $table->unsignedBigInteger('recipient_user_id')->nullable();
            $table->string('device_token', 512)->nullable();
            $table->string('status', 32)->default('pending');
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->string('failure_reason', 512)->nullable();
            $table->unsignedTinyInteger('attempt_count')->default(0);
            $table->string('firebase_error_code', 128)->nullable();
            $table->timestamps();
        });

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
        });

        Schema::create('user_push_tokens', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('push_token');
            $table->string('device_type')->default('web');
            $table->boolean('is_active')->default(true);
            $table->string('status')->default('active');
            $table->boolean('needs_reregister')->default(false);
            $table->string('last_error')->nullable();
            $table->timestamp('last_error_at')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();
        });
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('notification_failures');
        Schema::dropIfExists('push_notification_recipients');
        Schema::dropIfExists('push_notification_logs');
        Schema::dropIfExists('user_push_tokens');
        Mockery::close();
        parent::tearDown();
    }

    public function test_success_marks_delivered_only(): void
    {
        $this->mockFirebaseOnce(['success' => true, 'error_code' => null, 'response' => null]);

        [$log, $recipient] = $this->createPendingRecipient('token-success', userId: 1);
        UserPushToken::query()->create([
            'user_id' => 1,
            'push_token' => 'token-success',
            'is_active' => true,
            'status' => UserPushToken::STATUS_ACTIVE,
        ]);

        app(PushNotificationLogger::class)->sendLog($log, []);

        $recipient->refresh();
        $this->assertSame(PushNotificationRecipientStatus::Delivered, $recipient->status);
        $this->assertNotNull($recipient->delivered_at);
        $this->assertNull($recipient->failed_at);
        $this->assertSame(0, NotificationFailure::query()->count());
    }

    public function test_invalid_token_marks_inactive_and_logs_failure(): void
    {
        $this->mockFirebaseOnce([
            'success' => false,
            'error_code' => 'UNREGISTERED',
            'response' => ['error' => ['message' => 'Requested entity was not found.']],
        ]);

        [$log, $recipient] = $this->createPendingRecipient('bad-token', userId: 5);
        $token = UserPushToken::query()->create([
            'user_id' => 5,
            'push_token' => 'bad-token',
            'is_active' => true,
            'status' => UserPushToken::STATUS_ACTIVE,
        ]);

        app(PushNotificationLogger::class)->sendLog($log, []);

        $recipient->refresh();
        $token->refresh();

        $this->assertSame(PushNotificationRecipientStatus::InvalidToken, $recipient->status);
        $this->assertNull($recipient->delivered_at);
        $this->assertFalse((bool) $token->is_active);
        $this->assertSame(UserPushToken::STATUS_INVALID, $token->status);

        $failure = NotificationFailure::query()->first();
        $this->assertNotNull($failure);
        $this->assertSame('UNREGISTERED', $failure->firebase_error_code);
        $this->assertSame(1, $failure->attempt_count);
    }

    public function test_temporary_error_retries_up_to_three_times(): void
    {
        $firebase = Mockery::mock(FirebaseService::class);
        $firebase->shouldReceive('sendToDevice')
            ->times(3)
            ->andReturn([
                'success' => false,
                'error_code' => 'UNAVAILABLE',
                'response' => ['error' => ['message' => 'Service unavailable']],
            ]);
        $this->app->instance(FirebaseService::class, $firebase);

        [$log, $recipient] = $this->createPendingRecipient('retry-token', userId: 2);
        UserPushToken::query()->create([
            'user_id' => 2,
            'push_token' => 'retry-token',
            'is_active' => true,
            'status' => UserPushToken::STATUS_ACTIVE,
        ]);

        app(PushNotificationLogger::class)->sendLog($log, []);

        $recipient->refresh();
        $this->assertSame(PushNotificationRecipientStatus::Failed, $recipient->status);
        $this->assertSame(3, $recipient->attempt_count);
        $this->assertSame(3, NotificationFailure::query()->count());
        $this->assertTrue((bool) UserPushToken::query()->where('push_token', 'retry-token')->value('is_active'));
    }

    public function test_repush_skips_inactive_token(): void
    {
        [$log, $recipient] = $this->createPendingRecipient('inactive-token', userId: 3);
        $recipient->update([
            'status' => PushNotificationRecipientStatus::Failed,
            'failure_reason' => 'Device not reachable',
            'firebase_error_code' => 'UNAVAILABLE',
            'failed_at' => now(),
            'attempt_count' => 3,
        ]);

        UserPushToken::query()->create([
            'user_id' => 3,
            'push_token' => 'inactive-token',
            'is_active' => false,
            'status' => UserPushToken::STATUS_INVALID,
        ]);

        $logger = app(PushNotificationLogger::class);
        $this->assertFalse($logger->canRepushRecipient($recipient->fresh()));
        $this->assertFalse($logger->repushRecipient($recipient->fresh()));
    }

    public function test_repush_succeeds_for_active_token_with_retryable_failure(): void
    {
        $firebase = Mockery::mock(FirebaseService::class);
        $firebase->shouldReceive('sendToDevice')->once()->andReturn([
            'success' => true,
            'error_code' => null,
            'response' => null,
        ]);
        $this->app->instance(FirebaseService::class, $firebase);

        [$log, $recipient] = $this->createPendingRecipient('good-token', userId: 4);
        $recipient->update([
            'status' => PushNotificationRecipientStatus::Failed,
            'failure_reason' => 'Device not reachable',
            'firebase_error_code' => 'UNAVAILABLE',
            'failed_at' => now(),
            'attempt_count' => 3,
        ]);

        UserPushToken::query()->create([
            'user_id' => 4,
            'push_token' => 'good-token',
            'is_active' => true,
            'status' => UserPushToken::STATUS_ACTIVE,
        ]);

        $logger = app(PushNotificationLogger::class);
        $this->assertTrue($logger->canRepushRecipient($recipient->fresh()));
        $this->assertTrue($logger->repushRecipient($recipient->fresh()));

        $recipient->refresh();
        $this->assertSame(PushNotificationRecipientStatus::Delivered, $recipient->status);
    }

    public function test_fcm_error_classifier_identifies_permanent_and_retryable_codes(): void
    {
        $classifier = app(FcmErrorClassifier::class);

        $this->assertTrue($classifier->isPermanentTokenFailure('UNREGISTERED'));
        $this->assertTrue($classifier->isPermanentTokenFailure('PERMISSION_DENIED'));
        $this->assertTrue($classifier->isRetryable('UNAVAILABLE'));
        $this->assertTrue($classifier->isRetryable('INTERNAL'));
        $this->assertFalse($classifier->isRetryable('UNREGISTERED'));
    }

    /**
     * @param  array{success?: bool, error_code?: ?string, response?: ?array}  $result
     */
    private function mockFirebaseOnce(array $result): void
    {
        $firebase = Mockery::mock(FirebaseService::class);
        $firebase->shouldReceive('sendToDevice')->once()->andReturn($result);
        $this->app->instance(FirebaseService::class, $firebase);
    }

    /**
     * @return array{0: PushNotificationLog, 1: PushNotificationRecipient}
     */
    private function createPendingRecipient(string $token, ?int $userId = null): array
    {
        $log = PushNotificationLog::query()->create([
            'module_name' => 'system',
            'notification_title' => 'Test',
            'audience_type' => 'user',
            'status' => PushNotificationLogStatus::Draft,
        ]);

        $recipient = PushNotificationRecipient::query()->create([
            'push_notification_log_id' => $log->id,
            'recipient_user_id' => $userId,
            'device_token' => $token,
            'status' => PushNotificationRecipientStatus::Pending,
        ]);

        return [$log, $recipient];
    }
}
