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

    // Admin-only settings (outside topics.selected middleware)
    Route::middleware('role:admin')->group(function () {
        // Service Hub Settings - Admin Only
        Route::get('/settings/service-hub', [\App\Http\Controllers\Admin\ServiceHubSettingsController::class, 'index'])->name('service-hub-settings.index');
        Route::post('/settings/service-hub/fees', [\App\Http\Controllers\Admin\ServiceHubSettingsController::class, 'updateFees'])->name('service-hub-settings.update-fees');
        Route::post('/settings/service-hub/state-tax/{stateId}', [\App\Http\Controllers\Admin\ServiceHubSettingsController::class, 'updateStateTax'])->name('service-hub-settings.update-state-tax');
        Route::post('/settings/service-hub/state-taxes/bulk', [\App\Http\Controllers\Admin\ServiceHubSettingsController::class, 'bulkUpdateStateTaxes'])->name('service-hub-settings.bulk-update-taxes');
    });

    Route::middleware('topics.selected')->group(function () {
        Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
        Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
        Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

        Route::get('settings/password', [PasswordController::class, 'edit'])->name('password.edit');
        Route::get('/settings/settings/referral', [ReferralLinkController::class, 'edit'])->name('referral.edit');
        // Payment Methods - Admin Only (applies globally to all users)
        Route::middleware('role:admin')->group(function () {
            Route::get('/settings/payment-methods', [PaymentMethodSettingController::class, 'index'])->name('payment-methods.index');
            Route::post('/settings/payment-methods', [PaymentMethodSettingController::class, 'update'])->name('payment-methods.update');

            // Bridge Settings - Admin Only
            Route::get('/settings/bridge', [\App\Http\Controllers\BridgeSettingsController::class, 'index'])->name('bridge.index');
            Route::post('/settings/bridge', [\App\Http\Controllers\BridgeSettingsController::class, 'update'])->name('bridge.update');

            // Application Settings - Admin Only
            Route::get('/settings/application', [\App\Http\Controllers\Settings\ApplicationSettingsController::class, 'index'])->name('application.index');
            Route::post('/settings/application/optimize', [\App\Http\Controllers\Settings\ApplicationSettingsController::class, 'optimize'])->name('application.optimize');
            Route::post('/settings/application/clear', [\App\Http\Controllers\Settings\ApplicationSettingsController::class, 'clear'])->name('application.clear');
        });
        Route::get('settings/appearance', function () {
            return Inertia::render('settings/appearance');
        })->name('appearance');

        // Exemption Certificates - For nonprofit organizations
        Route::middleware('role:organization')->group(function () {
            Route::get('settings/exemption-certificates', [\App\Http\Controllers\NonprofitExemptionCertificateController::class, 'index'])->name('exemption-certificates.index');
            Route::post('settings/exemption-certificates', [\App\Http\Controllers\NonprofitExemptionCertificateController::class, 'store'])->name('exemption-certificates.store');
            Route::put('settings/exemption-certificates/{id}', [\App\Http\Controllers\NonprofitExemptionCertificateController::class, 'update'])->name('exemption-certificates.update');
            Route::delete('settings/exemption-certificates/{id}', [\App\Http\Controllers\NonprofitExemptionCertificateController::class, 'destroy'])->name('exemption-certificates.destroy');
        });

        Route::get('settings/billing', [\App\Http\Controllers\Settings\BillingController::class, 'index'])->name('billing.index');
    });

});


Route::middleware(['auth', 'EnsureEmailIsVerified', 'role:user|organization|admin'])->put('settings/password', [PasswordController::class, 'update'])->name('password.update');

Route::middleware(['auth', 'EnsureEmailIsVerified', 'role:organization'])->group(function () {
    Route::patch(
        'settings/social-accounts',
        [ProfileController::class, 'updateSocialAccounts']
    )->name('profile.social-accounts.update');

    Route::patch(
        'settings/gift-card-terms',
        [ProfileController::class, 'updateGiftCardTerms']
    )->name('profile.gift-card-terms.update');
});
