<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\ConfirmablePasswordController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Auth\EmailVerificationPromptController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Auth\VerifyEmailController;
use App\Http\Controllers\OrganizationRegisterController;
use App\Http\Controllers\ProfilePhotoController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Models\User;

Route::middleware('guest')->group(function () {
    Route::get('/register', function () {
        return Inertia::render('frontend/register');
    })->name('register');

    Route::get('/register/user', function (Request $request) {

        if ($request->has('ref')) {

            $user = User::where('referral_code', $request->ref)->first();

            if (!$user) {
                return redirect()->route('register')->with('error', 'Invalid referral code');
            }
            return Inertia::render('frontend/register/user', [
                'referralCode' => $user->referral_code,
            ]);
        }
        return Inertia::render('frontend/register/user');
    })->name('register.user');

    Route::get('/register/organization', [OrganizationRegisterController::class, "create"])->name('register.organization');

    Route::post('/register/organization', [OrganizationRegisterController::class, "register"])->name('register.organization.store');

    Route::post('/register/organization/lookup-ein', [OrganizationRegisterController::class, 'lookupEIN'])
        ->name('register.organization.lookup-ein');

    // Route::get('register', [RegisteredUserController::class, 'create'])
    //     ->name('register');

    Route::post('register', [RegisteredUserController::class, 'store']);

    // Route::get('login-old', [AuthenticatedSessionController::class, 'create'])
    //     ->name('login-old');

    Route::get('/login', function () {
        return Inertia::render('frontend/login');
    })->name('login');

    Route::post('login', [AuthenticatedSessionController::class, 'store']);

    Route::get('forgot-password', [PasswordResetLinkController::class, 'create'])
        ->name('password.request');

    Route::post('forgot-password', [PasswordResetLinkController::class, 'store'])
        ->name('password.email');

    Route::get('reset-password/{token}', [NewPasswordController::class, 'create'])
        ->name('password.reset');

    Route::post('reset-password', [NewPasswordController::class, 'store'])
        ->name('password.store');
});

Route::middleware('auth')->group(function () {
    // Profile photo routes
    Route::post('/profile/photo', [ProfilePhotoController::class, 'store'])->name('profile.photo.store');
    Route::delete('/profile/photo', [ProfilePhotoController::class, 'destroy'])->name('profile.photo.destroy');
    Route::get('/profile/photo', [ProfilePhotoController::class, 'show'])->name('profile.photo.show');

    Route::post('/profile/cover', [ProfilePhotoController::class, 'updateCover'])->middleware("role:organization")->name('profile.cover');


    Route::get('verify-email', EmailVerificationPromptController::class)
        ->name('verification.notice');

    Route::get('verify-email/{id}/{hash}', VerifyEmailController::class)
        ->middleware(['signed', 'throttle:6,1'])
        ->name('verification.verify');

    Route::post('email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('verification.send');

    Route::get('confirm-password', [ConfirmablePasswordController::class, 'show'])
        ->name('password.confirm');

    Route::post('confirm-password', [ConfirmablePasswordController::class, 'store']);

    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])
        ->name('logout');
});
