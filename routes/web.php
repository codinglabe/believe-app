<?php

use App\Http\Controllers\ChunkedUploadController;
use App\Http\Controllers\ClassificationCodeController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DeductibilityCodeController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\RolePermissionController;
use App\Http\Controllers\StatusCodeController;
use App\Http\Controllers\ManageDataController;
use App\Http\Controllers\ManageDatasetController;
use App\Http\Controllers\OrganizationController;
use App\Http\Controllers\UploadDataController;
use App\Http\Controllers\UserProfileController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DonationController;
use App\Http\Controllers\PurchaseOrderController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Worksheet\Row;

Route::get('/', [HomeController::class, "index"])->name('home');

Route::get('/about', function () {
    return Inertia::render('frontend/about');
})->name('about');

Route::get('/contact', function () {
    return Inertia::render('frontend/contact');
})->name('contact');

Route::get('/donate', [DonationController::class, 'index'])->name('donate');

// Organization routes
Route::get('/organizations', [OrganizationController::class, 'index'])->name('organizations');
Route::get('/organizations/{slug}', [OrganizationController::class, 'show'])->name('organizations.show');

// API route for dynamic city loading
Route::get('/api/cities-by-state', [OrganizationController::class, 'getCitiesByState']);

// Profile routes
Route::middleware(['auth', 'verified', 'role:user'])->name('user.')->group(function () {
    Route::get('/profile', [UserProfileController::class, 'index'])->name('profile.index');
    Route::get('/profile/edit', [UserProfileController::class, 'edit'])->name('profile.edit');
    Route::post('/profile/update', [UserProfileController::class, 'update'])->name('profile.update');

    Route::get('/profile/change-password', [UserProfileController::class, 'changePasswordForm'])->name('profile.change-password');

    Route::get('/profile/favorites', [UserProfileController::class, 'favorites'])->name('profile.favorites');
    Route::delete("/profile/favorites/{id}", [UserProfileController::class, 'removeFavorite'])->name('profile.favorites.remove');

    Route::get('/profile/donations', [UserProfileController::class, 'donations'])->name('profile.donations');
    Route::get('/profile/orders', [UserProfileController::class, 'orders'])->name('profile.orders');

    // Toggle favorite status
    Route::post('/organizations/{id}/toggle-favorite', [OrganizationController::class, 'toggleFavorite'])->name('organizations.toggle-favorite');
});

Route::middleware(['auth', 'verified', 'role:user'])->get('/profile-old', function () {
    return Inertia::render('frontend/profile');
});

