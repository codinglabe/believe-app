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
    // Dashboard
    Route::get('/dashboard', function () {
        return Inertia::render('merchant/Dashboard');
    })->name('merchant.dashboard');
    // Offers Management
    Route::prefix('offers')->name('offers.')->group(function () {
        Route::get('/', function () {
            return Inertia::render('merchant/Offers/Index');
        })->name('index');
        
        Route::get('/create', function () {
            return Inertia::render('merchant/Offers/Create');
        })->name('create');
        
        Route::get('/{id}', function ($id) {
            return Inertia::render('merchant/Offers/Show', [
                'offerId' => $id
            ]);
        })->name('show');
        
        Route::get('/{id}/edit', function ($id) {
            return Inertia::render('merchant/Offers/Edit', [
                'offerId' => $id
            ]);
        })->name('edit');
    });

    // Redemptions
    Route::prefix('redemptions')->name('redemptions.')->group(function () {
        Route::get('/', function () {
            return Inertia::render('merchant/Redemptions/Index');
        })->name('index');
        
        Route::get('/{id}', function ($id) {
            return Inertia::render('merchant/Redemptions/Show', [
                'redemptionId' => $id
            ]);
        })->name('show');
    });

    // Analytics
    Route::get('/analytics', function () {
        return Inertia::render('merchant/Analytics');
    })->name('merchant.analytics');

    // Settings
    Route::get('/settings', function () {
        return Inertia::render('merchant/Settings');
    })->name('merchant.settings');

    // Logout
    Route::post('logout', [MerchantAuthController::class, 'destroy'])
        ->name('merchant.logout');
});

// Public Routes (for supporters to view offers)
Route::prefix('hub')->name('hub.')->group(function () {
    Route::get('/', function () {
        return Inertia::render('merchant/Hub');
    })->name('index');
    
    Route::get('/offers/{id}', function ($id) {
        return Inertia::render('merchant/Hub/OfferDetail', [
            'offerId' => $id
        ]);
    })->name('offer.show');
});

