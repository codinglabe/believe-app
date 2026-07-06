<?php

namespace Tests\Unit\Services\PushNotifications;

use App\Enums\PushNotificationModule;
use App\Models\PushNotificationLog;
use App\Services\PushNotifications\OrganizationLogoResolver;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class OrganizationLogoResolverTest extends TestCase
{
    private OrganizationLogoResolver $resolver;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('campaigns');
        Schema::dropIfExists('organizations');
        Schema::dropIfExists('users');

        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable();
            $table->timestamps();
        });

        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('name')->nullable();
            $table->string('registered_user_image')->nullable();
            $table->timestamps();
        });

        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->nullable();
            $table->string('name')->nullable();
            $table->timestamps();
        });

        $this->resolver = app(OrganizationLogoResolver::class);
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('campaigns');
        Schema::dropIfExists('organizations');
        Schema::dropIfExists('users');
        parent::tearDown();
    }

    public function test_campaign_module_resolves_organization_for_automatic_drop(): void
    {
        $orgId = \DB::table('organizations')->insertGetId([
            'name' => 'Prayer Org',
            'registered_user_image' => 'organizations/prayer.png',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $campaignId = \DB::table('campaigns')->insertGetId([
            'organization_id' => $orgId,
            'name' => 'Daily Prayer',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $log = new PushNotificationLog([
            'module_name' => PushNotificationModule::Campaigns->value,
            'module_record_id' => $campaignId,
        ]);

        $payload = [
            'source_type' => 'campaign',
            'type' => 'prayer',
            'campaign_id' => (string) $campaignId,
            'module_name' => PushNotificationModule::Campaigns->value,
            'module_record_id' => (string) $campaignId,
        ];

        $this->assertFalse($this->resolver->isSystemAutomaticNotification($log, $payload));
        $this->assertSame($orgId, $this->resolver->resolveOrganizationId($log, $payload));
        $this->assertStringContainsString(
            'organizations/prayer.png',
            (string) $this->resolver->resolveLogoUrl($log, $payload),
        );
    }

    public function test_daily_engagement_is_system_automatic_and_has_no_logo(): void
    {
        $payload = [
            'type' => 'daily_engagement',
            'source_type' => 'daily_engagement',
            'module_name' => PushNotificationModule::DailyEngagement->value,
        ];

        $this->assertTrue($this->resolver->isSystemAutomaticNotification(null, $payload));
        $this->assertNull($this->resolver->resolveOrganizationIdFromPayload($payload));
        $this->assertNull($this->resolver->resolveLogoUrl(null, $payload));
    }

    public function test_org_daily_campaign_is_not_treated_as_system_daily_engagement(): void
    {
        $orgId = \DB::table('organizations')->insertGetId([
            'name' => 'Stuttie Learning',
            'registered_user_image' => 'organizations/stuttie.png',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $campaignId = \DB::table('campaigns')->insertGetId([
            'organization_id' => $orgId,
            'name' => 'GGR Daily Campaign',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $payload = [
            'type' => 'prayer',
            'source_type' => 'campaign',
            'module_name' => PushNotificationModule::Campaigns->value,
            'campaign_id' => (string) $campaignId,
            'notification_context' => 'organization_daily_campaign',
            'content_item_id' => '999',
        ];

        $this->assertTrue($this->resolver->isOrganizationCampaignNotification(null, $payload));
        $this->assertFalse($this->resolver->isSystemAutomaticNotification(null, $payload));
        $this->assertSame($orgId, $this->resolver->resolveOrganizationIdFromPayload($payload));
    }
}
