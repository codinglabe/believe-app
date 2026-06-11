<?php

namespace Tests\Unit\Services;

use App\Services\DeviceTokenService;
use App\Models\UserPushToken;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DeviceTokenServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('user_push_tokens');
        Schema::create('user_push_tokens', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('push_token');
            $table->boolean('is_active')->default(true);
            $table->string('status')->default('active');
            $table->boolean('needs_reregister')->default(false);
            $table->string('last_error')->nullable();
            $table->timestamp('last_error_at')->nullable();
            $table->timestamps();
        });
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('user_push_tokens');
        parent::tearDown();
    }

    public function test_mark_token_inactive_and_is_token_valid(): void
    {
        UserPushToken::query()->create([
            'user_id' => 10,
            'push_token' => 'abc123',
            'is_active' => true,
            'status' => UserPushToken::STATUS_ACTIVE,
        ]);

        $service = app(DeviceTokenService::class);
        $this->assertTrue($service->isTokenValid('abc123', 10));
        $this->assertSame('active', $service->tokenStatus('abc123', 10));

        $service->markTokenInactive('abc123', 10, 'Invalid device token');

        $this->assertFalse($service->isTokenValid('abc123', 10));
        $this->assertSame('inactive', $service->tokenStatus('abc123', 10));
    }
}
