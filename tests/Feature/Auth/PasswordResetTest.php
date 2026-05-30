<?php

use App\Jobs\SendPasswordResetEmailJob;
use App\Mail\PasswordResetMail;
use App\Models\User;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Mail;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

test('reset password link screen can be rendered', function () {
    $response = $this->get('/forgot-password');

    $response->assertStatus(200);
});

test('reset password link can be requested', function () {
    Bus::fake();

    $user = User::factory()->create();

    $this->post('/forgot-password', ['email' => $user->email]);

    Bus::assertDispatchedAfterResponse(SendPasswordResetEmailJob::class, function (SendPasswordResetEmailJob $job) use ($user) {
        return $job->userId === $user->id && $job->token !== '';
    });
});

test('reset password link cannot be requested again during cooldown', function () {
    Bus::fake();

    $user = User::factory()->create();

    $this->post('/forgot-password', ['email' => $user->email])
        ->assertSessionHas('passwordResetCooldownUntil');

    $this->post('/forgot-password', ['email' => $user->email])
        ->assertSessionHasErrors('email');
});

test('reset password email job sends mail', function () {
    Mail::fake();

    $user = User::factory()->create();
    $token = 'test-reset-token';

    (new SendPasswordResetEmailJob($user->id, $token, 'https://believeinunity.test'))->handle();

    Mail::assertSent(PasswordResetMail::class, function (PasswordResetMail $mail) use ($user) {
        return $mail->hasTo($user->email);
    });
});

test('reset password screen can be rendered', function () {
    Mail::fake();

    $user = User::factory()->create();
    $token = 'test-reset-token';

    (new SendPasswordResetEmailJob($user->id, $token, 'https://believeinunity.test'))->handle();

    $response = $this->get('/reset-password/'.$token.'?email='.urlencode($user->email));

    $response->assertStatus(200);
});

test('password can be reset with valid token', function () {
    $user = User::factory()->create();

    $token = \Illuminate\Support\Facades\Password::createToken($user);

    $response = $this->post('/reset-password', [
        'token' => $token,
        'email' => $user->email,
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('login'));
});
