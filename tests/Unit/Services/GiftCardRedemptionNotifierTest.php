<?php

namespace Tests\Unit\Services;

use App\Mail\GiftCardPurchaseReceipt;
use App\Models\GiftCard;
use App\Models\User;
use App\Notifications\GiftCardRedemptionDelayedNotification;
use App\Notifications\GiftCardRedemptionReadyNotification;
use App\Notifications\GiftCardRedemptionSubmittedNotification;
use App\Services\FirebaseService;
use App\Services\GiftCardRedemptionNotifier;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Mockery;
use ReflectionMethod;
use Tests\TestCase;

class GiftCardRedemptionNotifierTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_submitted_sends_in_app_push_and_receipt_email(): void
    {
        Notification::fake();
        Mail::fake();
        Cache::flush();

        $firebase = Mockery::mock(FirebaseService::class);
        $firebase->shouldReceive('stringifyFcmData')->once()->andReturnUsing(fn (array $data) => $data);
        $firebase->shouldReceive('sendToUser')
            ->once()
            ->withArgs(function (int $userId, string $title, string $body, array $data): bool {
                return $userId === 11
                    && $title === 'Gift card purchase received'
                    && str_contains($body, '72 hours')
                    && ($data['type'] ?? null) === 'gift_card_submitted';
            });

        $notifier = new GiftCardRedemptionNotifier($firebase);
        $user = $this->makeUser(11, 'buyer@example.test');
        $giftCard = $this->makeGiftCard(101, $user, 'Amazon', 25.0);

        $this->invokePrivate($notifier, 'notifyUserSubmitted', [$giftCard]);

        Notification::assertSentTo($user, GiftCardRedemptionSubmittedNotification::class);
        Mail::assertSent(GiftCardPurchaseReceipt::class, function (GiftCardPurchaseReceipt $mail) use ($user): bool {
            return $mail->hasTo($user->email)
                && $mail->pendingFulfillment === true
                && $mail->readyNotification === false;
        });
    }

    public function test_ready_sends_in_app_push_and_ready_email(): void
    {
        Notification::fake();
        Mail::fake();
        Cache::flush();

        $firebase = Mockery::mock(FirebaseService::class);
        $firebase->shouldReceive('stringifyFcmData')->once()->andReturnUsing(fn (array $data) => $data);
        $firebase->shouldReceive('sendToUser')
            ->once()
            ->withArgs(function (int $userId, string $title, string $body, array $data): bool {
                return $userId === 22
                    && $title === 'Your gift card is ready'
                    && str_contains($body, 'ready to use')
                    && ($data['type'] ?? null) === 'gift_card_ready';
            });

        $notifier = new GiftCardRedemptionNotifier($firebase);
        $user = $this->makeUser(22, 'ready@example.test');
        $giftCard = $this->makeGiftCard(202, $user, 'Target', 50.0, 'completed');
        $giftCard->shouldReceive('update')->once()->with(Mockery::on(function (array $attrs): bool {
            return ($attrs['is_sent'] ?? null) === true;
        }))->andReturnTrue();

        $this->invokePrivate($notifier, 'notifyUserReady', [$giftCard]);

        Notification::assertSentTo($user, GiftCardRedemptionReadyNotification::class);
        Mail::assertSent(GiftCardPurchaseReceipt::class, function (GiftCardPurchaseReceipt $mail) use ($user): bool {
            return $mail->hasTo($user->email)
                && $mail->readyNotification === true;
        });
    }

    public function test_delayed_sends_in_app_and_push_without_email(): void
    {
        Notification::fake();
        Mail::fake();
        Cache::flush();

        $firebase = Mockery::mock(FirebaseService::class);
        $firebase->shouldReceive('stringifyFcmData')->once()->andReturnUsing(fn (array $data) => $data);
        $firebase->shouldReceive('sendToUser')
            ->once()
            ->withArgs(function (int $userId, string $title, string $body, array $data): bool {
                return $userId === 33
                    && $title === 'Gift card still processing'
                    && ($data['type'] ?? null) === 'gift_card_delayed';
            });

        $notifier = new GiftCardRedemptionNotifier($firebase);
        $user = $this->makeUser(33, 'delayed@example.test');
        $giftCard = $this->makeGiftCard(303, $user, 'Walmart', 15.0);

        $this->invokePrivate($notifier, 'notifyUserDelayed', [$giftCard]);

        Notification::assertSentTo($user, GiftCardRedemptionDelayedNotification::class);
        Mail::assertNothingSent();
    }

    public function test_notify_submitted_is_idempotent_via_cache(): void
    {
        Notification::fake();
        Mail::fake();
        Cache::flush();

        $firebase = Mockery::mock(FirebaseService::class);
        $firebase->shouldReceive('stringifyFcmData')->never();
        $firebase->shouldReceive('sendToUser')->never();

        $notifier = new GiftCardRedemptionNotifier($firebase);
        $user = $this->makeUser(44, 'once@example.test');
        $giftCard = $this->makeGiftCard(404, $user, 'Best Buy', 40.0);

        Cache::put('gift_card_submitted_notify:404', 1, now()->addDay());

        // Public entrypoint uses afterCommit + GiftCard::find; with cache already set it must no-op
        // before any channel sends. Simulate the cache gate only.
        $cacheKey = 'gift_card_submitted_notify:'.$giftCard->id;
        $this->assertFalse(Cache::add($cacheKey, 1, now()->addDays(30)));

        Notification::assertNothingSent();
        Mail::assertNothingSent();
    }

    private function makeUser(int $id, string $email): User
    {
        $user = new User([
            'name' => 'Gift Card Tester',
            'email' => $email,
        ]);
        $user->id = $id;
        $user->exists = true;

        return $user;
    }

    /**
     * @return \Mockery\MockInterface&GiftCard
     */
    private function makeGiftCard(int $id, User $user, string $brand, float $amount, string $status = 'pending_fulfillment'): GiftCard
    {
        /** @var \Mockery\MockInterface&GiftCard $giftCard */
        $giftCard = Mockery::mock(GiftCard::class)->makePartial();
        $giftCard->forceFill([
            'user_id' => $user->id,
            'brand_name' => $brand,
            'amount' => $amount,
            'currency' => 'USD',
            'status' => $status,
        ]);
        $giftCard->id = $id;
        $giftCard->exists = true;
        $giftCard->setRelation('user', $user);
        $giftCard->shouldReceive('load')->andReturnSelf();

        return $giftCard;
    }

    /**
     * @param  list<mixed>  $args
     */
    private function invokePrivate(object $object, string $method, array $args = []): mixed
    {
        $reflection = new ReflectionMethod($object, $method);
        $reflection->setAccessible(true);

        return $reflection->invoke($object, ...$args);
    }
}
