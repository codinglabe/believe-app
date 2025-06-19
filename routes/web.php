<?php

use App\Http\Controllers\ChunkedUploadController;
use App\Http\Controllers\ManageDataController;
use App\Http\Controllers\ManageDatasetController;
use App\Http\Controllers\UploadDataController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

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
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
