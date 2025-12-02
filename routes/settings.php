<?php

use App\Http\Controllers\PaymentMethodSettingController;
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\ReferralLinkController;
use App\Http\Controllers\UsersInterestedTopicsController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware(['auth', 'EnsureEmailIsVerified', 'role:organization|admin'])->group(function () {
    Route::redirect('settings', 'settings/profile');

    Route::middleware('topics.selected')->group(function () {
        Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
        Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
        Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

        Route::get('settings/password', [PasswordController::class, 'edit'])->name('password.edit');
        Route::get('/settings/settings/referral', [ReferralLinkController::class, 'edit'])->name('referral.edit');
        Route::get('/settings/payment-methods', [PaymentMethodSettingController::class, 'index'])->name('payment-methods.index')->middleware('role:admin');
        Route::post('/settings/payment-methods', [PaymentMethodSettingController::class, 'update'])->name('payment-methods.update')->middleware('role:admin');
        Route::get('settings/appearance', function () {
            return Inertia::render('settings/appearance');
        })->name('appearance');

        Route::get('settings/billing', [\App\Http\Controllers\Settings\BillingController::class, 'index'])->name('billing.index');
    });

});


Route::middleware(['auth', 'EnsureEmailIsVerified', 'role:user|organization|admin'])->put('settings/password', [PasswordController::class, 'update'])->name('password.update');

Route::middleware(['auth', 'EnsureEmailIsVerified', 'role:organization'])->patch(
    'settings/social-accounts',
    [ProfileController::class, 'updateSocialAccounts']
)->name('profile.social-accounts.update');
