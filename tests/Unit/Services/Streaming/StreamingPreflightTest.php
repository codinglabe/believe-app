<?php

namespace Tests\Unit\Services\Streaming;

use App\Models\OrganizationLivestream;
use App\Models\User;
use App\Services\Streaming\StreamingPreflight;
use Mockery;
use Tests\TestCase;

/**
 * Quota gate (config 'streaming.gates.hard_quota_minutes') is intentionally
 * not covered here — it reads StreamingMonthlyUsage from the database, and
 * the project's migration set is MySQL-only so the default in-memory SQLite
 * test connection fails to migrate. Cover that gate with an integration test
 * that runs against the project's real MySQL once test-DB tooling is in place.
 */
class StreamingPreflightTest extends TestCase
{
    private StreamingPreflight $preflight;

    protected function setUp(): void
    {
        parent::setUp();
        $this->preflight = new StreamingPreflight();
        config()->set('streaming.gates.require_subscription', false);
        config()->set('streaming.gates.permission_name', '');
        config()->set('streaming.gates.hard_quota_minutes', 0);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_allows_by_default_when_no_gates_are_enabled(): void
    {
        $user = $this->makeUserMock();
        $livestream = $this->makeOrgLivestream(['organization_id' => 99]);

        $result = $this->preflight->check($livestream, $user);

        $this->assertTrue($result->allowed);
    }

    public function test_blocks_when_subscription_is_required_but_user_is_not_subscribed(): void
    {
        config()->set('streaming.gates.require_subscription', true);

        $user = $this->makeUserMock(subscribed: false);
        $livestream = $this->makeOrgLivestream(['organization_id' => 1]);

        $result = $this->preflight->check($livestream, $user);

        $this->assertFalse($result->allowed);
        $this->assertSame('subscription_inactive', $result->code);
    }

    public function test_allows_when_subscription_is_required_and_user_is_subscribed(): void
    {
        config()->set('streaming.gates.require_subscription', true);

        $user = $this->makeUserMock(subscribed: true);
        $livestream = $this->makeOrgLivestream(['organization_id' => 1]);

        $result = $this->preflight->check($livestream, $user);

        $this->assertTrue($result->allowed);
    }

    public function test_blocks_when_permission_is_required_and_user_lacks_it(): void
    {
        config()->set('streaming.gates.permission_name', 'livestream.start');

        $user = $this->makeUserMock(can: false);
        $livestream = $this->makeOrgLivestream(['organization_id' => 1]);

        $result = $this->preflight->check($livestream, $user);

        $this->assertFalse($result->allowed);
        $this->assertSame('permission_denied', $result->code);
    }

    public function test_allows_when_permission_is_required_and_user_has_it(): void
    {
        config()->set('streaming.gates.permission_name', 'livestream.start');

        $user = $this->makeUserMock(can: true);
        $livestream = $this->makeOrgLivestream(['organization_id' => 1]);

        $result = $this->preflight->check($livestream, $user);

        $this->assertTrue($result->allowed);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function makeOrgLivestream(array $attributes = []): OrganizationLivestream
    {
        $livestream = new OrganizationLivestream();
        $livestream->forceFill(array_merge(['id' => 1], $attributes));

        return $livestream;
    }

    private function makeUserMock(bool $subscribed = false, bool $can = true): User
    {
        /** @var User&\Mockery\MockInterface $user */
        $user = Mockery::mock(User::class)->makePartial();
        $user->shouldReceive('subscribed')->andReturn($subscribed);
        $user->shouldReceive('can')->andReturn($can);

        return $user;
    }
}
