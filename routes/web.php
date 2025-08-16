<?php

use App\Http\Controllers\PaymentMethodSettingController;
use App\Http\Controllers\JobPositionController;
use App\Http\Controllers\JobPostController;
use App\Http\Controllers\NodeBossController;
use App\Http\Controllers\NodeReferralController;
use App\Http\Controllers\PositionCategoryController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\UsersInterestedTopicsController;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use PhpOffice\PhpSpreadsheet\Worksheet\Row;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\ChatTopicController;
use App\Http\Controllers\DonationController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ManageDataController;
use App\Http\Controllers\StatusCodeController;
use App\Http\Controllers\UploadDataController;
use App\Http\Controllers\MarketplaceController;
use App\Http\Controllers\UserProfileController;
use App\Http\Controllers\OrganizationController;
use App\Http\Controllers\ChunkedUploadController;
use App\Http\Controllers\ManageDatasetController;
use App\Http\Controllers\PurchaseOrderController;
use App\Http\Controllers\RolePermissionController;
use App\Http\Controllers\DeductibilityCodeController;
use App\Http\Controllers\ClassificationCodeController;
use App\Http\Controllers\CourseController;
use App\Http\Controllers\EnrollmentController;
use App\Http\Controllers\JobApplicationController;
use App\Http\Controllers\JobsController;
use App\Http\Controllers\NodeSellController;
use App\Http\Controllers\NodeShareController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\WithdrawalController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\MeetingChatMessageController;
use App\Http\Controllers\MeetingController;
use App\Http\Controllers\OwnershipVerificationController;
use App\Http\Controllers\PlaidVerificationController;
use App\Http\Controllers\RecordingController;
use App\Http\Controllers\TopicController;
use Illuminate\Support\Facades\Broadcast;

// Route::get('/test-broadcast', function () {
//     $message = App\Models\ChatMessage::first();
//     event(new App\Events\MessageSent($message));
//     return "Event fired for message: " . $message;
// });

Broadcast::routes(['middleware' => ['auth']]);

Route::get('/', [HomeController::class, "index"])->name('home');

Route::get('/about', function () {
    return Inertia::render('frontend/about');
})->name('about');

Route::get('/contact', function () {
    return Inertia::render('frontend/contact');
})->name('contact');

Route::get("/jobs", [JobsController::class, 'index'])->name('jobs.index');
Route::get("/jobs/{id}", [JobsController::class, 'show'])->name('jobs.show');
Route::get('/get-job-positions', [JobsController::class, "getJobPositions"])->name('jobs.positions.by-category');

Route::get("/jobs/{id}/apply", [JobsController::class, 'applyShow'])->name('jobs.apply.show');
Route::post("/jobs/{id}/apply", [JobsController::class, 'applyStore'])->name('jobs.apply.store');

Route::get('/nodeboss', [NodeBossController::class, 'frontendIndex'])->name('nodeboss.index');

Route::get('/nodeboss/{id}/buy', [NodeBossController::class, 'frontendShow'])->name('buy.nodeboss');

Route::get('/donate', [DonationController::class, 'index'])->name('donate');

/* marketplace */
Route::get('/marketplace', [MarketplaceController::class, 'index'])->name('marketplace.index');

/* events */
Route::get('/all-events', [EventController::class, 'alleventsPage'])->name('alleventsPage');
Route::get('/events/{id}/view', [EventController::class, 'viewEvent'])->name('viewEvent');


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
    Route::get('/profile/transactions', [TransactionController::class, 'index'])->name('profile.transactions');
    Route::get('nodeboss/shares', [NodeShareController::class, 'index'])->name('nodeboss.sahres');
    // Toggle favorite status
    Route::post('/organizations/{id}/toggle-favorite', [OrganizationController::class, 'toggleFavorite'])->name('organizations.toggle-favorite');

    Route::get("/profile/topics/select", [UsersInterestedTopicsController::class, 'userSelect'])
        ->name('topics.select');
});

Route::post('/user/topics/store', [UsersInterestedTopicsController::class, 'store'])
    ->middleware(['auth', 'verified', 'role:user|organization']);

Route::middleware(['auth', 'verified', 'role:user'])->get('/profile-old', function () {
    return Inertia::render('frontend/profile');
});

Route::resource('/chat-group-topics', ChatTopicController::class)->only(['index', 'store', 'update', 'destroy']);

