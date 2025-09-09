<?php

use App\Http\Controllers\PaymentMethodSettingController;
use App\Http\Controllers\JobPositionController;
use App\Http\Controllers\JobPostController;
use App\Http\Controllers\NodeBossController;
use App\Http\Controllers\NodeReferralController;
use App\Http\Controllers\PositionCategoryController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\TestMeetingController;
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
use App\Http\Controllers\NteeCodeController;
use App\Http\Controllers\CourseController;
use App\Http\Controllers\EnrollmentController;
use App\Http\Controllers\JobApplicationController;
use App\Http\Controllers\JobsController;
use App\Http\Controllers\NodeSellController;
use App\Http\Controllers\NodeShareController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\WithdrawalController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\FrontendCourseController;
use App\Http\Controllers\GoogleAuthController;
use App\Http\Controllers\MeetingChatMessageController;
use App\Http\Controllers\MeetingController;
use App\Http\Controllers\NonprofitNewsController;
use App\Http\Controllers\OwnershipVerificationController;
use App\Http\Controllers\PlaidVerificationController;
use App\Http\Controllers\RecordingController;
use App\Http\Controllers\TopicController;
use App\Http\Controllers\SocialMediaController;
use App\Http\Controllers\RaffleController;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Http;

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

Route::get('/nonprofit-news', [NonprofitNewsController::class, 'index'])
    ->name('nonprofit.news');

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

Route::resource('/chat-group-topics', ChatTopicController::class)->only(['index', 'store', 'update', 'destroy'])->middleware([
    'index' => 'permission:communication.read',
    'store' => 'permission:communication.create',
    'update' => 'permission:communication.update',
    'destroy' => 'permission:communication.delete'
]);

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
    Route::get('/topics', [ChatController::class, 'getTopics'])->name('get-topics');

    Route::get('/user/topics', [DashboardController::class, 'getUserTopic']);
    Route::delete('/user/topics/{topic}', [DashboardController::class, 'destroyUserTopic']);
});

// Raffle Payment Routes (must come before admin routes to avoid conflicts)
Route::middleware(['web', 'auth', 'verified'])->group(function () {
    Route::get('/raffles/success', [App\Http\Controllers\RaffleController::class, 'success'])->name('raffles.success');
    Route::get('/raffles/cancel', [App\Http\Controllers\RaffleController::class, 'cancel'])->name('raffles.cancel');
});

