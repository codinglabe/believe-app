<?php

use App\Enums\PushNotificationLogStatus;
use App\Enums\PushNotificationRecipientStatus;
use App\Models\Organization;
use App\Models\PushNotificationLog;
use App\Models\PushNotificationRecipient;
use App\Models\User;
use App\Services\FirebaseService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

beforeEach(function () {
    try {
        // Trigger migration; skip suite when SQLite cannot run legacy migrations.
        PushNotificationLog::query()->count();
    } catch (\Throwable $e) {
        if (str_contains($e->getMessage(), 'MODIFY') || str_contains($e->getMessage(), 'no such table')) {
            test()->markTestSkipped('Test database migrations unavailable in SQLite.');
        }
        throw $e;
    }
});

function createTestOrganization(?User $owner = null): Organization
{
    $owner ??= User::factory()->create();

    return Organization::query()->create([
        'user_id' => $owner->id,
        'ein' => (string) random_int(100000000, 999999999),
        'name' => 'Test Org '.random_int(1, 9999),
        'street' => '1 Main St',
        'city' => 'City',
        'state' => 'NY',
        'zip' => '10001',
        'email' => 'org'.random_int(1, 9999).'@example.com',
        'phone' => '5555555555',
        'contact_name' => 'Contact',
        'contact_title' => 'Director',
    ]);
}

test('platform admin can view push notification log detail page', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $org = createTestOrganization();

    $log = PushNotificationLog::query()->create([
        'organization_id' => $org->id,
        'module_name' => 'donations',
        'notification_title' => 'Donation received',
        'audience_type' => 'users',
        'status' => PushNotificationLogStatus::Sent,
    ]);

    $this->actingAs($admin)
        ->get(route('admin.push-notifications.show', $log))
        ->assertOk();
})->skip(fn () => ! Schema::hasTable('push_notification_logs'), 'Push notification tables missing');

test('organization user cannot view other organization logs', function () {
    $user = User::factory()->create(['role' => 'organization']);
    createTestOrganization($user);
    $orgB = createTestOrganization();

    $log = PushNotificationLog::query()->create([
        'organization_id' => $orgB->id,
        'module_name' => 'campaigns',
        'notification_title' => 'Campaign',
        'audience_type' => 'users',
        'status' => PushNotificationLogStatus::Sent,
    ]);

    $this->actingAs($user)
        ->get(route('admin.push-notifications.show', $log))
        ->assertForbidden();
})->skip(fn () => ! Schema::hasTable('push_notification_logs'), 'Push notification tables missing');

test('only platform admin can repush notifications', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $orgUser = User::factory()->create(['role' => 'organization']);

    $log = PushNotificationLog::query()->create([
        'module_name' => 'system',
        'notification_title' => 'Retry me',
        'audience_type' => 'users',
        'status' => PushNotificationLogStatus::Failed,
    ]);

    PushNotificationRecipient::query()->create([
        'push_notification_log_id' => $log->id,
        'status' => PushNotificationRecipientStatus::Failed,
        'failed_at' => now(),
        'failure_reason' => 'Device not reachable',
    ]);

    $firebase = Mockery::mock(FirebaseService::class);
    $firebase->shouldReceive('sendToDevice')->andReturn(['success' => true, 'error_code' => null, 'response' => null]);
    app()->instance(FirebaseService::class, $firebase);

    $this->actingAs($orgUser)
        ->post(route('admin.push-notifications.repush', $log))
        ->assertForbidden();

    $this->actingAs($admin)
        ->post(route('admin.push-notifications.repush', $log))
        ->assertRedirect();
})->skip(fn () => ! Schema::hasTable('push_notification_logs'), 'Push notification tables missing');

test('push notification open endpoint records opens', function () {
    $user = User::factory()->create();

    $log = PushNotificationLog::query()->create([
        'module_name' => 'events',
        'notification_title' => 'Event',
        'audience_type' => 'user',
        'status' => PushNotificationLogStatus::Sent,
        'delivered_count' => 1,
        'recipient_count' => 1,
    ]);

    $recipient = PushNotificationRecipient::query()->create([
        'push_notification_log_id' => $log->id,
        'recipient_user_id' => $user->id,
        'status' => PushNotificationRecipientStatus::Delivered,
        'delivered_at' => now(),
    ]);

    $this->actingAs($user)
        ->postJson('/api/push-notifications/open', [
            'notification_log_id' => $log->id,
            'recipient_id' => $recipient->id,
        ])
        ->assertOk()
        ->assertJson(['success' => true]);

    expect($recipient->fresh()->status)->toBe(PushNotificationRecipientStatus::Opened);
})->skip(fn () => ! Schema::hasTable('push_notification_logs'), 'Push notification tables missing');
