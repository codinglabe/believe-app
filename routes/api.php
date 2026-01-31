<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\WalletController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\CardController;

// Public routes
Route::get('/health', function () {
    return response()->json(['status' => 'ok', 'timestamp' => now()]);
});

// Authentication routes
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/verify-email', [AuthController::class, 'verifyEmail']);
Route::post('/auth/resend-verification-code', [AuthController::class, 'resendVerificationCode']);

// Protected routes (require authentication via Passport)
Route::middleware('auth:api')->group(function () {
    // Auth routes that don't require email verification
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/user', [AuthController::class, 'user']);
    Route::post('/auth/verify-email', [AuthController::class, 'verifyEmail']);
    Route::post('/auth/resend-verification-code', [AuthController::class, 'resendVerificationCode']);

    // Protected routes that require email verification - SECURE GUARD
    Route::middleware('api.email.verified')->group(function () {
        // User
        Route::prefix('user')->group(function () {
            Route::get('/profile', [UserController::class, 'getProfile']);
            Route::put('/profile', [UserController::class, 'updateProfile']);
            Route::get('/balance', [UserController::class, 'getBalance']);
            Route::get('/points', [UserController::class, 'getPoints']);
            Route::get('/profile/posts', [UserController::class, 'getProfilePosts']);
            Route::get('/trending-organizations', [UserController::class, 'getTrendingOrganizations']);
            Route::get('/suggested-people', [UserController::class, 'getSuggestedPeople']);
            Route::get('/suggested-causes', [UserController::class, 'getSuggestedCauses']);
        });

        // Wallet
        Route::prefix('wallet')->group(function () {
            Route::get('/balance', [WalletController::class, 'getBalance']);
            Route::post('/deposit', [WalletController::class, 'deposit']);
            Route::post('/withdraw', [WalletController::class, 'withdraw']);
            Route::post('/send', [WalletController::class, 'send']);
            Route::post('/transfer', [WalletController::class, 'transfer']);
        });

        // Transactions
        Route::prefix('transactions')->group(function () {
            Route::get('/', [TransactionController::class, 'index']);
            Route::get('/{id}', [TransactionController::class, 'show']);
        });

        // Cards
        Route::prefix('cards')->group(function () {
            Route::get('/', [CardController::class, 'index']);
            Route::get('/{id}', [CardController::class, 'show']);
        });
        
        Route::prefix('crypto')->group(function () {
            Route::get('/', function () { 
                return response()->json(['message' => 'Crypto API endpoint']); 
            });
        });
        
        Route::prefix('p2p')->group(function () {
            Route::get('/', function () { 
                return response()->json(['message' => 'P2P API endpoint']); 
            });
        });
        
        Route::prefix('nft')->group(function () {
            Route::get('/', function () { 
                return response()->json(['message' => 'NFT API endpoint']); 
            });
        });
    });
});