Route::prefix("chat")->middleware(['auth', 'verified', 'topics.selected'])->name("chat.")->group(function () {
    Route::get("/", [ChatController::class, 'index'])->name('index');
    Route::get("/rooms/{chatRoom}/messages", [ChatController::class, 'getMessages'])->name('messages');
    Route::post("/rooms/{chatRoom}/messages", [ChatController::class, 'sendMessage'])->name('send-message');
    Route::delete("/messages/{message}", [ChatController::class, 'deleteMessage'])->name('delete-message');
    Route::post("/rooms", [ChatController::class, 'createRoom'])->name('create-room');
    Route::post("/direct-chat", [ChatController::class, 'createDirectChat'])->name('create-direct-chat'); // Corrected route name
    Route::post("/rooms/{chatRoom}/join", [ChatController::class, 'joinRoom'])->name('join-room');
    Route::post("/rooms/{chatRoom}/leave", [ChatController::class, 'leaveRoom'])->name('leave-room');
    Route::post("/rooms/{chatRoom}/typing", [ChatController::class, 'setTypingStatus'])->name('typing'); // Renamed function
    Route::post("/rooms/{chatRoom}/mark-as-read", [ChatController::class, 'markRoomAsRead'])->name('mark-as-read'); // Renamed function
    Route::post("/rooms/{chatRoom}/members", [ChatController::class, 'addMembers'])->name('add-members');
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

    Route::resource("position-categories", PositionCategoryController::class)->except(['show'])->middleware('permission:job.position.categories.read');

    Route::resource("job-positions", JobPositionController::class)->except(['show'])->middleware('permission:job.positions.read');

    Route::resource('job-posts', JobPostController::class)->middleware(['role:organization', 'permission:job.posts.read']);

    // job applications routes
    Route::resource('job-applications', JobApplicationController::class)->middleware(['role:organization', 'permission:job.posts.read']);
    Route::put('job-applications/{jobApplication}/update-status', [JobApplicationController::class, 'updateStatus'])
        ->name('job-applications.update-status')
        ->middleware(['role:organization', 'permission:job.posts.read']);

    // Events Routes
    Route::resource('events', EventController::class);
    Route::get('/events/{event}/update-status', [EventController::class, 'updateStatus'])->name('events.update-status');
    Route::get('/api/events/dashboard', [EventController::class, 'dashboard'])->name('events.dashboard');

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



    /* orders Routes */
    Route::resource('orders', OrderController::class);
    // Purchase Order Routes
    Route::get('/purchase-orders', [PurchaseController::class, 'index'])->name('purchase-orders.index');
    Route::get('/purchase-orders/create', [PurchaseController::class, 'create'])->name('purchase-orders.create');
    Route::post('/purchase-orders', [PurchaseController::class, 'store'])->name('purchase-orders.store');
    Route::get('/purchase-orders/{id}/edit', [PurchaseController::class, 'edit'])->name('purchase-orders.edit');
    Route::put('/purchase-orders/{id}', [PurchaseController::class, 'update'])->name('purchase-orders.update');
    Route::delete('/purchase-orders/{id}', [PurchaseController::class, 'destroy'])->name('purchase-orders.destroy');


    /* orders Routes */
    Route::resource('orders', OrderController::class);
    // Purchase Order Routes
    Route::get('/purchase-orders', [PurchaseController::class, 'index'])->name('purchase-orders.index');
    Route::get('/purchase-orders/create', [PurchaseController::class, 'create'])->name('purchase-orders.create');
    Route::post('/purchase-orders', [PurchaseController::class, 'store'])->name('purchase-orders.store');
    Route::get('/purchase-orders/{id}/edit', [PurchaseController::class, 'edit'])->name('purchase-orders.edit');
    Route::put('/purchase-orders/{id}', [PurchaseController::class, 'update'])->name('purchase-orders.update');
    Route::delete('/purchase-orders/{id}', [PurchaseController::class, 'destroy'])->name('purchase-orders.destroy');

    // Node Boss Routes
    Route::get('/node-boss/create', [NodeBossController::class, 'create'])->name('node-boss.create');
    Route::post('/node-boss/store', [NodeBossController::class, 'store'])->name('node-boss.store');
    Route::get('/node-boss/{id}/edit', [NodeBossController::class, 'edit'])->name('node-boss.edit');
    Route::put('/node-boss/{id}', [NodeBossController::class, 'update'])->name('node-boss.update');
    Route::delete('/node-boss/{id}', [NodeBossController::class, 'destroy'])->name('node-boss.destroy');
    Route::get('/node-boss', [NodeBossController::class, 'index'])->name('node-boss.index');
    Route::get('/node-boss/{id}', [NodeBossController::class, 'show'])->name('node-boss.show');

    //node boss referral
    Route::resource('node-referral', NodeReferralController::class);

    // New Withdrawal resource routes
    Route::resource('withdrawals', WithdrawalController::class);

    // Custom routes for withdrawal actions
    Route::post('withdrawals/{withdrawal}/accept', [WithdrawalController::class, 'accept'])->name('withdrawals.accept');
    Route::post('withdrawals/{withdrawal}/make-payment', [WithdrawalController::class, 'makePayment'])->name('withdrawals.makePayment');

    // Route::prefix('settings')->group(function () {
    //     Route::get('/payment-methods', [PaymentMethodSettingController::class, 'index'])->name('payment-methods.index');
    //     Route::post('/payment-methods', [PaymentMethodSettingController::class, 'update'])->name('payment-methods.update');
    // });
});