Route::middleware(['auth', 'verified', 'role:organization|admin'])->group(function () {
    Route::get('dashboard', [DashboardController::class, "index"])->name('dashboard');

    // Chunked Upload Routes
    Route::prefix('upload')->group(function () {
        Route::get('/', [ChunkedUploadController::class, 'index'])->name('upload.index');
        Route::post('/init', [ChunkedUploadController::class, 'initializeUpload'])->name('upload.init');
        Route::post('/chunk', [ChunkedUploadController::class, 'uploadChunk'])->name('upload.chunk');
        Route::get('/progress/{uploadId}', [ChunkedUploadController::class, 'getProgress'])->name('upload.progress');
        Route::delete('/cancel/{uploadId}', [ChunkedUploadController::class, 'cancelUpload'])->name('upload.cancel');
        Route::post('/cleanup', [ChunkedUploadController::class, 'cleanupExpiredSessions'])->name('upload.cleanup');
    });

    // Main upload routes
    Route::get('/chunked-upload', [ChunkedUploadController::class, 'index'])->name('chunked-upload');
    Route::post('/upload-chunk', [ChunkedUploadController::class, 'uploadChunk'])->name('upload-chunk');
    Route::get('/file-status/{fileId}', [ChunkedUploadController::class, 'getProgress'])->name('file-status');

    // Route::get('manage', [ManageDataController::class, "index"])->name('manage-data.index');
    // Route::get('manage/{id}', [ManageDataController::class, "detailsDataset"])->name('manage-dataset.index');

    // Manage Data Routes
    Route::get('/manage-data', [ManageDataController::class, 'index'])->name('manage-data');
    Route::delete('/manage-data/{id}', [ManageDataController::class, 'destroy'])->name('manage-data.destroy');

    // Manage Dataset Routes
    Route::get('/manage-dataset/{fileId}', [ManageDatasetController::class, 'show'])->name('manage-dataset.show');
    Route::get('/manage-dataset/{fileId}/download', [ManageDatasetController::class, 'downloadAll'])->name('manage-dataset.download');
    Route::post('/manage-dataset/{fileId}/bulk-delete', [ManageDatasetController::class, 'bulkDelete'])->name('manage-dataset.bulk-delete');
    Route::post('/manage-dataset/{fileId}/bulk-download', [ManageDatasetController::class, 'bulkDownload'])->name('manage-dataset.bulk-download');
    Route::post('/manage-dataset/{fileId}/rows/{rowId}/note', [ManageDatasetController::class, 'saveNote'])->name('manage-dataset.save-note');

    // Classification Codes Routes
    Route::resource('classification-codes', ClassificationCodeController::class)->except(['show']);

    // Status Codes Routes
    Route::resource('status-codes', StatusCodeController::class)->except(['show']);

    // Deductibility Codes Routes
    Route::resource('deductibility-codes', DeductibilityCodeController::class)->except(['show'])->middleware('permission:deductibily.code.read');

    /* Product Routes */
    Route::resource('products', ProductController::class)->except(['show']);

    /* Category Routes */
    Route::resource('categories', CategoryController::class)->except(['show']);

    //role and permission routes
    Route::get('/permission-management', [RolePermissionController::class, 'index']);
    Route::get('/role-management', [RolePermissionController::class, 'roleManagement']);
    Route::get('/user-permission', [RolePermissionController::class, 'userPermission']);

    Route::prefix('permissions')->group(function () {
        Route::get('/', [RolePermissionController::class, 'index'])->name('permissions.overview');

        // Role Management
        Route::get('/roles', [RolePermissionController::class, 'roleManagement'])->name('roles.list');
        Route::get('/roles/create', [RolePermissionController::class, 'createRole'])->name('roles.create');
        Route::post('/roles', [RolePermissionController::class, 'storeRole'])->name('roles.store');
        Route::get('/roles/{role}/edit', [RolePermissionController::class, 'editRole'])->name('roles.edit');
        Route::put('/roles/{role}', [RolePermissionController::class, 'updateRole'])->name('roles.update');
        Route::delete('/roles/{role}', [RolePermissionController::class, 'destroyRole'])->name('roles.destroy');

        // User Management
        Route::get('/users', [RolePermissionController::class, 'userPermission'])->name('users.list');
        Route::get('/users/create', [RolePermissionController::class, 'createUser'])->name('users.create');
        Route::post('/users', [RolePermissionController::class, 'storeUser'])->name('users.store');
        Route::get('/users/{user}/edit', [RolePermissionController::class, 'editUser'])->name('users.edit');
        Route::put('/users/{user}', [RolePermissionController::class, 'updateUser'])->name('users.update');
        Route::delete('/users/{user}', [RolePermissionController::class, 'destroyUser'])->name('users.destroy');
    });
    Route::resource('deductibility-codes', DeductibilityCodeController::class)->except(['show']);
<<<<<<< HEAD

    
=======
>>>>>>> a0aabc1 (Add new CategorySeeder)
});

// route for donation
Route::middleware(['auth', 'verified'])->group(function () {
    Route::post('/donate', [DonationController::class, 'store'])->name('donations.store');
    Route::get('/donations/success', [DonationController::class, 'success'])->name('donations.success');
    Route::get('/donations/cancel', [DonationController::class, 'cancel'])->name('donations.cancel');
});



require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