Route::middleware(['auth', 'verified', 'role:organization|admin', 'topics.selected'])->group(function () {
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
    Route::resource('classification-codes', ClassificationCodeController::class)->except(['show'])->middleware([
        'index' => 'permission:classification.code.read',
        'create' => 'permission:classification.code.create',
        'store' => 'permission:classification.code.create',
        'edit' => 'permission:classification.code.edit',
        'update' => 'permission:classification.code.update',
        'destroy' => 'permission:classification.code.delete'
    ]);

    // NTEE Codes Routes
    Route::resource('ntee-codes', NteeCodeController::class)->except(['show'])->middleware([
        'index' => 'permission:ntee.code.read',
        'create' => 'permission:ntee.code.create',
        'store' => 'permission:ntee.code.create',
        'edit' => 'permission:ntee.code.edit',
        'update' => 'permission:ntee.code.update',
        'destroy' => 'permission:ntee.code.delete'
    ]);

    // Status Codes Routes
    Route::resource('status-codes', StatusCodeController::class)->except(['show'])->middleware([
        'index' => 'permission:status.code.read',
        'create' => 'permission:status.code.create',
        'store' => 'permission:status.code.create',
        'edit' => 'permission:status.code.edit',
        'update' => 'permission:status.code.update',
        'destroy' => 'permission:status.code.delete'
    ]);

    // Deductibility Codes Routes
    Route::resource('deductibility-codes', DeductibilityCodeController::class)->except(['show'])->middleware([
        'index' => 'permission:deductibility.code.read',
        'create' => 'permission:deductibility.code.create',
        'store' => 'permission:deductibility.code.create',
        'edit' => 'permission:deductibility.code.edit',
        'update' => 'permission:deductibility.code.update',
        'destroy' => 'permission:deductibility.code.delete'
    ]);

    /* Product Routes */
    Route::resource('products', ProductController::class)->except(['show'])->middleware([
        'index' => 'permission:product.read',
        'create' => 'permission:product.create',
        'store' => 'permission:product.create',
        'edit' => 'permission:product.edit',
        'update' => 'permission:product.update',
        'destroy' => 'permission:product.delete'
    ]);

    /* Category Routes */
    Route::resource('categories', CategoryController::class)->except(['show'])->middleware([
        'index' => 'permission:category.read',
        'create' => 'permission:category.create',
        'store' => 'permission:category.create',
        'edit' => 'permission:category.edit',
        'update' => 'permission:category.update',
        'destroy' => 'permission:category.delete'
    ]);

    /* Raffle Routes */
    Route::resource('raffles', RaffleController::class)->middleware([
        'index' => 'permission:raffle.read',
        'create' => 'permission:raffle.create',
        'store' => 'permission:raffle.create',
        'show' => 'permission:raffle.read',
        'edit' => 'permission:raffle.edit',
        'update' => 'permission:raffle.edit',
        'destroy' => 'permission:raffle.delete'
    ]);

    Route::post('raffles/{raffle}/purchase', [RaffleController::class, 'purchaseTickets'])->name('raffles.purchase')->middleware('permission:raffle.purchase');
    Route::post('raffles/{raffle}/draw', [RaffleController::class, 'drawWinners'])->name('raffles.draw')->middleware('permission:raffle.draw');
    Route::get('raffles/tickets/{ticket}/qr-code', [RaffleController::class, 'generateTicketQrCode'])->name('raffles.ticket.qr-code')->middleware('permission:raffle.read');
    Route::get('raffles/tickets/{ticket}/verify', [RaffleController::class, 'verifyTicket'])->name('raffles.verify-ticket')->middleware('permission:raffle.read');

    Route::resource("position-categories", PositionCategoryController::class)->except(['show'])->middleware([
        'index' => 'permission:job.position.categories.read',
        'create' => 'permission:job.position.categories.create',
        'store' => 'permission:job.position.categories.create',
        'edit' => 'permission:job.position.categories.edit',
        'update' => 'permission:job.position.categories.update',
        'destroy' => 'permission:job.position.categories.delete'
    ]);

    Route::resource("job-positions", JobPositionController::class)->except(['show'])->middleware([
        'index' => 'permission:job.positions.read',
        'create' => 'permission:job.positions.create',
        'store' => 'permission:job.positions.create',
        'edit' => 'permission:job.positions.edit',
        'update' => 'permission:job.positions.update',
        'destroy' => 'permission:job.positions.delete'
    ]);

    Route::resource('job-posts', JobPostController::class)->middleware([
        'index' => 'permission:job.posts.read',
        'create' => 'permission:job.posts.create',
        'store' => 'permission:job.posts.create',
        'show' => 'permission:job.posts.read',
        'edit' => 'permission:job.posts.edit',
        'update' => 'permission:job.posts.update',
        'destroy' => 'permission:job.posts.delete'
    ]);

    // job applications routes
    Route::resource('job-applications', JobApplicationController::class)->middleware([
        'index' => 'permission:job.posts.read',
        'create' => 'permission:job.posts.read',
        'store' => 'permission:job.posts.read',
        'show' => 'permission:job.posts.read',
        'edit' => 'permission:job.posts.read',
        'update' => 'permission:job.posts.read',
        'destroy' => 'permission:job.posts.read'
    ]);
    Route::put('job-applications/{jobApplication}/update-status', [JobApplicationController::class, 'updateStatus'])
        ->name('job-applications.update-status')
        ->middleware(['role:organization', 'permission:job.posts.read']);

    // Events Routes
    Route::resource('events', EventController::class)->middleware([
        'index' => 'permission:event.read',
        'create' => 'permission:event.create',
        'store' => 'permission:event.create',
        'show' => 'permission:event.read',
        'edit' => 'permission:event.edit',
        'update' => 'permission:event.update',
        'destroy' => 'permission:event.delete'
    ]);
    Route::get('/events/{event}/update-status', [EventController::class, 'updateStatus'])
        ->name('events.update-status')
        ->middleware('permission:event.update');
    Route::get('/api/events/dashboard', [EventController::class, 'dashboard'])
        ->name('events.dashboard')
        ->middleware('permission:event.read');

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
    Route::resource('deductibility-codes', DeductibilityCodeController::class)->except(['show'])->middleware([
        'index' => 'permission:deductibility.code.read',
        'create' => 'permission:deductibility.code.create',
        'store' => 'permission:deductibility.code.create',
        'edit' => 'permission:deductibility.code.edit',
        'update' => 'permission:deductibility.code.update',
        'destroy' => 'permission:deductibility.code.delete'
    ]);



    /* orders Routes */
    Route::resource('orders', OrderController::class)->middleware([
        'index' => 'permission:ecommerce.read',
        'create' => 'permission:ecommerce.create',
        'store' => 'permission:ecommerce.create',
        'show' => 'permission:ecommerce.read',
        'edit' => 'permission:ecommerce.edit',
        'update' => 'permission:ecommerce.update',
        'destroy' => 'permission:ecommerce.delete'
    ]);
    // Purchase Order Routes
    Route::get('/purchase-orders', [PurchaseController::class, 'index'])->name('purchase-orders.index')->middleware('permission:ecommerce.read');
    Route::get('/purchase-orders/create', [PurchaseController::class, 'create'])->name('purchase-orders.create')->middleware('permission:ecommerce.create');
    Route::post('/purchase-orders', [PurchaseController::class, 'store'])->name('purchase-orders.store')->middleware('permission:ecommerce.create');
    Route::get('/purchase-orders/{id}/edit', [PurchaseController::class, 'edit'])->name('purchase-orders.edit')->middleware('permission:ecommerce.edit');
    Route::put('/purchase-orders/{id}', [PurchaseController::class, 'update'])->name('purchase-orders.update')->middleware('permission:ecommerce.update');
    Route::delete('/purchase-orders/{id}', [PurchaseController::class, 'destroy'])->name('purchase-orders.destroy')->middleware('permission:ecommerce.delete');

    // Node Boss Routes
    Route::get('/node-boss/create', [NodeBossController::class, 'create'])->name('node-boss.create')->middleware('permission:node.referral.create');
    Route::post('/node-boss/store', [NodeBossController::class, 'store'])->name('node-boss.store')->middleware('permission:node.referral.create');
    Route::get('/node-boss/{id}/edit', [NodeBossController::class, 'edit'])->name('node-boss.edit')->middleware('permission:node.referral.edit');
    Route::put('/node-boss/{id}', [NodeBossController::class, 'update'])->name('node-boss.update')->middleware('permission:node.referral.update');
    Route::delete('/node-boss/{id}', [NodeBossController::class, 'destroy'])->name('node-boss.destroy')->middleware('permission:node.referral.delete');
    Route::get('/node-boss', [NodeBossController::class, 'index'])->name('node-boss.index')->middleware('permission:node.referral.read');
    Route::get('/node-boss/{id}', [NodeBossController::class, 'show'])->name('node-boss.show')->middleware('permission:node.referral.read');

    //node boss referral
    Route::resource('node-referral', NodeReferralController::class)->middleware([
        'index' => 'permission:node.referral.read',
        'create' => 'permission:node.referral.create',
        'store' => 'permission:node.referral.create',
        'show' => 'permission:node.referral.read',
        'edit' => 'permission:node.referral.edit',
        'update' => 'permission:node.referral.update',
        'destroy' => 'permission:node.referral.delete'
    ]);

    // New Withdrawal resource routes
    Route::resource('withdrawals', WithdrawalController::class)->middleware([
        'index' => 'permission:withdrawal.read',
        'create' => 'permission:withdrawal.create',
        'store' => 'permission:withdrawal.create',
        'show' => 'permission:withdrawal.read',
        'edit' => 'permission:withdrawal.edit',
        'update' => 'permission:withdrawal.update',
        'destroy' => 'permission:withdrawal.delete'
    ]);

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
Route::middleware(['auth', 'topics.selected'])->group(function () {
    Route::get('/courses/{course:slug}/enroll', [EnrollmentController::class, 'show'])->name('courses.enroll');
    Route::post('/courses/{course:slug}/enroll', [EnrollmentController::class, 'store'])->name('courses.enroll.store');
    Route::post('/courses/{course:slug}/cancel', [EnrollmentController::class, 'cancel'])->name('courses.cancel');
    Route::post('/courses/{course:slug}/refund', [EnrollmentController::class, 'refund'])->name('courses.refund');
    Route::get('/courses/enrollment/success', [EnrollmentController::class, 'success'])->name('courses.enrollment.success');
    Route::get('/courses/enrollment/cancel/{enrollment}', [EnrollmentController::class, 'cancel'])->name('courses.enrollment.cancel');
    Route::get('/profile/my-enrollments', [EnrollmentController::class, 'myEnrollments'])->name('enrollments.my');
    Route::get('/profile/course', [FrontendCourseController::class, 'adminIndex'])->name('profile.course.index');
    Route::get('/profile/course/create', [FrontendCourseController::class, 'create'])->name('profile.course.create')->middleware('permission:course.create');
    Route::post('/profile/course', [FrontendCourseController::class, 'store'])->name('profile.course.store')->middleware('permission:course.create');
    Route::get('/profile/course/{course:slug}', [FrontendCourseController::class, 'adminShow'])->name('profile.course.show')->middleware('permission:course.read'); // Added this line
    Route::get('/profile/course/{course:slug}/edit', [FrontendCourseController::class, 'edit'])->name('profile.course.edit')->middleware('permission:course.edit');

    // Frontend User Events Routes
    Route::get('/profile/events', [EventController::class, 'userEvents'])->name('profile.events.index')->middleware('permission:event.read');
    Route::get('/profile/events/create', [EventController::class, 'userCreate'])->name('profile.events.create')->middleware('permission:event.create');
    Route::post('/profile/events', [EventController::class, 'userStore'])->name('profile.events.store')->middleware('permission:event.create');
    Route::get('/profile/events/{event}', [EventController::class, 'userShow'])->name('profile.events.show')->middleware('permission:event.read');
    Route::get('/profile/events/{event}/edit', [EventController::class, 'userEdit'])->name('profile.events.edit')->middleware('permission:event.edit');
    Route::put('/profile/events/{event}', [EventController::class, 'userUpdate'])->name('profile.events.update')->middleware('permission:event.update');
    Route::delete('/profile/events/{event}', [EventController::class, 'userDestroy'])->name('profile.events.destroy')->middleware('permission:event.delete');

    // Frontend User Raffle Tickets Routes
    Route::get('/profile/raffle-tickets', [UserProfileController::class, 'raffleTickets'])->name('profile.raffle-tickets.index');

    Route::put('/profile/course/{course:slug}', [FrontendCourseController::class, 'update'])->name('profile.course.update')->middleware('permission:course.update');
    Route::delete('/profile/course/{course:slug}', [FrontendCourseController::class, 'destroy'])->name('profile.course.destroy')->middleware('permission:course.delete');
});
Route::middleware(['auth', 'verified', 'topics.selected'])->group(function () {
    // Admin Course Management Routes
    Route::prefix('admin/courses')->name('admin.courses.')->group(function () {
        Route::get('/', [CourseController::class, 'adminIndex'])->name('index')->middleware('permission:course.read');
        Route::get('/create', [CourseController::class, 'create'])->name('create')->middleware('permission:course.create');
        Route::post('/', [CourseController::class, 'store'])->name('store')->middleware('permission:course.create');
        Route::get('/{course:slug}', [CourseController::class, 'adminShow'])->name('show')->middleware('permission:course.read');
        Route::get('/{course:slug}/edit', [CourseController::class, 'edit'])->name('edit')->middleware('permission:course.edit');
        Route::put('/{course:slug}', [CourseController::class, 'update'])->name('update')->middleware('permission:course.update');
        Route::delete('/{course:slug}', [CourseController::class, 'destroy'])->name('destroy')->middleware('permission:course.delete');
    });

    // Topic Management Routes (Admin Only)
    Route::resource('topics', TopicController::class)->only(['index', 'store', 'update', 'destroy'])->middleware([
        'index' => 'permission:topic.read',
        'store' => 'permission:topic.create',
        'update' => 'permission:topic.update',
        'destroy' => 'permission:topic.delete'
    ]);
});

// Plaid Verification routes
Route::middleware(['auth', 'topics.selected'])->group(function () {
    Route::get('/verification/ownership', [PlaidVerificationController::class, 'show'])->name('verification.ownership');
    Route::get('/verification/results', [PlaidVerificationController::class, 'results'])->name('verification.results');
    Route::post('/verification/download-certificate', [PlaidVerificationController::class, 'downloadCertificate'])->name('verification.download-certificate');
    Route::post('/verification/retry', [PlaidVerificationController::class, 'retry'])->name('verification.retry');
});

// Plaid API routes
Route::middleware(['auth', 'topics.selected'])->prefix('api/plaid')->group(function () {
    Route::post('/create-link-token', [PlaidVerificationController::class, 'createLinkToken']);
    Route::post('/exchange-token', [PlaidVerificationController::class, 'exchangeToken']);
    Route::post('/verify-ownership', [PlaidVerificationController::class, 'verifyOwnership']);
});

// Plaid webhook (no auth required)
Route::post('/api/plaid/webhook', function () {
    // Handle Plaid webhooks
    return response()->json(['status' => 'success']);
});


Route::middleware(['auth', 'verified', 'topics.selected'])->group(function () {
    // NodeShare routes
    Route::resource('node-shares', NodeShareController::class)->middleware([
        'index' => 'permission:node.referral.read',
        'create' => 'permission:node.referral.create',
        'store' => 'permission:node.referral.create',
        'show' => 'permission:node.referral.read',
        'edit' => 'permission:node.referral.edit',
        'update' => 'permission:node.referral.update',
        'destroy' => 'permission:node.referral.delete'
    ]);

    // NodeSell routes
    Route::resource('node-sells', NodeSellController::class)->middleware([
        'index' => 'permission:node.referral.read',
        'create' => 'permission:node.referral.create',
        'store' => 'permission:node.referral.create',
        'show' => 'permission:node.referral.read',
        'edit' => 'permission:node.referral.edit',
        'update' => 'permission:node.referral.update',
        'destroy' => 'permission:node.referral.delete'
    ]);

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

    // Social Media Management Routes
    Route::prefix('social-media')->name('social-media.')->group(function () {
        Route::get('/', [SocialMediaController::class, 'index'])->name('index');
        Route::post('/accounts', [SocialMediaController::class, 'storeAccount'])->name('accounts.store');
        Route::put('/accounts/{account}', [SocialMediaController::class, 'updateAccount'])->name('accounts.update');
        Route::delete('/accounts/{account}', [SocialMediaController::class, 'deleteAccount'])->name('accounts.delete');
        Route::post('/posts', [SocialMediaController::class, 'storePost'])->name('posts.store');
        Route::put('/posts/{post}', [SocialMediaController::class, 'updatePost'])->name('posts.update');
        Route::delete('/posts/{post}', [SocialMediaController::class, 'deletePost'])->name('posts.delete');
        Route::post('/posts/{post}/publish', [SocialMediaController::class, 'publishPost'])->name('posts.publish');
        Route::get('/accounts/{account}/posts', [SocialMediaController::class, 'getPostsByAccount'])->name('accounts.posts');
        Route::get('/posts/{post}/analytics', [SocialMediaController::class, 'getPostAnalytics'])->name('posts.analytics');
    });
});


// route for donation
Route::middleware(['auth', 'verified', 'topics.selected'])->group(function () {
    Route::post('/donate', [DonationController::class, 'store'])->name('donations.store');
    Route::get('/donations/success', [DonationController::class, 'success'])->name('donations.success');
    Route::get('/donations/cancel', [DonationController::class, 'cancel'])->name('donations.cancel');
});

// IRS BMF Management Routes
Route::prefix('irs-bmf')->name('irs-bmf.')->group(function () {
    Route::get('/', [App\Http\Controllers\IrsBmfController::class, 'index'])->name('index');
    Route::get('/search', [App\Http\Controllers\IrsBmfController::class, 'search'])->name('search');
    Route::get('/{record}', [App\Http\Controllers\IrsBmfController::class, 'show'])->name('show');
    Route::post('/import', [App\Http\Controllers\IrsBmfController::class, 'triggerImport'])->name('import');
});

// Frontend Raffle Routes (for users to browse and purchase)
// Public QR Code Route (no authentication required)
Route::get('/raffles/tickets/{ticket}/qr-code', [App\Http\Controllers\RaffleController::class, 'generateTicketQrCode'])->name('raffles.ticket.qr-code.public');

// Public QR Code Verification Route (no authentication required)
Route::get('/raffles/tickets/{ticket}/verify', [App\Http\Controllers\RaffleController::class, 'verifyTicket'])->name('raffles.verify-ticket.public');

// Test QR Code Route
Route::get('/test-qr', function() {
    $qrCode = \SimpleSoftwareIO\QrCode\Facades\QrCode::format('png')
        ->size(200)
        ->margin(2)
        ->color(0, 0, 0)
        ->backgroundColor(255, 255, 255)
        ->generate('TEST QR CODE WORKING');
    
    return response($qrCode, 200, [
        'Content-Type' => 'image/png',
        'Cache-Control' => 'no-cache, no-store, must-revalidate',
        'Pragma' => 'no-cache',
        'Expires' => '0'
    ]);
});

Route::middleware(['web', 'auth', 'verified'])->prefix('frontend')->name('frontend.')->group(function () {
    Route::get('/raffles', [App\Http\Controllers\RaffleController::class, 'frontendIndex'])->name('raffles.index');
    Route::get('/raffles/{raffle}', [App\Http\Controllers\RaffleController::class, 'frontendShow'])->name('raffles.show');
    Route::post('/raffles/{raffle}/purchase', [App\Http\Controllers\RaffleController::class, 'purchaseTickets'])->name('raffles.purchase');
});


require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