// Public Course Routes
Route::get('/courses', [CourseController::class, 'publicIndex'])->name('course.index');
Route::get('/courses/{course:slug}', [CourseController::class, 'publicShow'])->name('course.show'); // Use slug for public show
// Ownership Verification Routes
// Route::middleware(['auth', 'verified'])->group(function () {
//     // Ownership Verification routes
//     Route::get('/verification/ownership', [OwnershipVerificationController::class, 'show'])->name('verification.ownership');
//     Route::post('/verification/ownership/verify', [OwnershipVerificationController::class, 'verify'])->name('verification.verify');
//     Route::get('/verification/results', [OwnershipVerificationController::class, 'results'])->name('verification.results');
//     Route::post('/verification/ownership/retry', [OwnershipVerificationController::class, 'retry'])->name('verification.retry');
// });
// Enrollment routes (require authentication)
Route::middleware('auth')->group(function () {
    Route::get('/courses/{course:slug}/enroll', [EnrollmentController::class, 'show'])->name('courses.enroll');
    Route::post('/courses/{course:slug}/enroll', [EnrollmentController::class, 'store'])->name('courses.enroll.store');
    Route::post('/courses/{course:slug}/cancel', [EnrollmentController::class, 'cancel'])->name('courses.cancel');
    Route::post('/courses/{course:slug}/refund', [EnrollmentController::class, 'refund'])->name('courses.refund');
    Route::get('/courses/enrollment/success', [EnrollmentController::class, 'success'])->name('courses.enrollment.success');
    Route::get('/courses/enrollment/cancel/{enrollment}', [EnrollmentController::class, 'cancel'])->name('courses.enrollment.cancel');
    Route::get('/profile/my-enrollments', [EnrollmentController::class, 'myEnrollments'])->name('enrollments.my');
});
Route::middleware(['auth', 'verified'])->group(function () {
    // Admin Course Management Routes
    Route::prefix('admin/courses')->name('admin.courses.')->group(function () {
        Route::get('/', [CourseController::class, 'adminIndex'])->name('index');
        Route::get('/create', [CourseController::class, 'create'])->name('create');
        Route::post('/', [CourseController::class, 'store'])->name('store');
        Route::get('/{course:slug}', [CourseController::class, 'adminShow'])->name('show'); // Added this line
        Route::get('/{course:slug}/edit', [CourseController::class, 'edit'])->name('edit');
        Route::put('/{course:slug}', [CourseController::class, 'update'])->name('update');
        Route::delete('/{course:slug}', [CourseController::class, 'destroy'])->name('destroy');
    });

    // Topic Management Routes (Admin Only)
    Route::resource('topics', TopicController::class)->only(['index', 'store', 'update', 'destroy']);
});
// Meeting routes
Route::middleware(['auth'])->group(function () {
    // Meeting management
    Route::get('/meetings', [MeetingController::class, 'index'])->name('meetings.index');
    Route::get('/meetings/create', [MeetingController::class, 'create'])->name('meetings.create');
    Route::post('/meetings', [MeetingController::class, 'store'])->name('meetings.store');
    Route::get('/meetings/{meeting}', [MeetingController::class, 'show'])->name('meetings.show');

    // Meeting actions
    Route::post('/meetings/{meeting}/start', [MeetingController::class, 'start'])->name('meetings.start');
    Route::post('/meetings/{meeting}/end', [MeetingController::class, 'end'])->name('meetings.end');
    Route::post('/meetings/{meeting}/leave', [MeetingController::class, 'leave'])->name('meetings.leave');
    Route::post('/meetings/{meeting}/join', [MeetingController::class, 'joinMeeting'])->name('meetings.join-direct');

    // WebRTC status updates
    Route::post('/meetings/{meeting}/audio', [MeetingController::class, 'updateAudio'])->name('meetings.update-audio');
    Route::post('/meetings/{meeting}/video', [MeetingController::class, 'updateVideo'])->name('meetings.update-video');

    // Participant management
    Route::post('/meetings/{meeting}/remove-participant', [MeetingController::class, 'removeParticipant'])->name('meetings.remove-participant');
    Route::post('/meetings/{meeting}/mute-participant', [MeetingController::class, 'muteParticipant'])->name('meetings.mute-participant');
    Route::get('/meetings/{meeting}/participants', [MeetingController::class, 'participants'])->name('meetings.participants');

    // Meeting links
    Route::post('/meetings/{meeting}/regenerate-links', [MeetingController::class, 'regenerateLinks'])->name('meetings.regenerate-links');

    // Join meeting via token
    Route::get('/meetings/join/{token}', [MeetingController::class, 'join'])->name('meetings.join');

    // Chat routes
    Route::delete('/meetings/{meeting}/chat/{message}', [MeetingChatMessageController::class, 'destroy'])->name('meetings.chat.destroy');
    Route::get('/meetings/{meeting}/chat/history', [MeetingChatMessageController::class, 'history'])->name('meetings.chat.history');
    Route::post('/meetings/{meeting}/messages', [MeetingChatMessageController::class, 'store'])->name('meetings.messages.send');
    Route::get('/meetings/{meeting}/messages', [MeetingChatMessageController::class, 'index'])->name('meetings.messages.index');
    Route::delete('/meetings/{meeting}/messages/{message}', [MeetingChatMessageController::class, 'deleteMessage'])->name('meetings.messages.delete');
    Route::post('/meetings/{meeting}/messages/{message}/emoji', [MeetingChatMessageController::class, 'addEmoji'])->name('meetings.messages.emoji');
    Route::post('/meetings/{meeting}/emoji', [MeetingChatMessageController::class, 'sendEmoji'])->name('meetings.emoji.send');

    // Recording routes
    Route::get('/meetings/{meeting}/recordings', [RecordingController::class, 'index'])->name('meetings.recordings.index');
    Route::post('/meetings/{meeting}/recordings', [RecordingController::class, 'store'])->name('meetings.recordings.store');
    Route::get('/recordings/{recording}', [RecordingController::class, 'show'])->name('recordings.show');
    Route::get('/recordings/{recording}/download', [RecordingController::class, 'download'])->name('recordings.download');
    Route::get('/recordings/{recording}/stream', [RecordingController::class, 'stream'])->name('recordings.stream');
    Route::delete('/recordings/{recording}', [RecordingController::class, 'destroy'])->name('recordings.destroy');
    Route::get('/recordings/{recording}/progress', [RecordingController::class, 'uploadProgress'])->name('recordings.progress');
});

