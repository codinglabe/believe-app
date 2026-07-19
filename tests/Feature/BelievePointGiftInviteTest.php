<?php

use App\Models\BelievePointGiftInvite;
use App\Models\User;
use App\Services\BelievePointGiftInviteService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

beforeEach(function () {
    Mail::fake();

    DB::table('gift_occasions')->insert([
        'id' => 1,
        'occasion' => 'Birthday',
        'icon' => '🎂',
        'category' => 'Celebration',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
});

it('gifts believe points immediately to an existing supporter from gift-bp send', function () {
    $sender = User::factory()->create([
        'role' => 'user',
        'believe_points' => 100,
        'gifted_believe_points' => 0,
        'holding_believe_points' => 0,
    ]);

    $recipient = User::factory()->create([
        'role' => 'user',
        'email_verified_at' => now(),
        'believe_points' => 0,
        'gifted_believe_points' => 5,
    ]);

    $response = $this->actingAs($sender)->post('/gift-bp/send', [
        'mode' => 'user',
        'recipient_id' => $recipient->id,
        'amount' => 40,
        'gift_occasion_id' => 1,
        'message' => 'Enjoy!',
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    $sender->refresh();
    $recipient->refresh();

    expect((float) $sender->believe_points)->toBe(60.0);
    expect((float) $sender->holding_believe_points)->toBe(0.0);
    expect((float) $recipient->gifted_believe_points)->toBe(45.0);
});

it('holds believe points and creates an invite for an unregistered email', function () {
    $sender = User::factory()->create([
        'role' => 'user',
        'believe_points' => 80,
        'holding_believe_points' => 0,
    ]);

    $response = $this->actingAs($sender)->post('/gift-bp/send', [
        'mode' => 'invite',
        'email' => 'new.friend@example.com',
        'amount' => 25,
        'gift_occasion_id' => 1,
        'message' => 'Join us!',
    ]);

    $response->assertSessionHasNoErrors();

    $sender->refresh();
    expect((float) $sender->believe_points)->toBe(55.0);
    expect((float) $sender->holding_believe_points)->toBe(25.0);

    $this->assertDatabaseHas('believe_point_gift_invites', [
        'sender_id' => $sender->id,
        'recipient_email' => 'new.friend@example.com',
        'amount' => 25.00,
        'status' => 'pending',
    ]);
});

it('claims holding believe points when the invitee registers', function () {
    $sender = User::factory()->create([
        'role' => 'user',
        'believe_points' => 50,
        'holding_believe_points' => 30,
    ]);

    $invite = BelievePointGiftInvite::create([
        'sender_id' => $sender->id,
        'recipient_email' => 'claim.me@example.com',
        'gift_occasion_id' => 1,
        'amount' => 30,
        'occasion' => 'Birthday',
        'message' => 'Welcome',
        'token' => 'test-token-claim-123456789012345678901234',
        'status' => BelievePointGiftInvite::STATUS_PENDING,
        'expires_at' => now()->addDays(14),
    ]);

    $recipient = User::factory()->create([
        'role' => 'user',
        'email' => 'claim.me@example.com',
        'gifted_believe_points' => 0,
    ]);

    app(BelievePointGiftInviteService::class)->claimPendingForUser($recipient);

    $sender->refresh();
    $recipient->refresh();
    $invite->refresh();

    expect((float) $sender->holding_believe_points)->toBe(0.0);
    expect((float) $recipient->gifted_believe_points)->toBe(30.0);
    expect($invite->status)->toBe(BelievePointGiftInvite::STATUS_CLAIMED);
    expect($invite->recipient_id)->toBe($recipient->id);
});

it('refunds holding believe points when an invite expires', function () {
    $sender = User::factory()->create([
        'role' => 'user',
        'believe_points' => 10,
        'holding_believe_points' => 20,
    ]);

    BelievePointGiftInvite::create([
        'sender_id' => $sender->id,
        'recipient_email' => 'late@example.com',
        'gift_occasion_id' => 1,
        'amount' => 20,
        'occasion' => 'Birthday',
        'token' => 'test-token-expire-12345678901234567890123',
        'status' => BelievePointGiftInvite::STATUS_PENDING,
        'expires_at' => now()->subMinute(),
    ]);

    $count = app(BelievePointGiftInviteService::class)->expireDueInvites();

    expect($count)->toBe(1);

    $sender->refresh();
    expect((float) $sender->believe_points)->toBe(30.0);
    expect((float) $sender->holding_believe_points)->toBe(0.0);

    $this->assertDatabaseHas('believe_point_gift_invites', [
        'recipient_email' => 'late@example.com',
        'status' => 'expired',
    ]);
});
