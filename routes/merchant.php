<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Http\Controllers\Merchant\Auth\MerchantAuthController;

// ============================================
// MERCHANT PROGRAM ROUTES
// ============================================
// These routes are only accessible on merchant.believeinunity.org domain

// Home/Index Route - Landing Page
Route::get('/', function () {
    return Inertia::render('merchant/Landing');
})->name('merchant.home');

// Auth Routes (Login/Register) - Merchant branded pages
Route::middleware('guest:merchant')->group(function () {
    Route::get('/login', [MerchantAuthController::class, 'showLoginForm'])->name('merchant.login');
    Route::post('login', [MerchantAuthController::class, 'login']);

    Route::get('/register', [MerchantAuthController::class, 'create'])->name('merchant.register');
    Route::post('register', [MerchantAuthController::class, 'store']);

    Route::get('forgot-password', function (Request $request) {
        return Inertia::render('merchant/Auth/ForgotPassword', [
            'status' => $request->session()->get('status'),
        ]);
    })->name('merchant.password.request');

    Route::post('forgot-password', [\App\Http\Controllers\Auth\PasswordResetLinkController::class, 'store'])
        ->name('merchant.password.email');

    Route::get('reset-password/{token}', [\App\Http\Controllers\Auth\NewPasswordController::class, 'create'])
        ->name('merchant.password.reset');

    Route::post('reset-password', [\App\Http\Controllers\Auth\NewPasswordController::class, 'store'])
        ->name('merchant.password.store');
});

// Authenticated Merchant Routes
Route::middleware(['auth:merchant'])->group(function () {
    // Dashboard (no subscription required)
    Route::get('/dashboard', [App\Http\Controllers\Merchant\MerchantDashboardController::class, 'index'])->name('merchant.dashboard');
    
    // Subscription routes (no subscription required to view/subscribe)
    Route::prefix('subscription')->name('merchant.subscription.')->group(function () {
        Route::get('/', [App\Http\Controllers\Merchant\MerchantSubscriptionController::class, 'index'])->name('index');
        Route::post('/{plan}/subscribe', [App\Http\Controllers\Merchant\MerchantSubscriptionController::class, 'subscribe'])->name('subscribe');
        Route::get('/success', [App\Http\Controllers\Merchant\MerchantSubscriptionController::class, 'success'])->name('success');
        Route::post('/cancel', [App\Http\Controllers\Merchant\MerchantSubscriptionController::class, 'cancel'])->name('cancel');
    });

    // Protected routes (require subscription)
    Route::middleware([\App\Http\Middleware\RequireMerchantSubscription::class])->group(function () {
        // Offers Management
        Route::prefix('offers')->name('offers.')->group(function () {
            Route::get('/', [App\Http\Controllers\Merchant\MerchantOfferController::class, 'index'])->name('index');
            Route::get('/create', [App\Http\Controllers\Merchant\MerchantOfferController::class, 'create'])->name('create');
            Route::post('/', [App\Http\Controllers\Merchant\MerchantOfferController::class, 'store'])->name('store');
            Route::get('/{offer}', [App\Http\Controllers\Merchant\MerchantOfferController::class, 'show'])->name('show');
            Route::get('/{offer}/edit', [App\Http\Controllers\Merchant\MerchantOfferController::class, 'edit'])->name('edit');
            Route::put('/{offer}', [App\Http\Controllers\Merchant\MerchantOfferController::class, 'update'])->name('update');
            Route::delete('/{offer}', [App\Http\Controllers\Merchant\MerchantOfferController::class, 'destroy'])->name('destroy');
        });

        // Redemptions
        Route::prefix('redemptions')->name('redemptions.')->group(function () {
            Route::get('/', [App\Http\Controllers\Merchant\MerchantRedemptionsController::class, 'index'])->name('index');
            Route::get('/{id}', [App\Http\Controllers\Merchant\MerchantRedemptionsController::class, 'show'])->name('show');
            Route::get('/qr-code/{code}', [App\Http\Controllers\Merchant\MerchantRedemptionsController::class, 'generateQrCode'])->name('qr-code');
            Route::get('/verify/{code}', [App\Http\Controllers\Merchant\MerchantRedemptionsController::class, 'verify'])->name('verify');
        });

        // Analytics
        Route::get('/analytics', [App\Http\Controllers\Merchant\MerchantAnalyticsController::class, 'index'])->name('merchant.analytics');

        // Settings
        Route::get('/settings', [App\Http\Controllers\Merchant\MerchantSettingsController::class, 'index'])->name('merchant.settings');

        Route::patch('/settings/profile', [App\Http\Controllers\Merchant\MerchantSettingsController::class, 'updateProfile'])->name('merchant.settings.profile');
        Route::patch('/settings/business', [App\Http\Controllers\Merchant\MerchantSettingsController::class, 'updateBusiness'])->name('merchant.settings.business');
    });

    // Logout
    Route::post('logout', [MerchantAuthController::class, 'destroy'])
        ->name('merchant.logout');
});

// Public Routes (for supporters to view offers)
Route::prefix('hub')->name('hub.')->group(function () {
    Route::get('/', [App\Http\Controllers\Merchant\HubController::class, 'index'])->name('index');

    // Success route (must be before /offers/{slug} to avoid route conflict)
    Route::get('/offers/stripe/success', [App\Http\Controllers\Merchant\HubController::class, 'success'])->name('offer.success');

    // Checkout route (requires auth - accepts both web and merchant guards)
    Route::middleware(['auth:web,merchant'])->group(function () {
        Route::post('/offers/checkout', [App\Http\Controllers\Merchant\HubController::class, 'checkout'])->name('offer.checkout');
    });

    // Offer detail route (must be last to avoid matching "success" as slug)
    Route::get('/offers/{slug}', [App\Http\Controllers\Merchant\HubOfferController::class, 'show'])->name('offer.show');
});

