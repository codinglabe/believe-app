<?php

use App\Http\Controllers\PaymentMethodSettingController;
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\ReferralLinkController;
use App\Http\Controllers\UsersInterestedTopicsController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware(['auth', 'verified', 'role:organization|admin'])->group(function () {
    Route::redirect('settings', 'settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('password.edit');
    Route::get('/settings/settings/referral', [ReferralLinkController::class, 'edit'])->name('referral.edit');
    Route::get('/settings/payment-methods', [PaymentMethodSettingController::class, 'index'])->name('payment-methods.index');
    Route::post('/settings/payment-methods', [PaymentMethodSettingController::class, 'update'])->name('payment-methods.update');
    Route::get('settings/appearance', function () {
        return Inertia::render('settings/appearance');
    })->name('appearance');

    Route::get("settings/topics/select", [UsersInterestedTopicsController::class, 'orgSelect'])
        ->name('auth.topics.select');
});

Route::middleware(['auth', 'verified', 'role:user|organization|admin'])->put('settings/password', [PasswordController::class, 'update'])->name('password.update');

Route::middleware(['auth', 'verified', 'role:organization'])->patch(
    'settings/social-accounts',
    [ProfileController::class, 'updateSocialAccounts']
)->name('profile.social-accounts.update');