// Plaid Verification routes
Route::middleware(['auth'])->group(function () {
    Route::get('/verification/ownership', [PlaidVerificationController::class, 'show'])->name('verification.ownership');
    Route::get('/verification/results', [PlaidVerificationController::class, 'results'])->name('verification.results');
    Route::post('/verification/download-certificate', [PlaidVerificationController::class, 'downloadCertificate'])->name('verification.download-certificate');
    Route::post('/verification/retry', [PlaidVerificationController::class, 'retry'])->name('verification.retry');
});

// Plaid API routes
Route::middleware(['auth'])->prefix('api/plaid')->group(function () {
    Route::post('/create-link-token', [PlaidVerificationController::class, 'createLinkToken']);
    Route::post('/exchange-token', [PlaidVerificationController::class, 'exchangeToken']);
    Route::post('/verify-ownership', [PlaidVerificationController::class, 'verifyOwnership']);
});

// Plaid webhook (no auth required)
Route::post('/api/plaid/webhook', function () {
    // Handle Plaid webhooks
    return response()->json(['status' => 'success']);
});


Route::middleware(['auth', 'verified'])->group(function () {
    // NodeShare routes
    Route::resource('node-shares', NodeShareController::class);

    // NodeSell routes
    Route::resource('node-sells', NodeSellController::class);

    // Buy share routes

    Route::get('/node-boss/{nodeBoss}/buy', [NodeSellController::class, 'buy'])->name('node-boss.buy');
    Route::post('/node-share/purchase', [NodeSellController::class, 'store'])->name('node-share.store');

    // Payment success/cancel routes
    Route::get('/node-share/success', [NodeSellController::class, 'success'])->name('node-share.success');
    Route::get('/node-share/cancel', [NodeSellController::class, 'cancel'])->name('node-share.cancel');

    // Certificate routes
    Route::get('/certificate/{nodeSell}', [NodeSellController::class, 'certificate'])->name('certificate.show');
    Route::post('/certificate/{nodeSell}/email', [NodeSellController::class, 'emailCertificate'])->name('certificate.email');
    Route::get('/certificate/{nodeSell}/download', [NodeSellController::class, 'downloadCertificate'])->name('certificate.download');

    // User shares
    Route::get('/my-shares', [NodeSellController::class, 'myShares'])->name('my-shares');

    //comission withdrawls
    Route::post('/withrawl/request', [WithdrawalController::class, 'store'])->name("withdrawl.request");
});


// route for donation
Route::middleware(['auth', 'verified'])->group(function () {
    Route::post('/donate', [DonationController::class, 'store'])->name('donations.store');
    Route::get('/donations/success', [DonationController::class, 'success'])->name('donations.success');
    Route::get('/donations/cancel', [DonationController::class, 'cancel'])->name('donations.cancel');
});



require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
