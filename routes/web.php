<?php

use App\Http\Controllers\AiCampaignController;
use App\Http\Controllers\AiChatController;
use App\Http\Controllers\AboutPageController;
use App\Http\Controllers\AdminAboutPageController;
use App\Http\Controllers\Admin\SeoController as AdminSeoController;
use App\Http\Controllers\BoardMemberController;
use App\Http\Controllers\CampaignController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\ExcelDataController;
use App\Http\Controllers\ExcelDataExportController;
use App\Http\Controllers\Facebook\PostController;
use App\Http\Controllers\PaymentMethodSettingController;
use App\Http\Controllers\JobPositionController;
use App\Http\Controllers\JobPostController;
use App\Http\Controllers\NodeBossController;
use App\Http\Controllers\NodeReferralController;
use App\Http\Controllers\PositionCategoryController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\PwaInstallController;
use App\Http\Controllers\TestMeetingController;
use App\Http\Controllers\WalletController;
use App\Http\Controllers\UsersInterestedTopicsController;
use App\Http\Controllers\ComplianceApplicationController;
use App\Http\Controllers\Form1023ApplicationController;
use App\Http\Controllers\Admin\ComplianceApplicationController as AdminComplianceApplicationController;
use App\Http\Controllers\Admin\Form1023ApplicationController as AdminForm1023ApplicationController;
use App\Http\Controllers\Admin\FeesController;
use App\Http\Controllers\Admin\RewardPointController;
use App\Http\Controllers\Admin\ServiceSellerController;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\SitemapController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use PhpOffice\PhpSpreadsheet\Worksheet\Row;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\ChatTopicController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\DonationController;
use App\Http\Controllers\FundMeCampaignController;
use App\Http\Controllers\FundMeController;
use App\Http\Controllers\FundMeDonationController;
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
use App\Http\Controllers\ContentItemController;
use App\Http\Controllers\NteeCodeController;
use App\Http\Controllers\CourseController;
use App\Http\Controllers\EnrollmentController;
use App\Http\Controllers\JobApplicationController;
use App\Http\Controllers\VolunteerController;
use App\Http\Controllers\VolunteerTimesheetController;
use App\Http\Controllers\JobsController;
use App\Http\Controllers\NodeSellController;
use App\Http\Controllers\NodeShareController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\WithdrawalController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\NewsletterController;
use App\Http\Controllers\FrontendCourseController;
use App\Http\Controllers\GoogleAuthController;
use App\Http\Controllers\MeetingChatMessageController;
use App\Http\Controllers\MeetingController;
use App\Http\Controllers\NonprofitNewsController;
use App\Http\Controllers\CommunityVideosController;
use App\Http\Controllers\CommunityVideoEngagementController;
use App\Http\Controllers\SavedNewsController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OwnershipVerificationController;
use App\Http\Controllers\PlaidVerificationController;
use App\Http\Controllers\PushTokenController;
use App\Http\Controllers\RecordingController;
use App\Http\Controllers\TopicController;
use App\Http\Controllers\SocialMediaController;
use App\Http\Controllers\IntegrationsController;
use App\Http\Controllers\RaffleController;
use App\Http\Controllers\CreditPurchaseController;
use App\Http\Controllers\Facebook\AuthController;
use App\Http\Controllers\Facebook\ConfigurationController;
use App\Http\Controllers\FacebookAppController;
use App\Http\Controllers\OrderItemController;
use App\Http\Controllers\FollowerController;
use App\Http\Controllers\PrintifyProductController;
use App\Http\Controllers\PrintifyWebhookController;
use App\Http\Controllers\ServiceHubController;
use App\Http\Controllers\WebhookManagementController;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Http;

// ============================================
// MERCHANT DOMAIN ROUTES - MUST BE FIRST
// ============================================
// Load merchant routes only when accessing merchant domain
// This must be before all other routes to take precedence
Route::domain(config('merchant.domain'))->group(function () {
    require __DIR__ . '/merchant.php';
});

// ============================================
// LIVESTOCK DOMAIN ROUTES
// ============================================
// Load livestock routes only when accessing livestock domain
Route::domain(config('livestock.domain'))->group(function () {
    require __DIR__ . '/livestock.php';
});

// Route::get('/test-broadcast', function () {
//     $message = App\Models\ChatMessage::first();
//     event(new App\Events\MessageSent($message));
//     return "Event fired for message: " . $message;
// });

Broadcast::routes(['middleware' => ['auth']]);

// ============================================
// MAIN APP ROUTES - Only accessible on main domain (not livestock domain)
// ============================================
// These routes are automatically excluded from livestock domain because
// livestock routes are defined with Route::domain() above.
// Routes without Route::domain() only work on the main domain.
Route::get('/', [HomeController::class, "index"])->name('home');

// SEO: sitemap and robots
Route::get('/sitemap.xml', [SitemapController::class, 'index'])->name('sitemap');
Route::get('/robots.txt', function () {
    $url = rtrim(config('app.url'), '/');
    return response("User-agent: *\nDisallow:\n\nSitemap: {$url}/sitemap.xml\n", 200, [
        'Content-Type' => 'text/plain',
    ]);
})->name('robots');

// Social Media Feed Routes
Route::middleware(['auth', 'EnsureEmailIsVerified'])->group(function () {
    Route::get('/social-feed', [\App\Http\Controllers\PostController::class, 'index'])->name('social-feed.index');
    Route::get('/find-supporters', [\App\Http\Controllers\FindSupportersController::class, 'index'])->name('find-supporters.index');
    Route::get('/search', [\App\Http\Controllers\PostController::class, 'searchPage'])->name('search.index');
    Route::get('/social-feed/search', [\App\Http\Controllers\PostController::class, 'search'])->name('social-feed.search');
    // Toggle favorite organization - allow any authenticated user (controller rejects org role with friendly message)
    Route::post('/organizations/{id}/toggle-favorite', [\App\Http\Controllers\OrganizationController::class, 'toggleFavorite'])->name('organizations.toggle-favorite-search');
    Route::post('/organizations/{id}/toggle-favorite', [\App\Http\Controllers\OrganizationController::class, 'toggleFavorite'])->name('user.organizations.toggle-favorite');
    Route::post('/organizations/{id}/toggle-favorite', [\App\Http\Controllers\OrganizationController::class, 'toggleFavorite'])->name('organizations.toggle-favorite');
    // GET fallback: if user hits toggle-favorite with GET (e.g. refresh/back), redirect to organization page
    Route::get('/organizations/{id}/toggle-favorite', function (string $id) {
        return redirect()->route('organizations.show', $id);
    })->name('organizations.toggle-favorite.get');
    Route::post('/posts', [\App\Http\Controllers\PostController::class, 'store'])->name('posts.store');
    Route::put('/posts/{post}', [\App\Http\Controllers\PostController::class, 'update'])->name('posts.update');
    Route::delete('/posts/{post}', [\App\Http\Controllers\PostController::class, 'destroy'])->name('posts.destroy');
    Route::post('/posts/{post}/react', [\App\Http\Controllers\PostController::class, 'react'])->name('posts.react');
    Route::delete('/posts/{post}/reaction', [\App\Http\Controllers\PostController::class, 'removeReaction'])->name('posts.remove-reaction');
    Route::post('/posts/{post}/comment', [\App\Http\Controllers\PostController::class, 'comment'])->name('posts.comment');
    Route::get('/posts/{post}/comments', [\App\Http\Controllers\PostController::class, 'getComments'])->name('posts.comments');
    Route::post('/posts/{post}/seen', [\App\Http\Controllers\PostController::class, 'markAsSeen'])->name('posts.mark-seen');
    Route::delete('/comments/{comment}', [\App\Http\Controllers\PostController::class, 'deleteComment'])->name('comments.destroy');
});

Route::get("pwa-setup", function () {
    return Inertia::render('pwa-setup/page');
})->name('pwa.install');
Route::get('/pwa/install-qr', [PwaInstallController::class, 'installQr'])->name('pwa.install-qr');

Route::get('/about', \App\Http\Controllers\AboutPageController::class)->name('about');

Route::get('/privacy-policy', function () {
    return Inertia::render('frontend/PrivacyPolicy');
})->name('privacy.policy');

Route::get('/terms-of-service', function () {
    return Inertia::render('frontend/TermsOfService');
})->name('terms.service');

Route::get('/contact', [App\Http\Controllers\ContactController::class, 'index'])->name('contact');
Route::post('/contact', [App\Http\Controllers\ContactController::class, 'store'])->name('contact.store');

Route::middleware(['auth', 'EnsureEmailIsVerified', 'role:admin'])->group(function () {
    Route::get('/admin/about', [AdminAboutPageController::class, 'edit'])->name('admin.about.edit');
    Route::put('/admin/about', [AdminAboutPageController::class, 'update'])->name('admin.about.update');
    Route::get('/admin/seo', [AdminSeoController::class, 'index'])->name('admin.seo.index');
    Route::put('/admin/seo', [AdminSeoController::class, 'update'])->name('admin.seo.update');
});

Route::get('/nonprofit-news', [NonprofitNewsController::class, 'index'])
    ->name('nonprofit.news');
Route::get('/nonprofit-news/saved', [SavedNewsController::class, 'index'])
    ->name('nonprofit.news.saved')
    ->middleware('auth');
Route::post('/nonprofit-news/save/{article}', [SavedNewsController::class, 'toggle'])
    ->name('nonprofit.news.save.toggle')
    ->middleware('auth');

Route::get('/community-videos', [CommunityVideosController::class, 'index'])->name('community-videos.index');
Route::get('/community-videos/channel/{slug}', [CommunityVideosController::class, 'channel'])->name('community-videos.channel');
Route::get('/community-videos/upload', [CommunityVideosController::class, 'upload'])->name('community-videos.upload')->middleware('auth');
// More specific route first so /watch/yt/{id} is not matched by /watch/{slug}
Route::get('/community-videos/watch/yt/{id}', [CommunityVideosController::class, 'showYouTube'])->name('community-videos.show-youtube');
Route::get('/community-videos/shorts/yt/{id}', [CommunityVideosController::class, 'showShort'])->name('community-videos.show-short');
Route::get('/community-videos/watch/{slug}', [CommunityVideosController::class, 'show'])->name('community-videos.show');

Route::post('/community-videos/engagement/like', [CommunityVideoEngagementController::class, 'like'])->name('community-videos.engagement.like')->middleware('auth');
Route::post('/community-videos/engagement/view', [CommunityVideoEngagementController::class, 'view'])->name('community-videos.engagement.view')->middleware('auth');
Route::post('/community-videos/engagement/share', [CommunityVideoEngagementController::class, 'share'])->name('community-videos.engagement.share');
Route::get('/community-videos/engagement/comments', [CommunityVideoEngagementController::class, 'comments'])->name('community-videos.engagement.comments');
Route::post('/community-videos/engagement/comments', [CommunityVideoEngagementController::class, 'comment'])->name('community-videos.engagement.comment')->middleware('auth');

Route::get("/jobs", [JobsController::class, 'index'])->name('jobs.index');
Route::get("/volunteer-opportunities", [JobsController::class, 'volunteerOpportunities'])->name('volunteer-opportunities.index');
Route::get("/jobs/{id}", [JobsController::class, 'show'])->name('jobs.show');
Route::get('/get-job-positions', [JobsController::class, "getJobPositions"])->name('jobs.positions.by-category');

Route::get("/jobs/{id}/apply", [JobsController::class, 'applyShow'])->name('jobs.apply.show');
Route::post("/jobs/{id}/apply", [JobsController::class, 'applyStore'])->name('jobs.apply.store');

Route::get('/nodeboss', [NodeBossController::class, 'frontendIndex'])->name('nodeboss.index');

Route::get('/nodeboss/{id}/buy', [NodeBossController::class, 'frontendShow'])->name('buy.nodeboss');

Route::get('/donate', [DonationController::class, 'index'])->name('donate');

Route::get('/pricing', [App\Http\Controllers\PlansController::class, 'pricing'])->name('pricing');

// Support a Project — public landing: Give (FundMe) or Grow (Invest / Wefunder)
Route::get('/support-a-project', [App\Http\Controllers\FundraiseController::class, 'supportAProject'])->name('support-a-project');

// Public branded funnel: explain → qualify form → redirect to Wefunder (lead capture)
Route::get('/fundraise', [App\Http\Controllers\FundraiseController::class, 'index'])->name('fundraise');
Route::post('/fundraise', [App\Http\Controllers\FundraiseController::class, 'store'])->name('fundraise.store');
// Org-only: Support Community Projects (Donation vs Investment / Wefunder)
Route::get('/fundraise/community-projects', [App\Http\Controllers\FundraiseController::class, 'communityProjects'])->name('fundraise.community-projects')
    ->middleware(['auth', 'EnsureEmailIsVerified', 'role:organization|organization_pending']);

// Believe FundMe – public listing and campaign pages
Route::get('/believe-fundme', [FundMeController::class, 'index'])->name('fundme.index');
// Thank-you route must come before {slug} to avoid route conflict
Route::get('/believe-fundme/thank-you', [FundMeDonationController::class, 'thankYou'])->name('fundme.thank-you')
    ->middleware(['auth', 'EnsureEmailIsVerified']);
Route::post('/believe-fundme/donate', [FundMeDonationController::class, 'store'])->name('fundme.donate.store')
    ->middleware(['auth', 'EnsureEmailIsVerified']);
// Campaign detail page - must come after thank-you to avoid matching it
Route::get('/believe-fundme/{slug}', [FundMeController::class, 'show'])->name('fundme.show')->where('slug', '[a-z0-9\-]+');

/* marketplace */
Route::get('/marketplace', [MarketplaceController::class, 'index'])->name('marketplace.index');
Route::get('/product/{product}', [ProductController::class, 'show'])->name('product.show');
// Note: Public route for products moved after resource routes to avoid conflict with /products/create

/* Service Hub - Fiverr-like service marketplace */
Route::get('/service-hub', [App\Http\Controllers\ServiceHubController::class, 'index'])->name('service-hub.index');
Route::get('/service-hub/create', [App\Http\Controllers\ServiceHubController::class, 'create'])->name('service-hub.create')->middleware(['auth', 'EnsureEmailIsVerified']);
Route::post('/service-hub', [App\Http\Controllers\ServiceHubController::class, 'store'])->name('service-hub.store')->middleware(['auth', 'EnsureEmailIsVerified']);

// Seller Profile Routes
Route::get('/service-hub/seller-dashboard', [App\Http\Controllers\ServiceHubController::class, 'sellerDashboard'])->name('service-hub.seller-dashboard')->middleware(['auth', 'EnsureEmailIsVerified']);
Route::get('/service-hub/seller-profile/create', [App\Http\Controllers\ServiceHubController::class, 'sellerProfileCreate'])->name('service-hub.seller-profile.create')->middleware(['auth', 'EnsureEmailIsVerified']);
Route::post('/service-hub/seller-profile', [App\Http\Controllers\ServiceHubController::class, 'sellerProfileStore'])->name('service-hub.seller-profile.store')->middleware(['auth', 'EnsureEmailIsVerified']);
Route::get('/service-hub/seller-profile/edit', [App\Http\Controllers\ServiceHubController::class, 'sellerProfileEdit'])->name('service-hub.seller-profile.edit')->middleware(['auth', 'EnsureEmailIsVerified']);
Route::post('/service-hub/seller-profile/update', [App\Http\Controllers\ServiceHubController::class, 'sellerProfileUpdate'])->name('service-hub.seller-profile.update')->middleware(['auth', 'EnsureEmailIsVerified']);
Route::get('/service-hub/{slug}/edit', [App\Http\Controllers\ServiceHubController::class, 'edit'])->name('service-hub.edit')->middleware(['auth', 'EnsureEmailIsVerified']);
Route::put('/service-hub/{slug}', [App\Http\Controllers\ServiceHubController::class, 'update'])->name('service-hub.update')->middleware(['auth', 'EnsureEmailIsVerified']);
Route::delete('/service-hub/services/{gig}', [App\Http\Controllers\ServiceHubController::class, 'destroyService'])
    ->name('service-hub.services.destroy')
    ->middleware(['auth', 'EnsureEmailIsVerified']);

Route::post('/service-hub/{slug}/create-offer', [App\Http\Controllers\ServiceHubController::class, 'createCustomOffer'])->name('service-hub.create-offer')->middleware(['auth', 'EnsureEmailIsVerified']);
Route::post('/service-hub/offers/{offerId}/accept', [App\Http\Controllers\ServiceHubController::class, 'acceptCustomOffer'])->name('service-hub.accept-offer')->middleware(['auth', 'EnsureEmailIsVerified']);
Route::post('/service-hub/offers/{offerId}/reject', [App\Http\Controllers\ServiceHubController::class, 'rejectCustomOffer'])->name('service-hub.reject-offer')->middleware(['auth', 'EnsureEmailIsVerified']);
// Keep old URL for backward compatibility
Route::get('/service-hub/order', [App\Http\Controllers\ServiceHubController::class, 'order'])->middleware(['auth', 'EnsureEmailIsVerified']);
// Create order route
Route::get('/service-hub/create-order', [App\Http\Controllers\ServiceHubController::class, 'order'])->name('service-hub.order')->middleware(['auth', 'EnsureEmailIsVerified']);
Route::post('/service-hub/create-order', [App\Http\Controllers\ServiceHubController::class, 'orderStore'])->name('service-hub.order.store')->middleware(['auth', 'EnsureEmailIsVerified']);
// Separate route for Stripe checkout session creation
Route::post('/service-hub/checkout/create-session', [App\Http\Controllers\ServiceHubController::class, 'createCheckoutSession'])->name('service-hub.checkout.create-session')->middleware(['auth', 'EnsureEmailIsVerified']);
Route::post('/service-hub/calculate-fees', [App\Http\Controllers\ServiceHubController::class, 'calculateFees'])->name('service-hub.calculate-fees')->middleware(['auth', 'EnsureEmailIsVerified']);
Route::get('/service-hub/order/success', [App\Http\Controllers\ServiceHubController::class, 'orderSuccess'])->name('service-hub.order.success')->middleware(['auth', 'EnsureEmailIsVerified']);
Route::get('/service-hub/seller/{id}', [App\Http\Controllers\ServiceHubController::class, 'sellerProfile'])->name('service-hub.seller.profile');
Route::get('/service-hub/seller/{id}/reviews', [App\Http\Controllers\ServiceHubController::class, 'sellerReviews'])->name('service-hub.seller.reviews');
Route::get('/service-hub/my-orders', [App\Http\Controllers\ServiceHubController::class, 'myOrders'])->name('service-hub.my-orders')->middleware(['auth', 'EnsureEmailIsVerified']);
Route::get('/service-hub/seller-orders', [App\Http\Controllers\ServiceHubController::class, 'sellerOrders'])->name('service-hub.seller-orders')->middleware(['auth', 'EnsureEmailIsVerified']);
Route::get('/service-hub/orders/{orderId}', [App\Http\Controllers\ServiceHubController::class, 'orderDetail'])->name('service-hub.order.detail')->middleware(['auth', 'EnsureEmailIsVerified']);
Route::post('/service-hub/orders/{orderId}/deliver', [App\Http\Controllers\ServiceHubController::class, 'deliverOrder'])->name('service-hub.order.deliver')->middleware(['auth', 'EnsureEmailIsVerified']);
Route::post('/service-hub/orders/{orderId}/accept-delivery', [App\Http\Controllers\ServiceHubController::class, 'acceptDelivery'])->name('service-hub.order.accept-delivery')->middleware(['auth', 'EnsureEmailIsVerified']);
Route::post('/service-hub/orders/{orderId}/complete', [App\Http\Controllers\ServiceHubController::class, 'completeOrder'])->name('service-hub.order.complete')->middleware(['auth', 'EnsureEmailIsVerified']);
Route::post('/service-hub/orders/{orderId}/approve', [App\Http\Controllers\ServiceHubController::class, 'approveOrder'])->name('service-hub.order.approve')->middleware(['auth', 'EnsureEmailIsVerified']);
Route::post('/service-hub/orders/{orderId}/reject', [App\Http\Controllers\ServiceHubController::class, 'rejectOrder'])->name('service-hub.order.reject')->middleware(['auth', 'EnsureEmailIsVerified']);
Route::post('/service-hub/{slug}/favorite', [App\Http\Controllers\ServiceHubController::class, 'toggleFavorite'])->name('service-hub.favorite')->middleware(['auth', 'EnsureEmailIsVerified']);
Route::post('/service-hub/{slug}/reviews', [App\Http\Controllers\ServiceHubController::class, 'reviewsStore'])->name('service-hub.reviews.store')->middleware(['auth', 'EnsureEmailIsVerified']);
Route::post('/service-hub/orders/{orderId}/seller-review', [App\Http\Controllers\ServiceHubController::class, 'sellerReviewStore'])->name('service-hub.order.seller-review')->middleware(['auth', 'EnsureEmailIsVerified']);
Route::get('/service-hub/test-email', [App\Http\Controllers\ServiceHubController::class, 'testEmailNotifications'])->name('service-hub.test-email')->middleware(['auth', 'EnsureEmailIsVerified']);
Route::get('/service-hub/{slug}/reviews', [App\Http\Controllers\ServiceHubController::class, 'reviews'])->name('service-hub.reviews');
Route::get('/service-hub/{slug}', [App\Http\Controllers\ServiceHubController::class, 'show'])->name('service-hub.show');

// Cancel order route
Route::post('/service-hub/orders/{orderId}/cancel', [ServiceHubController::class, 'cancelOrder'])
    ->name('service-hub.order.cancel')
    ->middleware(['auth', 'EnsureEmailIsVerified']);

// Resubmit delivery route
Route::post('/service-hub/orders/{orderId}/resubmit', [ServiceHubController::class, 'resubmitDelivery'])
    ->name('service-hub.order.resubmit')
    ->middleware(['auth', 'EnsureEmailIsVerified']);

// Get order status info route
Route::get('/service-hub/orders/{orderId}/status-info', [ServiceHubController::class, 'getOrderStatusInfo'])
    ->name('service-hub.order.status-info')
    ->middleware(['auth', 'EnsureEmailIsVerified']);

// Admin seller management routes
Route::prefix('admin')->middleware(['auth', 'role:admin'])->group(function () {
    Route::get('/service-sellers', [ServiceSellerController::class, 'index'])->name('admin.service-sellers.index');
    Route::get('/service-sellers/{id}', [ServiceSellerController::class, 'show'])->name('admin.service-sellers.show');
    Route::post('/service-sellers/{id}/suspend', [ServiceSellerController::class, 'suspend'])->name('admin.service-sellers.suspend');
    Route::post('/service-sellers/{id}/unsuspend', [ServiceSellerController::class, 'unsuspend'])->name('admin.service-sellers.unsuspend');
});

// Service Chat Routes
Route::prefix('service-hub')->middleware(['auth', 'EnsureEmailIsVerified'])->name('service-hub.chat.')->group(function () {
    Route::post('/{slug}/chat', [App\Http\Controllers\ServiceHubController::class, 'createOrGetServiceChat'])->name('create-or-get');
    Route::get('/chat/{chatId}/messagesget', [App\Http\Controllers\ServiceHubController::class, 'getServiceChatMessages'])->name('messages');
    Route::post('/chat/{chatId}/messages', [App\Http\Controllers\ServiceHubController::class, 'sendServiceChatMessage'])->name('send-message');
    Route::get('/chats', [App\Http\Controllers\ServiceHubController::class, 'getServiceChats'])->name('list');
    Route::get('/chats/unreadcountget', [App\Http\Controllers\ServiceHubController::class, 'getUnreadCount'])->name('unread-count');
    Route::get('/chats/list', [App\Http\Controllers\ServiceHubController::class, 'chats'])->name('chats');
});
Route::get('/service-hub/chat/{chatId}', [App\Http\Controllers\ServiceHubController::class, 'serviceChat'])->name('service-hub.chat.show')->middleware(['auth', 'EnsureEmailIsVerified']);

// Cart routes (protected)
// Believe Points Routes (organization_pending cannot access until onboarding complete)
Route::middleware(['auth', 'EnsureEmailIsVerified', 'role:organization|admin|user'])->prefix('believe-points')->name('believe-points.')->group(function () {
    Route::get('/', [App\Http\Controllers\BelievePointController::class, 'index'])->name('index');
    Route::post('/purchase', [App\Http\Controllers\BelievePointController::class, 'purchase'])->name('purchase');
    Route::get('/success', [App\Http\Controllers\BelievePointController::class, 'success'])->name('success');
    Route::get('/cancel', [App\Http\Controllers\BelievePointController::class, 'cancel'])->name('cancel');
    Route::get('/refunds', [App\Http\Controllers\BelievePointController::class, 'refunds'])->name('refunds');
    Route::post('/refunds/{purchaseId}', [App\Http\Controllers\BelievePointController::class, 'refund'])->name('refund');
});

// Merchant Hub Routes (Public - for viewing offers)
Route::prefix('merchant-hub')->name('merchant-hub.')->group(function () {
    Route::get('/', [App\Http\Controllers\MerchantHubOfferController::class, 'index'])->name('index');

    Route::get('/offers/{id}', [App\Http\Controllers\MerchantHubOfferController::class, 'show'])->name('offer.show');
});

// Merchant Hub Redemption Routes (Requires auth)
Route::middleware(['auth', 'EnsureEmailIsVerified'])->prefix('merchant-hub')->name('merchant-hub.')->group(function () {
    Route::post('/redeem', [App\Http\Controllers\MerchantRedemptionController::class, 'redeem'])->name('redeem');
    Route::get('/redemption/confirmed/{code?}', [App\Http\Controllers\MerchantRedemptionController::class, 'confirmed'])->name('redemption.confirmed');
    Route::get('/redemption/verify/{code}', [App\Http\Controllers\MerchantRedemptionController::class, 'verify'])->name('redemption.verify');
});

// Merchant QR verification route (requires merchant auth)
Route::middleware(['auth:merchant'])->prefix('merchant-hub')->name('merchant-hub.')->group(function () {
    Route::post('/redemption/verify-from-qr', [App\Http\Controllers\MerchantRedemptionController::class, 'verifyFromQr'])->name('redemption.verify-from-qr');
});

// Merchant verification route (requires merchant auth for approval)
Route::middleware(['auth:merchant'])->prefix('merchant-hub')->name('merchant-hub.')->group(function () {
    Route::post('/redemption/{code}/mark-used', [App\Http\Controllers\MerchantRedemptionController::class, 'markAsUsed'])->name('redemption.mark-used');
    Route::post('/redemption/{code}/cancel', [App\Http\Controllers\MerchantRedemptionController::class, 'cancelRedemption'])->name('redemption.cancel');
});

// Public QR code route (no auth required - code in URL is sufficient security)
Route::get('/merchant-hub/redemption/qr-code/{code}', [App\Http\Controllers\MerchantRedemptionController::class, 'generateQrCode'])->name('merchant-hub.redemption.qr-code');

// Public verification page route (for merchants scanning QR codes)
Route::get('/merchant-hub/redemption/verify/{code}', [App\Http\Controllers\MerchantRedemptionController::class, 'verifyPage'])->name('merchant-hub.redemption.verify-page');

// Merchant Program Routes
Route::middleware(['auth', 'EnsureEmailIsVerified'])->prefix('merchant')->name('merchant.')->group(function () {
    Route::get('/welcome', function () {
        return Inertia::render('merchant/Welcome');
    })->name('welcome');

    Route::get('/hub', function () {
        return Inertia::render('merchant/Hub');
    })->name('hub');

    Route::get('/earn-points', function () {
        return Inertia::render('merchant/EarnPoints');
    })->name('earn-points');

    Route::get('/offers/{id}', function ($id) {
        return Inertia::render('merchant/OfferDetail', [
            'offer' => null // Replace with actual offer data from backend
        ]);
    })->name('offers.show');

    // Redemption routes
    Route::post('/redeem', [App\Http\Controllers\MerchantRedemptionController::class, 'redeem'])->name('redeem');
    Route::get('/redemption-confirmed/{code?}', [App\Http\Controllers\MerchantRedemptionController::class, 'confirmed'])->name('redemption.confirmed');
    Route::get('/redemption/qr-code/{code}', [App\Http\Controllers\MerchantRedemptionController::class, 'generateQrCode'])->name('redemption.qr-code');
    Route::get('/redemption/verify/{code}', [App\Http\Controllers\MerchantRedemptionController::class, 'verify'])->name('redemption.verify');

    Route::get('/qr-code', function () {
        return Inertia::render('merchant/QRCode');
    })->name('qr-code');

    Route::get('/dashboard', function () {
        return Inertia::render('merchant/Dashboard');
    })->name('dashboard');
});

Route::middleware(['auth', 'EnsureEmailIsVerified'])->group(function () {
    Route::get('/cart', [CartController::class, 'index'])->name('cart.index');
    Route::get('/cart/data', [CartController::class, 'getCartDataApi'])->name('cart.data');
    Route::post('/cart/add', [CartController::class, 'add'])->name('cart.add');
    Route::put('/cart/items/{cartItem}', [CartController::class, 'update'])->name('cart.update');
    Route::delete('/cart/items/{cartItem}', [CartController::class, 'destroy'])->name('cart.destroy');
    Route::post('/cart/clear', [CartController::class, 'clear'])->name('cart.clear');

    // Route::get('/checkout', [CheckoutController::class, 'show'])->name('checkout.show');

    // Route::post('/checkout/payment-intent', [CheckoutController::class, 'createPaymentIntent'])->name('checkout.payment-intent');
    // Route::post('/checkout/confirm', [CheckoutController::class, 'confirmPayment'])->name('checkout.confirm');
    // Route::post('/checkout/{order}/submit-printify', [CheckoutController::class, 'submitToPrintify'])->name('checkout.submit-printify');

    // // Step 1 - Shipping
    // Route::get('/checkout/step1', [CheckoutController::class, 'showStep1'])->name('checkout.step1');
    // Route::post('/checkout/validate-step1', [CheckoutController::class, 'validateStep1'])->name('checkout.validate-step1');

    // // Step 2 - Payment
    // Route::get('/checkout/step2', [CheckoutController::class, 'showStep2'])->name('checkout.step2');
    // Route::post('/checkout/update-donation', [CheckoutController::class, 'updateDonation'])->name('checkout.update-donation');
    // Route::post('/checkout/payment-intent', [CheckoutController::class, 'createPaymentIntent'])->name('checkout.payment-intent');
    // Route::post('/checkout/confirm', [CheckoutController::class, 'confirmPayment'])->name('checkout.confirm');


    Route::get('/checkout', [CheckoutController::class, 'show'])->name('checkout.show');
    Route::post('/checkout/shipping-calculation', [CheckoutController::class, 'calculateShipping'])->name('checkout.shipping');
    Route::post('/checkout/update-tax', [CheckoutController::class, 'updateTax'])->name('checkout.update-tax');

    Route::post('/checkout/step1', [CheckoutController::class, 'submitStep1'])->name('checkout.step1');
    Route::post('/checkout/payment-intent', [CheckoutController::class, 'createPaymentIntent'])->name('checkout.payment-intent');
    Route::post('/checkout/confirm', [CheckoutController::class, 'confirmPayment'])->name('checkout.confirm');
});

/* fractional ownership */
Route::get('/fractional', [\App\Http\Controllers\FractionalOwnershipController::class, 'index'])->name('fractional.index');
Route::get('/fractional/{offering}', [\App\Http\Controllers\FractionalOwnershipController::class, 'show'])->name('fractional.show');
Route::post('/fractional/{offering}/purchase', [\App\Http\Controllers\FractionalOwnershipController::class, 'purchase'])->middleware('auth')->name('fractional.purchase');
Route::get('/fractional/purchase/success', [\App\Http\Controllers\FractionalOwnershipController::class, 'purchaseSuccess'])->middleware('auth')->name('fractional.purchase.success');
Route::get('/fractional/purchase/cancel', [\App\Http\Controllers\FractionalOwnershipController::class, 'purchaseCancel'])->middleware('auth')->name('fractional.purchase.cancel');
Route::get('/fractional/certificate/{order}', [\App\Http\Controllers\FractionalCertificateController::class, 'show'])->middleware('auth')->name('fractional.certificate.show');
Route::get('/fractional/certificate/{order}/download', [\App\Http\Controllers\FractionalCertificateController::class, 'download'])->middleware('auth')->name('fractional.certificate.download');
Route::get('/fractional/certificate/{order}/download-pdf', [\App\Http\Controllers\FractionalCertificateController::class, 'downloadPdf'])->middleware('auth')->name('fractional.certificate.download-pdf');

/* events */
Route::get('/all-events', [EventController::class, 'alleventsPage'])->name('alleventsPage');
Route::get('/events/{id}/view', [EventController::class, 'viewEvent'])->name('viewEvent');


// User public routes
Route::get('/users/{slug}', [UserProfileController::class, 'show'])->name('users.show');
Route::get('/users/{slug}/posts', [UserProfileController::class, 'posts'])->name('users.posts');
Route::get('/users/{slug}/about', [UserProfileController::class, 'about'])->name('users.about');
Route::get('/users/{slug}/activity', [UserProfileController::class, 'activity'])->name('users.activity');
Route::get('/users/{slug}/following', [UserProfileController::class, 'following'])->name('users.following');
Route::get('/users/{slug}/groups', [UserProfileController::class, 'groups'])->name('users.groups');

// User follow routes (requires auth)
Route::middleware(['auth', 'EnsureEmailIsVerified'])->group(function () {
    Route::post('/users/{id}/toggle-follow', [UserProfileController::class, 'toggleFollow'])->name('users.toggle-follow');
});

// Organization routes
Route::get('/organizations', [OrganizationController::class, 'index'])->name('organizations');
Route::get('/organizations/{slug}', [OrganizationController::class, 'show'])->name('organizations.show');
Route::get('/organizations/{slug}/products', [OrganizationController::class, 'products'])->name('organizations.products');
Route::get('/organizations/{slug}/jobs', [OrganizationController::class, 'jobs'])->name('organizations.jobs');
Route::get('/organizations/{slug}/events', [OrganizationController::class, 'events'])->name('organizations.events');
Route::get('/organizations/{slug}/social-media', [OrganizationController::class, 'socialMedia'])->name('organizations.social-media');
Route::get('/organizations/{slug}/about', [OrganizationController::class, 'about'])->name('organizations.about');
Route::get('/organizations/{slug}/supporters', [OrganizationController::class, 'supporters'])->name('organizations.supporters');
Route::get('/organizations/{slug}/impact', [OrganizationController::class, 'impact'])->name('organizations.impact');
Route::get('/organizations/{slug}/details', [OrganizationController::class, 'details'])->name('organizations.details');
Route::get('/organizations/{slug}/contact', [OrganizationController::class, 'contact'])->name('organizations.contact');

// Public livestream guest join (no auth) — registered first so /livestreams/join/{roomName} is not matched by /livestreams/{id}
Route::get('/livestreams/join/{roomName}', [\App\Http\Controllers\Organization\LivestreamController::class, 'guestJoin'])
    ->where('roomName', '[a-zA-Z0-9_]+')
    ->name('livestreams.guest-join');

// API route for inviting unregistered organizations (requires auth)
Route::middleware(['auth', 'web'])->post('/api/organizations/invite', [OrganizationController::class, 'inviteOrganization'])->name('api.organizations.invite');
Route::get('/organizations/{slug}/enrollments', [OrganizationController::class, 'enrollments'])->name('organizations.enrollments');
Route::post('/organizations/{id}/generate-mission', [OrganizationController::class, 'generateMission'])->name('organizations.generate-mission'); // id is ExcelData ID

// API route for dynamic city loading
Route::get('/api/cities-by-state', [OrganizationController::class, 'getCitiesByState']);

// Profile routes
Route::middleware(['auth', 'EnsureEmailIsVerified', 'role:user'])->name('user.')->group(function () {
    Route::get('/profile', [UserProfileController::class, 'index'])->name('profile.index');
    Route::get('/profile/edit', [UserProfileController::class, 'edit'])->name('profile.edit');
    Route::post('/profile/update', [UserProfileController::class, 'update'])->name('profile.update');
    Route::post('/profile/timezone', [UserProfileController::class, 'updateTimezone'])->name('profile.timezone');

    Route::get('/profile/change-password', [UserProfileController::class, 'changePasswordForm'])->name('profile.change-password');

    Route::get('/profile/following', [UserProfileController::class, 'favorites'])->name('profile.favorites');
    Route::delete("/profile/following/{id}", [UserProfileController::class, 'removeFavorite'])->name('profile.favorites.remove');

    Route::get('/profile/donations', [UserProfileController::class, 'donations'])->name('profile.donations');
    Route::get('/profile/orders', [UserProfileController::class, 'orders'])->name('profile.orders');
    Route::get('/profile/orders/{order}', [UserProfileController::class, 'orderDetails'])->name('profile.order-details');
    Route::get('/profile/job-applications', [UserProfileController::class, 'jobApplications'])->name('profile.job-applications');
    Route::get('/profile/job-applications/{id}', [UserProfileController::class, 'showJobApplication'])->name('profile.job-applications.show');
    Route::get('/profile/job-applications/{id}/timesheets', [UserProfileController::class, 'getJobApplicationTimesheets'])->name('profile.job-applications.timesheets');
    Route::post('/profile/job-applications/{id}/request-completion', [UserProfileController::class, 'requestJobCompletion'])->name('profile.job-applications.request-completion');
    Route::get('/profile/reward-points-ledger', [UserProfileController::class, 'rewardPointsLedger'])->name('profile.reward-points-ledger');
    Route::get('/profile/redemptions', [UserProfileController::class, 'redemptions'])->name('profile.redemptions');
    Route::get('/profile/transactions', [TransactionController::class, 'index'])->name('profile.transactions');
    Route::get('/profile/billing', [UserProfileController::class, 'billing'])->name('profile.billing');
    Route::get('/profile/timesheet', [UserProfileController::class, 'timesheet'])->name('profile.timesheet');
    Route::get('/profile/impact-score', [\App\Http\Controllers\ImpactScoreController::class, 'show'])->name('profile.impact-score');
    Route::get('/api/impact-score', [\App\Http\Controllers\ImpactScoreController::class, 'index'])->name('api.impact-score');
    Route::get('/profile/fractional-ownership', [\App\Http\Controllers\FractionalOwnershipController::class, 'myPurchases'])->name('profile.fractional-ownership');
    Route::get('nodeboss/shares', [NodeShareController::class, 'index'])->name('nodeboss.sahres');
    // Toggle favorite moved to auth-only group so org users get friendly message instead of permission-denied
    Route::post('/organizations/{id}/toggle-notifications', [OrganizationController::class, 'toggleNotifications'])->name('organizations.toggle-notifications');

     Route::post('/organizations/{orgId}/save-positions-follow', [OrganizationController::class, 'savePositionsAndFollow'])
        ->name('organizations.save-positions-and-follow');

    Route::get('/user/positions/for-selection', [OrganizationController::class, 'getPositionsForSelection'])
        ->name('positions.get-for-selection');

    Route::get("/profile/topics/select", [UsersInterestedTopicsController::class, 'userSelect'])
        ->name('topics.select');
});

Route::post('/user/topics/store', [UsersInterestedTopicsController::class, 'store'])
    ->middleware(['auth', 'EnsureEmailIsVerified', 'role:user|organization|organization_pending']);

Route::middleware(['auth', 'EnsureEmailIsVerified', 'role:user'])->get('/profile-old', function () {
    return Inertia::render('frontend/profile');
});

Route::resource('/chat-group-topics', ChatTopicController::class)->only(['index', 'store', 'update', 'destroy'])->middleware([
    'index' => 'permission:communication.read',
    'store' => 'permission:communication.create',
    'update' => 'permission:communication.update',
    'destroy' => 'permission:communication.delete'
]);

Route::get("group-topics/select", [UsersInterestedTopicsController::class, 'orgSelect'])->middleware(['auth', 'EnsureEmailIsVerified', 'role:organization|admin|organization_pending'])
    ->name('auth.topics.select');

Route::prefix("chat")->middleware(['auth', 'EnsureEmailIsVerified', 'topics.selected'])->name("chat.")->group(function () {
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

    // Wallet Routes
Route::prefix('wallet')->middleware(['auth', 'EnsureEmailIsVerified', 'topics.selected'])->name('wallet.')->group(function () {
        Route::post('/connect', [WalletController::class, 'connect'])->name('connect');
        Route::get('/balance', [WalletController::class, 'getBalance'])->name('balance');
        Route::get('/status', [WalletController::class, 'status'])->name('status');
        Route::get('/activity', [WalletController::class, 'getActivity'])->name('activity');
        Route::get('/activity/all', [WalletController::class, 'getAllActivity'])->name('activity.all');
        Route::get('/search-recipients', [WalletController::class, 'searchRecipients'])->name('search-recipients');
        Route::post('/send', [WalletController::class, 'send'])->name('send');
    Route::post('/deposit', [WalletController::class, 'deposit'])->name('deposit');
        Route::post('/disconnect', [WalletController::class, 'disconnect'])->name('disconnect');

    // Bridge Wallet Routes
    Route::post('/bridge/initialize', [App\Http\Controllers\BridgeWalletController::class, 'initializeBridge'])->name('bridge.initialize');
    Route::post('/bridge/create-wallet', [App\Http\Controllers\BridgeWalletController::class, 'createWalletAfterKYC'])->name('bridge.create-wallet');
    Route::get('/bridge/status', [App\Http\Controllers\BridgeWalletController::class, 'checkBridgeStatus'])->name('bridge.status');
    Route::get('/bridge/balance', [App\Http\Controllers\BridgeWalletController::class, 'getBridgeBalance'])->name('bridge.balance');
    Route::post('/bridge/kyc-link', [App\Http\Controllers\BridgeWalletController::class, 'createKYCLink'])->name('bridge.kyc-link');
    Route::post('/bridge/deposit', [App\Http\Controllers\BridgeWalletController::class, 'deposit'])->name('bridge.deposit');
    Route::post('/bridge/send', [App\Http\Controllers\BridgeWalletController::class, 'send'])->name('bridge.send');

    // Custom KYC Routes
    Route::get('/bridge/tos-link', [App\Http\Controllers\BridgeWalletController::class, 'getTosLink'])->name('bridge.tos-link');
    Route::get('/bridge/tos-status', [App\Http\Controllers\BridgeWalletController::class, 'checkTosStatus'])->name('bridge.tos-status');
    Route::post('/bridge/sync-tos-status', [App\Http\Controllers\BridgeWalletController::class, 'syncTosStatus'])->name('bridge.sync-tos-status');
    Route::post('/bridge/create-customer-kyc', [App\Http\Controllers\BridgeWalletController::class, 'createCustomerWithKyc'])->name('bridge.create-customer-kyc');
    Route::post('/bridge/control-person-kyc-link', [App\Http\Controllers\BridgeWalletController::class, 'getControlPersonKycLink'])->name('bridge.control-person-kyc-link');
    Route::get('/bridge/business-details', [App\Http\Controllers\BridgeWalletController::class, 'getBusinessDetails'])->name('bridge.business-details');

    // Bridge Virtual Account & External Account Routes (for USD top-up)
    Route::post('/bridge/virtual-account', [App\Http\Controllers\BridgeWalletController::class, 'createVirtualAccountForWallet'])->name('bridge.virtual-account.create');
    Route::get('/bridge/virtual-accounts', [App\Http\Controllers\BridgeWalletController::class, 'getVirtualAccounts'])->name('bridge.virtual-accounts');
    Route::post('/bridge/external-account', [App\Http\Controllers\BridgeWalletController::class, 'createExternalAccount'])->name('bridge.external-account.create');
    Route::get('/bridge/external-accounts', [App\Http\Controllers\BridgeWalletController::class, 'getExternalAccounts'])->name('bridge.external-accounts');
    Route::post('/bridge/transfer-from-external', [App\Http\Controllers\BridgeWalletController::class, 'createTransferFromExternalAccount'])->name('bridge.transfer-from-external');
    Route::post('/bridge/transfer-to-external', [App\Http\Controllers\BridgeWalletController::class, 'createTransferToExternalAccount'])->name('bridge.transfer-to-external');
    Route::get('/bridge/deposit-instructions', [App\Http\Controllers\BridgeWalletController::class, 'getDepositInstructions'])->name('bridge.deposit-instructions');
    Route::get('/bridge/deposit-qr-code', [App\Http\Controllers\BridgeWalletController::class, 'getDepositQrCode'])->name('bridge.deposit-qr-code');

    // Card Account Routes
    Route::get('/bridge/card-account', [App\Http\Controllers\BridgeWalletController::class, 'getCardAccount'])->name('bridge.card-account.get');
    Route::post('/bridge/card-account', [App\Http\Controllers\BridgeWalletController::class, 'createCardAccount'])->name('bridge.card-account.create');

    // Liquidation Address Routes (for crypto deposits)
    Route::post('/bridge/liquidation-address', [App\Http\Controllers\BridgeWalletController::class, 'createLiquidationAddress'])->name('bridge.liquidation-address.create');
    Route::get('/bridge/liquidation-addresses', [App\Http\Controllers\BridgeWalletController::class, 'getLiquidationAddresses'])->name('bridge.liquidation-addresses');
    Route::get('/bridge/liquidation-address-qr-code', [App\Http\Controllers\BridgeWalletController::class, 'getLiquidationAddressQrCode'])->name('bridge.liquidation-address-qr-code');

    // Bridge Webhook Routes
    Route::get('/bridge/webhooks/{webhookId}/events', [App\Http\Controllers\BridgeWalletController::class, 'getWebhookEvents'])->name('bridge.webhooks.events');
    Route::get('/bridge/webhooks/{webhookId}/events/{eventId}', [App\Http\Controllers\BridgeWalletController::class, 'getWebhookEvent'])->name('bridge.webhooks.event');

        // User Rewards Routes
        Route::get('/rewards/balance', [WalletController::class, 'getRewardBalance'])->name('rewards.balance');
        Route::get('/rewards/history', [WalletController::class, 'getRewardTransactionHistory'])->name('rewards.history');
        Route::post('/rewards/credit-hours', [WalletController::class, 'creditVolunteerHours'])->name('rewards.credit-hours');

        // Token Balance Route
        Route::get('/tokens/balance', [WalletController::class, 'getTokenBalance'])->name('tokens.balance');
    });

    // AI Chat (Public) - Needs to be outside auth middleware
    // Route::get('/ai-chat/context', [AiChatController::class, 'getContext'])->name('ai-chat.context');

// KYC/KYB Callback Routes (after verification completion - no auth required for redirect)
Route::get('/wallet/kyc-callback', [App\Http\Controllers\BridgeWalletController::class, 'kycCallback'])->name('bridge.kyc-callback');
Route::get('/wallet/kyb-callback', [App\Http\Controllers\BridgeWalletController::class, 'kybCallback'])->name('bridge.kyb-callback');
// TOS callback - GET doesn't require auth (Bridge redirect), POST requires auth (from frontend)
Route::get('/wallet/tos-callback', [App\Http\Controllers\BridgeWalletController::class, 'tosCallback'])->name('bridge.tos-callback');
Route::post('/wallet/tos-callback', [App\Http\Controllers\BridgeWalletController::class, 'tosCallback'])->middleware('auth')->name('bridge.tos-callback.post');


// Raffle Payment Routes (must come before admin routes to avoid conflicts)
// Stop impersonation route (must be accessible to any authenticated user, including impersonated users)
Route::post('/users/stop-impersonate', [RolePermissionController::class, 'stopImpersonate'])->middleware(['auth'])->name('users.stop-impersonate');

Route::middleware(['web', 'auth', 'EnsureEmailIsVerified'])->group(function () {
    Route::get('/raffles/success', [App\Http\Controllers\RaffleController::class, 'success'])->name('raffles.success');
    Route::get('/raffles/cancel', [App\Http\Controllers\RaffleController::class, 'cancel'])->name('raffles.cancel');
});

// Route::prefix('excel-data')->name('excel-data.')->middleware(['auth', 'EnsureEmailIsVerified', 'role:admin', 'topics.selected'])->group(function () {
//     Route::get('/', [ExcelDataController::class, 'index'])->name('index');
//     Route::get('/import', [ExcelDataController::class, 'import'])->name('import');
//     Route::post('/import', [ExcelDataController::class, 'importStore'])->name('import.store');
//     Route::post('/upload', [ExcelDataController::class, 'upload'])->name('upload');
// });

Route::prefix('admin/compliance')
    ->middleware(['auth', 'EnsureEmailIsVerified', 'role:admin', 'topics.selected', 'permission:compliance.review'])
    ->name('admin.compliance.')
    ->group(function () {
        Route::get('/', [AdminComplianceApplicationController::class, 'index'])->name('index');
        Route::get('/{application}', [AdminComplianceApplicationController::class, 'show'])->name('show');
        Route::patch('/{application}', [AdminComplianceApplicationController::class, 'update'])->name('update');
        Route::delete('/{application}', [AdminComplianceApplicationController::class, 'destroy'])->name('destroy');
    });

Route::prefix('admin/form1023')
    ->middleware(['auth', 'EnsureEmailIsVerified', 'role:admin', 'topics.selected'])
    ->name('admin.form1023.')
    ->group(function () {
        Route::get('/', [AdminForm1023ApplicationController::class, 'index'])->name('index');
        Route::get('/{application}', [AdminForm1023ApplicationController::class, 'show'])->name('show');
        Route::patch('/{application}', [AdminForm1023ApplicationController::class, 'update'])->name('update');
        Route::patch('/{application}/amount', [AdminForm1023ApplicationController::class, 'updateAmount'])->name('update-amount');
        Route::post('/{application}/reject-document', [AdminForm1023ApplicationController::class, 'rejectDocument'])->name('reject-document');
        Route::delete('/{application}', [AdminForm1023ApplicationController::class, 'destroy'])->name('destroy');
    });

Route::prefix('admin/fees')
    ->middleware(['auth', 'EnsureEmailIsVerified', 'role:admin', 'topics.selected'])
    ->name('admin.fees.')
    ->group(function () {
        Route::get('/', [FeesController::class, 'index'])->name('index');
        Route::put('/', [FeesController::class, 'update'])->name('update');
    });

Route::prefix('admin/reward-points')
    ->middleware(['auth', 'EnsureEmailIsVerified', 'role:admin', 'topics.selected'])
    ->name('admin.reward-points.')
    ->group(function () {
        Route::get('/', [RewardPointController::class, 'index'])->name('index');
        Route::put('/', [RewardPointController::class, 'update'])->name('update');
    });

// Admin Believe Points Management
Route::prefix('admin/believe-points')
    ->middleware(['auth', 'EnsureEmailIsVerified', 'role:admin', 'topics.selected'])
    ->name('admin.believe-points.')
    ->group(function () {
        Route::get('/', [App\Http\Controllers\Admin\BelievePointController::class, 'index'])->name('index');
        Route::put('/', [App\Http\Controllers\Admin\BelievePointController::class, 'update'])->name('update');
    });

// Fractional Ownership (Admin-only - Full CRUD)
Route::prefix('admin/fractional')
    ->middleware(['auth', 'EnsureEmailIsVerified', 'role:admin', 'topics.selected'])
    ->name('admin.fractional.')
    ->group(function () {
        // Assets routes
        Route::get('/assets', [\App\Http\Controllers\Admin\FractionalAssetController::class, 'index'])->name('assets.index');
        Route::get('/assets/create', [\App\Http\Controllers\Admin\FractionalAssetController::class, 'create'])->name('assets.create');
        Route::post('/assets', [\App\Http\Controllers\Admin\FractionalAssetController::class, 'store'])->name('assets.store');
        Route::get('/assets/{asset}/edit', [\App\Http\Controllers\Admin\FractionalAssetController::class, 'edit'])->name('assets.edit');
        Route::put('/assets/{asset}', [\App\Http\Controllers\Admin\FractionalAssetController::class, 'update'])->name('assets.update');
        Route::delete('/assets/{asset}', [\App\Http\Controllers\Admin\FractionalAssetController::class, 'destroy'])->name('assets.destroy');

            // Offerings routes
            Route::get('/offerings', [\App\Http\Controllers\Admin\FractionalOfferingController::class, 'index'])->name('offerings.index');
            Route::get('/offerings/create', [\App\Http\Controllers\Admin\FractionalOfferingController::class, 'create'])->name('offerings.create');
            Route::post('/offerings', [\App\Http\Controllers\Admin\FractionalOfferingController::class, 'store'])->name('offerings.store');
            Route::get('/offerings/{offering}', [\App\Http\Controllers\Admin\FractionalOfferingController::class, 'show'])->name('offerings.show');
            Route::get('/offerings/{offering}/edit', [\App\Http\Controllers\Admin\FractionalOfferingController::class, 'edit'])->name('offerings.edit');
            Route::put('/offerings/{offering}', [\App\Http\Controllers\Admin\FractionalOfferingController::class, 'update'])->name('offerings.update');
            Route::delete('/offerings/{offering}', [\App\Http\Controllers\Admin\FractionalOfferingController::class, 'destroy'])->name('offerings.destroy');

            // Orders routes
            Route::get('/orders', [\App\Http\Controllers\Admin\FractionalOrderController::class, 'index'])->name('orders.index');
            Route::get('/orders/{order}', [\App\Http\Controllers\Admin\FractionalOrderController::class, 'show'])->name('orders.show');
        });

Route::middleware(["auth", 'EnsureEmailIsVerified'])->group(function (){
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead']);
    Route::post('/notifications/clear-all', [NotificationController::class, 'clearAll']);

    Route::get("/notifications/content/{content_item}", [NotificationController::class, 'show'])->name('notifications.content.show');
});

// Push notification routes
Route::middleware(["auth", 'EnsureEmailIsVerified'])->group(function () {
    Route::post('/push-token', [PushTokenController::class, 'store']);
    Route::delete('/push-token', [PushTokenController::class, 'destroy']);
});


Route::middleware(["auth", 'EnsureEmailIsVerified', 'role:organization', 'topics.selected'])->group(function (){
    Route::get('/content', [ContentItemController::class, 'index'])->name('content.items.index');
    Route::get('/content/create', [ContentItemController::class, 'create'])->name('content.items.create');
    Route::post('/content', [ContentItemController::class, 'store'])->name('content.items.store');
    Route::get('/content/{content_item}/edit', [ContentItemController::class, 'edit'])->name('content.items.edit');
    Route::put('/content/{content_item}', [ContentItemController::class, 'update'])->name('content.items.update');
    Route::delete('/content/{content_item}', [ContentItemController::class, 'destroy'])->name('content.items.destroy');

    // Campaigns
    Route::get('/campaigns', [CampaignController::class, 'index'])->name('campaigns.index');
    Route::get('/campaigns/create', [CampaignController::class, 'create'])->name('campaigns.create');
    Route::post('/campaigns', [CampaignController::class, 'store'])->name('campaigns.store');
    Route::get('/campaigns/{campaign}', [CampaignController::class, 'show'])->name('campaigns.show');
    Route::delete('/campaigns/{campaign}', [CampaignController::class, 'destroy'])->name('campaigns.destroy');

    Route::get('/campaigns/ai/create', [AiCampaignController::class, 'create'])->name('campaigns.ai-create');
    Route::post('/campaigns/ai', [AiCampaignController::class, 'store'])->name('campaigns.ai-store');

    // Believe FundMe – organization campaigns
    Route::get('/fundme', [FundMeCampaignController::class, 'index'])->name('fundme.campaigns.index');
    Route::get('/fundme/create', [FundMeCampaignController::class, 'create'])->name('fundme.campaigns.create');
    Route::post('/fundme', [FundMeCampaignController::class, 'store'])->name('fundme.campaigns.store');
    Route::get('/fundme/{fundme_campaign}/edit', [FundMeCampaignController::class, 'edit'])->name('fundme.campaigns.edit');
    Route::put('/fundme/{fundme_campaign}', [FundMeCampaignController::class, 'update'])->name('fundme.campaigns.update');
    Route::post('/fundme/{fundme_campaign}/submit', [FundMeCampaignController::class, 'submit'])->name('fundme.campaigns.submit');
    Route::delete('/fundme/{fundme_campaign}', [FundMeCampaignController::class, 'destroy'])->name('fundme.campaigns.destroy');



    // AI Chat
    // AI Chat (Authenticated)
    Route::get('/ai-chat', [AiChatController::class, 'index'])->name('ai-chat.index');
    Route::post('/ai-chat/send', [AiChatController::class, 'sendMessage'])->name('ai-chat.send');
    Route::get('/ai-chat/conversations', [AiChatController::class, 'getConversations'])->name('ai-chat.conversations');
    Route::get('/ai-chat/conversations/{id}', [AiChatController::class, 'getConversation'])->name('ai-chat.conversation');
    Route::put('/ai-chat/conversations/{id}', [AiChatController::class, 'updateConversation'])->name('ai-chat.update-conversation');
    Route::delete('/ai-chat/conversations/{id}', [AiChatController::class, 'deleteConversation'])->name('ai-chat.delete-conversation');

    // Credit Purchase Routes
    Route::get('/credits/purchase', [CreditPurchaseController::class, 'index'])->name('credits.purchase');
    Route::post('/credits/checkout', [CreditPurchaseController::class, 'checkout'])->name('credits.checkout');
    Route::get('/credits/success', [CreditPurchaseController::class, 'success'])->name('credits.success');
    Route::get('/credits/cancel', [CreditPurchaseController::class, 'cancel'])->name('credits.cancel');


    // Organization routes follwers
    Route::prefix('organization')->group(function () {
        Route::get('/followers', [FollowerController::class, 'index'])
            ->name('organization.followers.index');

        Route::post(
            '/followers/{follower}/toggle-notifications',
            [FollowerController::class, 'toggleNotifications']
        )
            ->name('organization.followers.toggle-notifications');

        Route::delete(
            '/followers/{follower}',
            [FollowerController::class, 'destroy']
        )
            ->name('organization.followers.destroy');

        // Bulk actions
        Route::post(
            '/followers/bulk-toggle-notifications',
            [FollowerController::class, 'bulkToggleNotifications']
        )
            ->name('organization.followers.bulk-toggle-notifications');

        Route::post(
            '/followers/bulk-destroy',
            [FollowerController::class, 'bulkDestroy']
        )
            ->name('organization.followers.bulk-destroy');
    });


    // old Facebook Integration Routes
    // Route::prefix('facebook')->group(function () {
    //     // Connection Management
    //     Route::get('/connect', [AuthController::class, 'connect'])->name('facebook.connect');
    //     Route::get('/callback', [AuthController::class, 'callback'])->name('facebook.callback');
    //     Route::get('/configure', [ConfigurationController::class, 'index'])
    //         ->name('facebook.configure');
    //     Route::post('/{id}/disconnect', [AuthController::class, 'disconnect'])->name('facebook.disconnect');
    //     Route::post('/{id}/refresh', [AuthController::class, 'refresh'])->name('facebook.refresh');
    //     Route::post('/{id}/set-default', [AuthController::class, 'setDefault'])->name('facebook.set-default');

    //     // Posts Management
    //     Route::prefix('/posts')->group(function () {
    //         Route::get('/', [PostController::class, 'index'])->name('facebook.posts.index');
    //         Route::get('/create', [PostController::class, 'create'])->name('facebook.posts.create');
    //         Route::post('/', [PostController::class, 'store'])->name('facebook.posts.store');
    //         Route::post('/{id}/publish', [PostController::class, 'publish'])->name('facebook.posts.publish');
    //         Route::delete('/{id}', [PostController::class, 'destroy'])->name('facebook.posts.destroy');
    //         Route::get('/{id}/analytics', [PostController::class, 'analytics'])->name('facebook.posts.analytics');
    //     });
    // });

    // Facebook Integration Routes
    Route::prefix('facebook')->group(function () {
        // Connection Management (একটি App ID দিয়ে)
        Route::get('/connect', [AuthController::class, 'connect'])->name('facebook.connect');
        Route::get('/oauth/redirect', [AuthController::class, 'redirectToFacebook'])->name('facebook.redirect');
        Route::get('/callback', [AuthController::class, 'callback'])->name('facebook.callback');
        Route::post('/{id}/disconnect', [AuthController::class, 'disconnect'])->name('facebook.disconnect');
        Route::post('/{id}/refresh', [AuthController::class, 'refresh'])->name('facebook.refresh');
        Route::post('/{id}/set-default', [AuthController::class, 'setDefault'])->name('facebook.set-default');

        // Posts Management
        Route::prefix('/posts')->group(function () {
            Route::get('/', [PostController::class, 'index'])->name('facebook.posts.index');
            Route::get('/create', [PostController::class, 'create'])->name('facebook.posts.create');
            Route::post('/', [PostController::class, 'store'])->name('facebook.posts.store');
            Route::post('/{id}/publish', [PostController::class, 'publish'])->name('facebook.posts.publish');
            Route::delete('/{id}', [PostController::class, 'destroy'])->name('facebook.posts.destroy');
        });
    });
});

Route::middleware(['auth', 'EnsureEmailIsVerified', 'role:organization|admin|organization_pending', 'topics.selected'])->group(function () {
    Route::get('dashboard', [DashboardController::class, "index"])->name('dashboard');

    // Organization Livestreams
    Route::prefix('livestreams')->name('organization.livestreams.')->group(function () {
        Route::get('/', [\App\Http\Controllers\Organization\LivestreamController::class, 'index'])->name('index');
        Route::get('/create', [\App\Http\Controllers\Organization\LivestreamController::class, 'create'])->name('create');
        Route::post('/', [\App\Http\Controllers\Organization\LivestreamController::class, 'store'])->name('store');
        Route::get('/{id}/ready', [\App\Http\Controllers\Organization\LivestreamController::class, 'ready'])->name('ready');
        Route::get('/{id}', [\App\Http\Controllers\Organization\LivestreamController::class, 'show'])->name('show');
        Route::post('/{id}/go-live', [\App\Http\Controllers\Organization\LivestreamController::class, 'goLive'])->name('go-live');
        Route::post('/{id}/go-live-obs-auto', [\App\Http\Controllers\Organization\LivestreamController::class, 'goLiveOBSAuto'])->name('go-live-obs-auto');
        Route::post('/{id}/go-live-browser', [\App\Http\Controllers\Organization\LivestreamController::class, 'goLiveBrowser'])->name('go-live-browser');
        Route::post('/{id}/end-stream', [\App\Http\Controllers\Organization\LivestreamController::class, 'endStream'])->name('end-stream');
        Route::patch('/{id}/status', [\App\Http\Controllers\Organization\LivestreamController::class, 'updateStatus'])->name('update-status');
        Route::patch('/{id}/stream-key', [\App\Http\Controllers\Organization\LivestreamController::class, 'updateStreamKey'])->name('update-stream-key');
        Route::delete('/{id}', [\App\Http\Controllers\Organization\LivestreamController::class, 'destroy'])->name('destroy');
    });

    // Nonprofit Barter Network (NNBN) – EIN + KYB + Board + Bridge + Admin approved only
    Route::middleware('barter.access')->prefix('barter')->name('barter.')->group(function () {
        Route::get('/', [\App\Http\Controllers\Barter\BarterNetworkController::class, 'index'])->name('index');
        Route::get('/marketplace', [\App\Http\Controllers\Barter\BarterNetworkController::class, 'marketplace'])->name('marketplace');
        Route::get('/my-listings', [\App\Http\Controllers\Barter\BarterNetworkController::class, 'myListings'])->name('my-listings');
        Route::get('/listings/{listing}', [\App\Http\Controllers\Barter\BarterNetworkController::class, 'showListing'])->name('listings.show');
        Route::post('/listings', [\App\Http\Controllers\Barter\BarterNetworkController::class, 'storeListing'])->name('listings.store');
        Route::put('/listings/{listing}', [\App\Http\Controllers\Barter\BarterNetworkController::class, 'updateListing'])->name('listings.update');
        Route::post('/request-trade', [\App\Http\Controllers\Barter\BarterNetworkController::class, 'requestTrade'])->name('request-trade');
        Route::get('/incoming-requests', [\App\Http\Controllers\Barter\BarterNetworkController::class, 'incomingRequests'])->name('incoming-requests');
        Route::post('/transactions/{transaction}/accept', [\App\Http\Controllers\Barter\BarterNetworkController::class, 'acceptRequest'])->name('transactions.accept');
        Route::post('/transactions/{transaction}/reject', [\App\Http\Controllers\Barter\BarterNetworkController::class, 'rejectRequest'])->name('transactions.reject');
        Route::get('/active-trades', [\App\Http\Controllers\Barter\BarterNetworkController::class, 'activeTrades'])->name('active-trades');
        Route::get('/trade-history', [\App\Http\Controllers\Barter\BarterNetworkController::class, 'tradeHistory'])->name('trade-history');
        Route::get('/points-wallet', [\App\Http\Controllers\Barter\BarterNetworkController::class, 'pointsWallet'])->name('points-wallet');
        Route::get('/reputation', [\App\Http\Controllers\Barter\BarterNetworkController::class, 'reputation'])->name('reputation');
    });

    Route::middleware('permission:dashboard.read')->group(function () {
        Route::get('/dashboard/compliance/apply', [ComplianceApplicationController::class, 'show'])->name('compliance.apply.show');
        Route::post('/dashboard/compliance/apply', [ComplianceApplicationController::class, 'store'])->name('compliance.apply.store');
        Route::get('/dashboard/compliance/apply/{application}/success', [ComplianceApplicationController::class, 'success'])->name('compliance.apply.success');
        Route::get('/dashboard/compliance/apply/{application}/cancel', [ComplianceApplicationController::class, 'cancel'])->name('compliance.apply.cancel');
    });

    // Form 1023 Application Routes - Only for organization users (not admins)
    Route::middleware(['auth', 'EnsureEmailIsVerified', 'role:organization|organization_pending', 'topics.selected'])->group(function () {
        Route::get('/dashboard/form1023/apply', [Form1023ApplicationController::class, 'show'])->name('form1023.apply.show');
        Route::post('/dashboard/form1023/apply', [Form1023ApplicationController::class, 'store'])->name('form1023.apply.store');
        Route::put('/dashboard/form1023/apply/{application}', [Form1023ApplicationController::class, 'update'])->name('form1023.apply.update');
        Route::post('/dashboard/form1023/apply/draft', [Form1023ApplicationController::class, 'saveAsDraft'])->name('form1023.apply.draft');
        Route::get('/dashboard/form1023/apply/{application}/view', [Form1023ApplicationController::class, 'view'])->name('form1023.apply.view');
        Route::post('/dashboard/form1023/apply/{application}/pay', [Form1023ApplicationController::class, 'initiatePayment'])->name('form1023.apply.pay');
        Route::get('/dashboard/form1023/apply/{application}/success', [Form1023ApplicationController::class, 'success'])->name('form1023.apply.success');
        Route::get('/dashboard/form1023/apply/{application}/cancel', [Form1023ApplicationController::class, 'cancel'])->name('form1023.apply.cancel');
    });

    Route::middleware("role:organization")->group(function () {
        Route::resource('board-members', BoardMemberController::class)
            ->only(['index', 'store', 'update', 'destroy'])
            ->shallow();

        Route::post('board-members/{boardMember}/status', [BoardMemberController::class, 'updateStatus'])
            ->name('board-members.status');
    });

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

    // Admin/Organization show route for managing their products (must come after public route)
    // This route will only be used when user is authenticated and has permission
    Route::get('/products/{id}/manage', [ProductController::class, 'show'])->name('products.show.manage')->middleware(['auth', 'EnsureEmailIsVerified', 'topics.selected', 'permission:product.read']);
});

// Public route for products (plural) - must come AFTER resource routes to avoid conflict with /products/create
// This route is for marketplace viewing (no auth required)
Route::get('/products/{id}', [ProductController::class, 'show'])->name('products.show.public');

    // Printify Integration Routes
    Route::middleware(['auth', 'topics.selected', 'role:admin|organization'])->group(function () {
        Route::get('/printify/providers', [PrintifyProductController::class, 'getProviders'])->name('printify.providers');
        Route::get('/printify/variants', [PrintifyProductController::class, 'getVariants'])->name('printify.variants');
        Route::get('/printify/shipping', [PrintifyProductController::class, 'getShipping'])->name('printify.shipping');
        // Route::post('/printify/products/sync', [ProductController::class, 'syncFromPrintify'])->name('printify.products.sync');
    });

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

    // Volunteers Routes
    Route::get('volunteers', [VolunteerController::class, 'index'])
        ->name('volunteers.index')
        ->middleware(['role:organization', 'permission:volunteer.read']);

    // Volunteer Time Sheet Routes (must come before volunteers/{volunteer} to avoid route conflicts)
    // IMPORTANT: Specific routes (like fetch-volunteers) must come BEFORE parameterized routes ({timesheet})
    Route::get('volunteers/timesheet', [VolunteerTimesheetController::class, 'index'])
        ->name('volunteers.timesheet.index')
        ->middleware(['role:organization', 'permission:volunteer.timesheet.read']);
    Route::get('volunteers/timesheet/create', [VolunteerTimesheetController::class, 'create'])
        ->name('volunteers.timesheet.create')
        ->middleware(['role:organization', 'permission:volunteer.timesheet.create']);
    Route::get('volunteers/timesheet/fetch-volunteers', [VolunteerTimesheetController::class, 'fetchVolunteers'])
        ->name('volunteers.timesheet.fetch-volunteers')
        ->middleware(['role:organization', 'permission:volunteer.timesheet.create']);
    Route::post('volunteers/timesheet', [VolunteerTimesheetController::class, 'store'])
        ->name('volunteers.timesheet.store')
        ->middleware(['role:organization', 'permission:volunteer.timesheet.create']);
    Route::get('volunteers/timesheet/{timesheet}', [VolunteerTimesheetController::class, 'show'])
        ->name('volunteers.timesheet.show')
        ->middleware(['role:organization', 'permission:volunteer.timesheet.read']);
    Route::get('volunteers/timesheet/{timesheet}/edit', [VolunteerTimesheetController::class, 'edit'])
        ->name('volunteers.timesheet.edit')
        ->middleware(['role:organization', 'permission:volunteer.timesheet.edit']);
    Route::put('volunteers/timesheet/{timesheet}', [VolunteerTimesheetController::class, 'update'])
        ->name('volunteers.timesheet.update')
        ->middleware(['role:organization', 'permission:volunteer.timesheet.update']);
    Route::put('volunteers/timesheet/{timesheet}/status', [VolunteerTimesheetController::class, 'updateStatus'])
        ->name('volunteers.timesheet.update-status')
        ->middleware(['role:organization', 'permission:volunteer.timesheet.update']);
    Route::delete('volunteers/timesheet/{timesheet}', [VolunteerTimesheetController::class, 'destroy'])
        ->name('volunteers.timesheet.destroy')
        ->middleware(['role:organization', 'permission:volunteer.timesheet.delete']);

    Route::get('volunteers/{volunteer}', [VolunteerController::class, 'show'])
        ->name('volunteers.show')
        ->middleware(['role:organization', 'permission:volunteer.read']);

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
    });

    // User Management (separate from permissions)
    Route::prefix('users')->middleware(['auth', 'EnsureEmailIsVerified', 'topics.selected'])->group(function () {
        Route::get('/', [RolePermissionController::class, 'userPermission'])->name('users.list');
        Route::get('/create', [RolePermissionController::class, 'createUser'])->name('users.create');
        Route::post('/', [RolePermissionController::class, 'storeUser'])->name('users.store');
        Route::get('/{user}/edit', [RolePermissionController::class, 'editUser'])->name('users.edit');
        Route::put('/{user}', [RolePermissionController::class, 'updateUser'])->name('users.update');
        Route::delete('/{user}', [RolePermissionController::class, 'destroyUser'])->name('users.destroy');
        Route::post('/{user}/impersonate', [RolePermissionController::class, 'impersonate'])->name('users.impersonate');
        Route::post('/{user}/reset-password', [RolePermissionController::class, 'resetPassword'])->name('users.reset-password');
        Route::post('/{user}/toggle-login-disable', [RolePermissionController::class, 'toggleLoginDisable'])->name('users.toggle-login-disable');
        Route::post('/{user}/verify-email', [RolePermissionController::class, 'verifyEmail'])->name('users.verify-email');
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
    Route::post('/orders/{order}/cancel', [OrderController::class, 'cancelOrder'])
        ->name('orders.cancel')
        ->middleware('permission:ecommerce.update');

        // Admin only route to view items by organization
    Route::get('/orders/{order}/items-by-organization', [OrderController::class, 'itemsByOrganization'])
        ->name('orders.items-by-organization')
        ->middleware('permission:ecommerce.read');

    /* Order Items Routes */
    // Route::resource('order-items', OrderItemController::class)->middleware([
    //     'index' => 'permission:ecommerce.read',
    //     'show' => 'permission:ecommerce.read',
    // ]);


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

    // Newsletter Routes
    Route::prefix('newsletter')->name('newsletter.')->group(function () {
        Route::get('/', [NewsletterController::class, 'index'])->name('index');
        Route::get('/templates', [NewsletterController::class, 'templates'])->name('templates');
        Route::get('/templates/create', [NewsletterController::class, 'createTemplate'])->name('templates.create');
        Route::post('/templates', [NewsletterController::class, 'storeTemplate'])->name('templates.store');
        Route::get('/templates/{id}', [NewsletterController::class, 'showTemplate'])->name('templates.show');
        Route::get('/templates/{id}/edit', [NewsletterController::class, 'editTemplate'])->name('templates.edit');
        Route::put('/templates/{id}', [NewsletterController::class, 'updateTemplate'])->name('templates.update');
        Route::delete('/templates/{id}', [NewsletterController::class, 'destroyTemplate'])->name('templates.destroy');
                Route::get('/recipients', [NewsletterController::class, 'recipients'])->name('recipients');
                Route::post('/recipients', [NewsletterController::class, 'storeRecipient'])->name('recipients.store');
                Route::post('/recipients/subscribe/{organizationId}', [NewsletterController::class, 'subscribeOrganization'])->name('recipients.subscribe');
                Route::post('/recipients/unsubscribe/{organizationId}', [NewsletterController::class, 'unsubscribeOrganization'])->name('recipients.unsubscribe');
                Route::post('/recipients/test-email', [NewsletterController::class, 'sendTestEmail'])->name('recipients.test-email');
                Route::get('/recipients/export', [NewsletterController::class, 'exportRecipients'])->name('recipients.export');
                Route::post('/recipients/import', [NewsletterController::class, 'importRecipients'])->name('recipients.import');
                Route::post('/recipients/manual/{recipientId}/subscribe', [NewsletterController::class, 'subscribeManualRecipient'])->name('recipients.manual.subscribe');
                Route::post('/recipients/manual/{recipientId}/unsubscribe', [NewsletterController::class, 'unsubscribeManualRecipient'])->name('recipients.manual.unsubscribe');
        Route::get('/export', [NewsletterController::class, 'export'])->name('export');
        Route::get('/create', [NewsletterController::class, 'create'])->name('create');
        Route::get('/create-advanced', [NewsletterController::class, 'createAdvanced'])->name('create-advanced');
        Route::post('/', [NewsletterController::class, 'store'])->name('store');
        Route::get('/{id}', [NewsletterController::class, 'show'])->name('show');
        Route::get('/{id}/edit', [NewsletterController::class, 'edit'])->name('edit');
        Route::put('/{id}', [NewsletterController::class, 'update'])->name('update');
        Route::put('/{id}/schedule', [NewsletterController::class, 'updateSchedule'])->name('update-schedule');
        Route::post('/{id}/pause', [NewsletterController::class, 'pause'])->name('pause');
        Route::post('/{id}/resume', [NewsletterController::class, 'resume'])->name('resume');
        Route::post('/{id}/manual-send', [NewsletterController::class, 'manualSend'])->name('manual-send');
        Route::delete('/{id}', [NewsletterController::class, 'destroy'])->name('destroy');
        Route::post('/{id}/send', [NewsletterController::class, 'send'])->name('send');
    });


// Public Newsletter Routes
Route::get('/newsletter/unsubscribe/{token}', [NewsletterController::class, 'unsubscribe'])->name('newsletter.unsubscribe');

// Public Course Routes
Route::get('/courses', [CourseController::class, 'publicIndex'])->name('course.index');
Route::get('/courses/{course:slug}', [CourseController::class, 'publicShow'])->name('course.show'); // Use slug for public show
// Ownership Verification Routes
// Route::middleware(['auth', 'EnsureEmailIsVerified'])->group(function () {
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
Route::middleware(['auth', 'EnsureEmailIsVerified', 'topics.selected'])->group(function () {
    // Admin Course Management Routes
    Route::prefix('admin/courses-events')->name('admin.courses.')->group(function () {
        Route::get('/', [CourseController::class, 'adminIndex'])->name('index')->middleware('permission:course.read');
        Route::get('/create', [CourseController::class, 'create'])->name('create')->middleware('permission:course.create');
        Route::post('/', [CourseController::class, 'store'])->name('store')->middleware('permission:course.create');
        Route::get('/{course:slug}', [CourseController::class, 'adminShow'])->name('show')->middleware('permission:course.read');
        Route::get('/{course:slug}/enrollments', [CourseController::class, 'adminEnrollments'])->name('enrollments')->middleware('permission:course.read');
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

// printify webhook
Route::prefix('webhooks')->group(function () {
    Route::post('/printify/orders', [PrintifyWebhookController::class, 'handleOrderWebhook']);
    // Bridge webhook (no auth required - signature verified)
    // Allow HEAD/GET for webhook endpoint verification, POST for actual webhooks
    Route::match(['get', 'head'], '/bridge', function () {
        return response()->json(['status' => 'ok', 'message' => 'Bridge webhook endpoint is active'], 200);
    });
    Route::post('/bridge', [App\Http\Controllers\BridgeWebhookController::class, 'handle'])->name('webhooks.bridge');
    // Phaze webhook (no auth required - API key verified in controller)
    Route::post('/phaze', [App\Http\Controllers\PhazeWebhookController::class, 'handle'])->name('webhooks.phaze');
});

Route::prefix('admin')->middleware(['auth', 'EnsureEmailIsVerified' , 'topics.selected', 'role:admin|'])->group(function () {
    // Wallet Fees Management
    Route::prefix('wallet-fees')->name('admin.wallet-fees.')->group(function () {
        Route::get('/', [App\Http\Controllers\Admin\WalletFeeController::class, 'index'])->name('index');
        Route::put('/{walletFee}', [App\Http\Controllers\Admin\WalletFeeController::class, 'update'])->name('update');
        Route::post('/{walletFee}/toggle', [App\Http\Controllers\Admin\WalletFeeController::class, 'toggleActive'])->name('toggle');
    });

    Route::get('/webhooks', [WebhookManagementController::class, 'index'])->name('admin.webhooks.index');
    Route::post('/webhooks/setup-printify', [WebhookManagementController::class, 'setupWebhooks'])->name('admin.webhooks.setup');
    Route::get('/webhooks/printify', [WebhookManagementController::class, 'getWebhooks'])->name('admin.webhooks.get');
    Route::delete('/webhooks/printify/{webhookId}', [WebhookManagementController::class, 'deleteWebhook'])->name('admin.webhooks.delete');

    // FCM / Push Notifications overview (admin only)
    Route::get('/push-notifications', [App\Http\Controllers\Admin\PushNotificationsController::class, 'index'])->name('admin.push-notifications.index');
    Route::post('/push-notifications/send-test', [App\Http\Controllers\Admin\PushNotificationsController::class, 'sendTest'])->name('admin.push-notifications.send-test');
    Route::post('/push-notifications/request-reregister', [App\Http\Controllers\Admin\PushNotificationsController::class, 'requestReregister'])->name('admin.push-notifications.request-reregister');
    Route::post('/push-notifications/invalidate-token', [App\Http\Controllers\Admin\PushNotificationsController::class, 'invalidateToken'])->name('admin.push-notifications.invalidate-token');

    // Barter Network audit (both nonprofits, listings, delta, ledger, status, dispute)
    Route::get('/barter', [App\Http\Controllers\Admin\BarterAuditController::class, 'index'])->name('admin.barter.index');
    Route::get('/barter/{transaction}', [App\Http\Controllers\Admin\BarterAuditController::class, 'show'])->name('admin.barter.show');

    // KYB Verification Routes
    Route::prefix('kyb-verification')->name('admin.kyb-verification.')->middleware('permission:kyb.verification.read')->group(function () {
        Route::get('/', [App\Http\Controllers\Admin\AdminKybVerificationController::class, 'index'])->name('index');
        Route::get('/{id}', [App\Http\Controllers\Admin\AdminKybVerificationController::class, 'show'])->name('show');
        Route::post('/{id}/approve', [App\Http\Controllers\Admin\AdminKybVerificationController::class, 'approve'])->name('approve')->middleware('permission:kyb.verification.approve');
        Route::post('/{id}/reject', [App\Http\Controllers\Admin\AdminKybVerificationController::class, 'reject'])->name('reject')->middleware('permission:kyb.verification.reject');
        Route::post('/{id}/document/{documentType}/approve', [App\Http\Controllers\Admin\AdminKybVerificationController::class, 'approveDocument'])->name('document.approve')->middleware('permission:kyb.verification.approve');
        Route::post('/{id}/document/{documentType}/reject', [App\Http\Controllers\Admin\AdminKybVerificationController::class, 'rejectDocument'])->name('document.reject')->middleware('permission:kyb.verification.reject');
        Route::post('/{id}/request-refill', [App\Http\Controllers\Admin\AdminKybVerificationController::class, 'requestRefill'])->name('request-refill')->middleware('permission:kyb.verification.manage');
        Route::post('/{id}/update-documents-to-send', [App\Http\Controllers\Admin\AdminKybVerificationController::class, 'updateDocumentsToSend'])->name('update-documents-to-send')->middleware('permission:kyb.verification.manage');
    });

    // KYB Settings Route
    Route::post('/settings/direct-bridge-submission', [App\Http\Controllers\Admin\AdminKybVerificationController::class, 'updateDirectBridgeSetting'])->name('admin.kyb-verification.settings.direct-bridge-submission')->middleware('permission:kyb.verification.manage');

    // KYC Verification Routes
    Route::prefix('kyc-verification')->name('admin.kyc-verification.')->middleware('permission:kyc.verification.read')->group(function () {
        Route::get('/', [App\Http\Controllers\Admin\AdminKycVerificationController::class, 'index'])->name('index');
        Route::get('/{id}', [App\Http\Controllers\Admin\AdminKycVerificationController::class, 'show'])->name('show');
        Route::post('/{id}/approve', [App\Http\Controllers\Admin\AdminKycVerificationController::class, 'approve'])->name('approve')->middleware('permission:kyc.verification.approve');
        Route::post('/{id}/reject', [App\Http\Controllers\Admin\AdminKycVerificationController::class, 'reject'])->name('reject')->middleware('permission:kyc.verification.reject');
        Route::post('/request/{customerId}', [App\Http\Controllers\Admin\AdminKycVerificationController::class, 'request'])->name('request')->middleware('permission:kyc.verification.request');
    });
});

// Livestock Management Routes (Admin Only)
Route::prefix('admin/livestock')
    ->middleware(['auth', 'EnsureEmailIsVerified', 'topics.selected', 'role:admin', 'permission:admin.livestock.read'])
    ->name('admin.livestock.')
    ->group(function () {
        Route::get('/', [\App\Http\Controllers\Admin\LivestockController::class, 'index'])->name('index');
        Route::get('/sellers', [\App\Http\Controllers\Admin\LivestockController::class, 'sellers'])->name('sellers');
        Route::get('/sellers/{id}', [\App\Http\Controllers\Admin\LivestockController::class, 'showSeller'])->name('sellers.show');
        Route::get('/sellers/{id}/listings', [\App\Http\Controllers\Admin\LivestockController::class, 'sellerListings'])->name('sellers.listings');
        Route::put('/sellers/{id}/verify', [\App\Http\Controllers\Admin\LivestockController::class, 'verifySeller'])->name('sellers.verify')->middleware('permission:admin.livestock.manage');
        Route::put('/sellers/{id}/reject', [\App\Http\Controllers\Admin\LivestockController::class, 'rejectSeller'])->name('sellers.reject')->middleware('permission:admin.livestock.manage');
        Route::delete('/sellers/{id}', [\App\Http\Controllers\Admin\LivestockController::class, 'deleteSeller'])->name('sellers.delete')->middleware('permission:admin.livestock.manage');
        Route::get('/listings', [\App\Http\Controllers\Admin\LivestockController::class, 'fractionalListings'])->name('listings');
        Route::get('/listings/{id}', [\App\Http\Controllers\Admin\LivestockController::class, 'showFractionalListing'])->name('listings.show');
        Route::put('/listings/{id}/link-asset', [\App\Http\Controllers\Admin\LivestockController::class, 'linkAssetToFractionalListing'])->name('listings.link-asset')->middleware('permission:admin.livestock.manage');
        Route::delete('/listings/{id}', [\App\Http\Controllers\Admin\LivestockController::class, 'removeListing'])->name('listings.remove')->middleware('permission:admin.livestock.manage');
        Route::get('/payouts', [\App\Http\Controllers\Admin\LivestockController::class, 'payouts'])->name('payouts');
        Route::put('/payouts/{id}/approve', [\App\Http\Controllers\Admin\LivestockController::class, 'approvePayout'])->name('payouts.approve')->middleware('permission:admin.livestock.manage');

        // Buyers routes
        Route::get('/buyers', [\App\Http\Controllers\Admin\LivestockController::class, 'buyers'])->name('buyers');
        Route::get('/buyers/create', [\App\Http\Controllers\Admin\LivestockController::class, 'createBuyer'])->name('buyers.create');
        Route::post('/buyers', [\App\Http\Controllers\Admin\LivestockController::class, 'storeBuyer'])->name('buyers.store');
        Route::get('/buyers/{id}', [\App\Http\Controllers\Admin\LivestockController::class, 'showBuyer'])->name('buyers.show');
        Route::put('/buyers/{id}/link-asset', [\App\Http\Controllers\Admin\LivestockController::class, 'linkAssetToBuyer'])->name('buyers.link-asset')->middleware('permission:admin.livestock.manage');
        Route::put('/buyers/{id}/verify', [\App\Http\Controllers\Admin\LivestockController::class, 'verifyBuyer'])->name('buyers.verify')->middleware('permission:admin.livestock.manage');
        Route::put('/buyers/{id}/reject', [\App\Http\Controllers\Admin\LivestockController::class, 'rejectBuyer'])->name('buyers.reject')->middleware('permission:admin.livestock.manage');
        Route::delete('/buyers/{id}', [\App\Http\Controllers\Admin\LivestockController::class, 'deleteBuyer'])->name('buyers.delete')->middleware('permission:admin.livestock.manage');

        // Pre-Generated Tags Routes
        Route::get('/pre-generated-tags', [\App\Http\Controllers\Admin\PreGeneratedTagController::class, 'index'])->name('pre-generated-tags.index');
        Route::post('/pre-generated-tags', [\App\Http\Controllers\Admin\PreGeneratedTagController::class, 'store'])->name('pre-generated-tags.store');
        Route::post('/pre-generated-tags/generate', [\App\Http\Controllers\Admin\PreGeneratedTagController::class, 'generate'])->name('pre-generated-tags.generate');
        Route::post('/pre-generated-tags/{id}/assign', [\App\Http\Controllers\Admin\PreGeneratedTagController::class, 'assign'])->name('pre-generated-tags.assign');
        Route::post('/pre-generated-tags/{id}/unassign', [\App\Http\Controllers\Admin\PreGeneratedTagController::class, 'unassign'])->name('pre-generated-tags.unassign');
        Route::delete('/pre-generated-tags/{id}', [\App\Http\Controllers\Admin\PreGeneratedTagController::class, 'destroy'])->name('pre-generated-tags.destroy');
    });

// Country Management Routes (Admin Only)
Route::prefix('admin/countries')
    ->middleware(['auth', 'EnsureEmailIsVerified', 'topics.selected', 'role:admin', 'permission:admin.countries.read'])
    ->name('admin.countries.')
    ->group(function () {
        Route::get('/', [\App\Http\Controllers\Admin\CountryController::class, 'index'])->name('index');
        Route::get('/create', [\App\Http\Controllers\Admin\CountryController::class, 'create'])->name('create')->middleware('permission:admin.countries.create');
        Route::post('/', [\App\Http\Controllers\Admin\CountryController::class, 'store'])->name('store')->middleware('permission:admin.countries.create');
        Route::get('/{country}/edit', [\App\Http\Controllers\Admin\CountryController::class, 'edit'])->name('edit')->middleware('permission:admin.countries.update');
        Route::put('/{country}', [\App\Http\Controllers\Admin\CountryController::class, 'update'])->name('update')->middleware('permission:admin.countries.update');
        Route::delete('/{country}', [\App\Http\Controllers\Admin\CountryController::class, 'destroy'])->name('destroy')->middleware('permission:admin.countries.delete');
    });



Route::middleware(['auth', 'EnsureEmailIsVerified', 'topics.selected'])->group(function () {
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

    // Integrations (organization only)
    Route::prefix('integrations')->name('integrations.')->middleware('role:organization')->group(function () {
        Route::get('/youtube', [IntegrationsController::class, 'youtube'])->name('youtube');
        Route::get('/youtube/redirect', [IntegrationsController::class, 'redirectToYouTube'])->name('youtube.redirect');
        Route::get('/youtube/callback', [IntegrationsController::class, 'youtubeCallback'])->name('youtube.callback');
        Route::put('/youtube', [IntegrationsController::class, 'updateYoutube'])->name('youtube.update');
    });
});


// route for donation
Route::middleware(['auth', 'EnsureEmailIsVerified', 'topics.selected'])->group(function () {
    Route::post('/donate', [DonationController::class, 'store'])->name('donations.store');
    Route::get('/donations/success', [DonationController::class, 'success'])->name('donations.success');
    Route::get('/donations/cancel', [DonationController::class, 'cancel'])->name('donations.cancel');
});

// Organization donations route
Route::middleware(['auth', 'EnsureEmailIsVerified', 'role:organization', 'topics.selected'])->group(function () {
    Route::get('/donations', [DonationController::class, 'organizationIndex'])->name('donations.index');
});

// Gift Cards routes
// Public routes (browse brands - everyone can see)
Route::get('/gift-cards', [App\Http\Controllers\GiftCardController::class, 'index'])->name('gift-cards.index');
Route::get('/gift-cards/brands', [App\Http\Controllers\GiftCardController::class, 'getBrands'])->name('gift-cards.brands');

// Organization routes (view purchased cards) - organization_pending cannot access until onboarding complete
Route::middleware(['auth', 'EnsureEmailIsVerified', 'topics.selected', 'role:organization|admin'])->group(function () {
    Route::get('/gift-cards/purchased', [App\Http\Controllers\GiftCardController::class, 'createdCards'])->name('gift-cards.created');
});

// Authenticated user routes (purchase) - Must come after specific routes
Route::middleware(['auth', 'EnsureEmailIsVerified', 'topics.selected', 'role.simple:user'])->group(function () {
    Route::get('/gift-cards/purchase/{brand}', [App\Http\Controllers\GiftCardController::class, 'showPurchase'])->name('gift-cards.purchase')->where('brand', '.*');
    Route::post('/gift-cards/purchase', [App\Http\Controllers\GiftCardController::class, 'purchase'])->name('gift-cards.purchase.store');
    Route::get('/gift-cards/my-cards', [App\Http\Controllers\GiftCardController::class, 'myCards'])->name('gift-cards.my-cards');
    Route::get('/gift-cards/payment/success', [App\Http\Controllers\GiftCardController::class, 'success'])->name('gift-cards.success');
});

// Public route for viewing brand details (before purchase) - must come before parameterized route
Route::get('/gift-cards/show', [App\Http\Controllers\GiftCardController::class, 'show'])->name('gift-cards.show');
// PDF download route - must come before parameterized route
Route::middleware(['auth', 'EnsureEmailIsVerified'])->group(function () {
    Route::get('/gift-cards/{giftCard}/download-pdf', [App\Http\Controllers\GiftCardController::class, 'downloadPdf'])->name('gift-cards.download-pdf');
    // Transaction lookup by order ID (for testing)
    Route::get('/gift-cards/transaction/lookup/{orderId}', [App\Http\Controllers\GiftCardController::class, 'lookupTransaction'])->name('gift-cards.transaction.lookup');
});
// This parameterized route must come LAST to avoid catching specific routes - for viewing purchased cards
// Requires authentication to view purchased gift cards
Route::middleware(['auth', 'EnsureEmailIsVerified'])->group(function () {
    Route::get('/gift-cards/{giftCard}', [App\Http\Controllers\GiftCardController::class, 'show'])->name('gift-cards.show.id');
});

// Plans route
Route::middleware(['auth', 'EnsureEmailIsVerified', 'topics.selected'])->group(function () {
    Route::get('/plans', [App\Http\Controllers\PlansController::class, 'index'])->name('plans.index');
    Route::post('/plans/{plan}/subscribe', [App\Http\Controllers\PlansController::class, 'subscribe'])->name('plans.subscribe');
    Route::get('/plans/success', [App\Http\Controllers\PlansController::class, 'success'])->name('plans.success');
    Route::post('/plans/cancel', [App\Http\Controllers\PlansController::class, 'cancel'])->name('plans.cancel');

    // Wallet subscription routes
    Route::get('/wallet/plans', [App\Http\Controllers\PlansController::class, 'getWalletPlans'])->name('wallet.plans');
    Route::post('/wallet/subscribe/{walletPlan}', [App\Http\Controllers\PlansController::class, 'subscribeWallet'])->name('wallet.subscribe');
    Route::get('/wallet/subscription/success', [App\Http\Controllers\PlansController::class, 'walletSubscriptionSuccess'])->name('wallet.subscription.success');
    Route::get('/wallet/subscription/cancel', [App\Http\Controllers\PlansController::class, 'walletSubscriptionCancel'])->name('wallet.subscription.cancel');
});

// Admin Phaze Webhook Management
Route::prefix('admin/phaze-webhooks')
    ->middleware(['auth', 'EnsureEmailIsVerified', 'role:admin', 'topics.selected'])
    ->name('admin.phaze-webhooks.')
    ->group(function () {
        Route::get('/', [App\Http\Controllers\Admin\PhazeWebhookManagementController::class, 'index'])->name('index');
        Route::post('/', [App\Http\Controllers\Admin\PhazeWebhookManagementController::class, 'store'])->name('store');
        Route::delete('/{id}', [App\Http\Controllers\Admin\PhazeWebhookManagementController::class, 'destroy'])->name('destroy');
    });

// Admin Email Packages Management
Route::prefix('admin/email-packages')
    ->middleware(['auth', 'EnsureEmailIsVerified', 'role:admin', 'topics.selected'])
    ->name('admin.email-packages.')
    ->group(function () {
        Route::get('/', [App\Http\Controllers\Admin\EmailPackageController::class, 'index'])->name('index');
        Route::get('/create', [App\Http\Controllers\Admin\EmailPackageController::class, 'create'])->name('create');
        Route::post('/', [App\Http\Controllers\Admin\EmailPackageController::class, 'store'])->name('store');
        Route::get('/{emailPackage}/edit', [App\Http\Controllers\Admin\EmailPackageController::class, 'edit'])->name('edit');
        Route::put('/{emailPackage}', [App\Http\Controllers\Admin\EmailPackageController::class, 'update'])->name('update');
        Route::delete('/{emailPackage}', [App\Http\Controllers\Admin\EmailPackageController::class, 'destroy'])->name('destroy');
    });

// Admin Service Categories Management
Route::prefix('admin/service-categories')
    ->middleware(['auth', 'EnsureEmailIsVerified', 'role:admin', 'topics.selected'])
    ->name('admin.service-categories.')
    ->group(function () {
        Route::get('/', [App\Http\Controllers\Admin\ServiceCategoryController::class, 'index'])->name('index');
        Route::get('/create', [App\Http\Controllers\Admin\ServiceCategoryController::class, 'create'])->name('create');
        Route::post('/', [App\Http\Controllers\Admin\ServiceCategoryController::class, 'store'])->name('store');
        Route::get('/{serviceCategory}/edit', [App\Http\Controllers\Admin\ServiceCategoryController::class, 'edit'])->name('edit');
        Route::put('/{serviceCategory}', [App\Http\Controllers\Admin\ServiceCategoryController::class, 'update'])->name('update');
        Route::delete('/{serviceCategory}', [App\Http\Controllers\Admin\ServiceCategoryController::class, 'destroy'])->name('destroy');
    });

// Admin Merchant Hub Categories Management
Route::prefix('admin/merchant-hub-categories')
    ->middleware(['auth', 'EnsureEmailIsVerified', 'role:admin', 'topics.selected'])
    ->name('admin.merchant-hub-categories.')
    ->group(function () {
        Route::get('/', [App\Http\Controllers\Admin\MerchantHubCategoryController::class, 'index'])->name('index');
        Route::get('/create', [App\Http\Controllers\Admin\MerchantHubCategoryController::class, 'create'])->name('create');
        Route::post('/', [App\Http\Controllers\Admin\MerchantHubCategoryController::class, 'store'])->name('store');
        Route::get('/{merchantHubCategory}/edit', [App\Http\Controllers\Admin\MerchantHubCategoryController::class, 'edit'])->name('edit');
        Route::put('/{merchantHubCategory}', [App\Http\Controllers\Admin\MerchantHubCategoryController::class, 'update'])->name('update');
        Route::delete('/{merchantHubCategory}', [App\Http\Controllers\Admin\MerchantHubCategoryController::class, 'destroy'])->name('destroy');
    });

// Admin Merchant Hub Management
Route::prefix('admin/merchant-hub')
    ->middleware(['auth', 'EnsureEmailIsVerified', 'role:admin', 'topics.selected'])
    ->name('admin.merchant-hub.')
    ->group(function () {
        // Dashboard
        Route::get('/', [App\Http\Controllers\Admin\MerchantHubController::class, 'index'])->name('index');

        // Merchants
        Route::prefix('merchants')->name('merchants.')->group(function () {
            Route::get('/', [App\Http\Controllers\Admin\MerchantHubController::class, 'merchantsIndex'])->name('index');
            Route::get('/create', [App\Http\Controllers\Admin\MerchantHubController::class, 'merchantsCreate'])->name('create');
            Route::post('/', [App\Http\Controllers\Admin\MerchantHubController::class, 'merchantsStore'])->name('store');
            Route::get('/{merchant}/edit', [App\Http\Controllers\Admin\MerchantHubController::class, 'merchantsEdit'])->name('edit');
            Route::put('/{merchant}', [App\Http\Controllers\Admin\MerchantHubController::class, 'merchantsUpdate'])->name('update');
            Route::delete('/{merchant}', [App\Http\Controllers\Admin\MerchantHubController::class, 'merchantsDestroy'])->name('destroy');
        });

        // Offers
        Route::prefix('offers')->name('offers.')->group(function () {
            Route::get('/', [App\Http\Controllers\Admin\MerchantHubController::class, 'offersIndex'])->name('index');
            Route::get('/create', [App\Http\Controllers\Admin\MerchantHubController::class, 'offersCreate'])->name('create');
            Route::post('/', [App\Http\Controllers\Admin\MerchantHubController::class, 'offersStore'])->name('store');
            Route::get('/{offer}/edit', [App\Http\Controllers\Admin\MerchantHubController::class, 'offersEdit'])->name('edit');
            Route::put('/{offer}', [App\Http\Controllers\Admin\MerchantHubController::class, 'offersUpdate'])->name('update');
            Route::delete('/{offer}', [App\Http\Controllers\Admin\MerchantHubController::class, 'offersDestroy'])->name('destroy');
        });

        // Redemptions
        Route::prefix('redemptions')->name('redemptions.')->group(function () {
            Route::get('/', [App\Http\Controllers\Admin\MerchantHubController::class, 'redemptionsIndex'])->name('index');
            Route::put('/{redemption}/status', [App\Http\Controllers\Admin\MerchantHubController::class, 'redemptionsUpdateStatus'])->name('update-status');
        });
    });

// Admin Exemption Certificates Management
Route::prefix('admin/exemption-certificates')
    ->middleware(['auth', 'EnsureEmailIsVerified', 'role:admin', 'topics.selected'])
    ->name('admin.exemption-certificates.')
    ->group(function () {
        Route::get('/', [App\Http\Controllers\Admin\ExemptionCertificateController::class, 'index'])->name('index');
        Route::get('/{exemptionCertificate}', [App\Http\Controllers\Admin\ExemptionCertificateController::class, 'show'])->name('show');
        Route::post('/{exemptionCertificate}/approve', [App\Http\Controllers\Admin\ExemptionCertificateController::class, 'approve'])->name('approve');
        Route::post('/{exemptionCertificate}/reject', [App\Http\Controllers\Admin\ExemptionCertificateController::class, 'reject'])->name('reject');
    });


// Admin Promotional Banners Management
Route::prefix('admin/promotional-banners')
    ->middleware(['auth', 'EnsureEmailIsVerified', 'role:admin', 'topics.selected', 'permission:promotional.banner.read'])
    ->name('admin.promotional-banners.')
    ->group(function () {
        Route::get('/', [App\Http\Controllers\Admin\PromotionalBannerController::class, 'index'])->name('index');
        Route::get('/create', [App\Http\Controllers\Admin\PromotionalBannerController::class, 'create'])->name('create');
        Route::post('/', [App\Http\Controllers\Admin\PromotionalBannerController::class, 'store'])->name('store');
        Route::get('/{promotionalBanner}/edit', [App\Http\Controllers\Admin\PromotionalBannerController::class, 'edit'])->name('edit');
        Route::put('/{promotionalBanner}', [App\Http\Controllers\Admin\PromotionalBannerController::class, 'update'])->name('update');
        Route::delete('/{promotionalBanner}', [App\Http\Controllers\Admin\PromotionalBannerController::class, 'destroy'])->name('destroy');
    });

// Admin Contact Page Management
Route::prefix('admin/contact-page')
    ->middleware(['auth', 'EnsureEmailIsVerified', 'role:admin', 'topics.selected'])
    ->name('admin.contact-page.')
    ->group(function () {
        Route::get('/', [App\Http\Controllers\Admin\ContactPageController::class, 'index'])->name('index');
        Route::get('/{section}/edit', [App\Http\Controllers\Admin\ContactPageController::class, 'edit'])->name('edit');
        Route::put('/{section}', [App\Http\Controllers\Admin\ContactPageController::class, 'update'])->name('update');
        Route::delete('/{contactPageContent}', [App\Http\Controllers\Admin\ContactPageController::class, 'destroy'])->name('destroy');
    });

// Admin Contact Submissions Management
Route::prefix('admin/contact-submissions')
    ->middleware(['auth', 'EnsureEmailIsVerified', 'role:admin', 'topics.selected'])
    ->name('admin.contact-submissions.')
    ->group(function () {
        Route::get('/', [App\Http\Controllers\Admin\ContactSubmissionController::class, 'index'])->name('index');
        Route::get('/{contactSubmission}', [App\Http\Controllers\Admin\ContactSubmissionController::class, 'show'])->name('show');
        Route::put('/{contactSubmission}/status', [App\Http\Controllers\Admin\ContactSubmissionController::class, 'updateStatus'])->name('update-status');
        Route::delete('/{contactSubmission}', [App\Http\Controllers\Admin\ContactSubmissionController::class, 'destroy'])->name('destroy');
});

// Admin Fundraise Leads (qualified leads from /fundraise funnel → Wefunder)
Route::prefix('admin/fundraise-leads')
    ->middleware(['auth', 'EnsureEmailIsVerified', 'role:admin', 'topics.selected'])
    ->name('admin.fundraise-leads.')
    ->group(function () {
        Route::get('/', [App\Http\Controllers\Admin\FundraiseLeadController::class, 'index'])->name('index');
    });

// Admin Plans Management
Route::prefix('admin/plans')
    ->middleware(['auth', 'EnsureEmailIsVerified', 'role:admin', 'topics.selected'])
    ->name('admin.plans.')
    ->group(function () {
        Route::get('/', [App\Http\Controllers\Admin\PlanController::class, 'index'])->name('index');
        Route::get('/subscribers', [App\Http\Controllers\Admin\PlanController::class, 'subscribers'])->name('subscribers');
        Route::get('/create', [App\Http\Controllers\Admin\PlanController::class, 'create'])->name('create');
        Route::post('/', [App\Http\Controllers\Admin\PlanController::class, 'store'])->name('store');
        Route::get('/{plan}', [App\Http\Controllers\Admin\PlanController::class, 'show'])->name('show');
        Route::get('/{plan}/edit', [App\Http\Controllers\Admin\PlanController::class, 'edit'])->name('edit');
        Route::put('/{plan}', [App\Http\Controllers\Admin\PlanController::class, 'update'])->name('update');
        Route::delete('/{plan}', [App\Http\Controllers\Admin\PlanController::class, 'destroy'])->name('destroy');

        // Plan Features
        Route::post('/{plan}/features', [App\Http\Controllers\Admin\PlanController::class, 'storeFeature'])->name('features.store');
        Route::put('/{plan}/features/{feature}', [App\Http\Controllers\Admin\PlanController::class, 'updateFeature'])->name('features.update');
        Route::delete('/{plan}/features/{feature}', [App\Http\Controllers\Admin\PlanController::class, 'destroyFeature'])->name('features.destroy');
    });

// Admin Wallet Plans Management
Route::prefix('admin/wallet-plans')
    ->middleware(['auth', 'EnsureEmailIsVerified', 'topics.selected'])
    ->name('admin.wallet-plans.')
    ->group(function () {
        Route::get('/', [App\Http\Controllers\Admin\WalletPlanController::class, 'index'])->middleware('permission:wallet.plan.read')->name('index');
        Route::get('/create', [App\Http\Controllers\Admin\WalletPlanController::class, 'create'])->middleware('permission:wallet.plan.create')->name('create');
        Route::post('/', [App\Http\Controllers\Admin\WalletPlanController::class, 'store'])->middleware('permission:wallet.plan.create')->name('store');
        Route::get('/{walletPlan}/edit', [App\Http\Controllers\Admin\WalletPlanController::class, 'edit'])->middleware('permission:wallet.plan.edit')->name('edit');
        Route::put('/{walletPlan}', [App\Http\Controllers\Admin\WalletPlanController::class, 'update'])->middleware('permission:wallet.plan.update')->name('update');
        Route::delete('/{walletPlan}', [App\Http\Controllers\Admin\WalletPlanController::class, 'destroy'])->middleware('permission:wallet.plan.delete')->name('destroy');
    });

// IRS BMF Management Routes
Route::prefix('irs-bmf')->name('irs-bmf.')->middleware(["auth", 'EnsureEmailIsVerified'])->group(function () {
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

Route::middleware(['web', 'auth', 'EnsureEmailIsVerified'])->prefix('frontend')->name('frontend.')->group(function () {
    Route::get('/raffles', [App\Http\Controllers\RaffleController::class, 'frontendIndex'])->name('raffles.index');
    Route::get('/raffles/{raffle}', [App\Http\Controllers\RaffleController::class, 'frontendShow'])->name('raffles.show');
    Route::post('/raffles/{raffle}/purchase', [App\Http\Controllers\RaffleController::class, 'purchaseTickets'])->name('raffles.purchase');
});

// Note: Stripe webhooks are handled by Laravel Cashier at /stripe/webhook
// Configure this URL in your Stripe dashboard
// The webhook will process checkout.session.completed events automatically

// Email Invite Routes
Route::middleware(['auth', 'EnsureEmailIsVerified', 'role:organization', 'topics.selected'])->prefix('email-invite')->name('email-invite.')->group(function () {
    Route::get('/', [App\Http\Controllers\EmailInviteController::class, 'index'])->name('index');
    Route::match(['get', 'post'], '/connect/gmail', [App\Http\Controllers\EmailInviteController::class, 'connectGmail'])->name('connect.gmail');
    Route::match(['get', 'post'], '/connect/outlook', [App\Http\Controllers\EmailInviteController::class, 'connectOutlook'])->name('connect.outlook');
    Route::get('/callback', [App\Http\Controllers\EmailInviteController::class, 'callback'])->name('callback');
    Route::post('/connections/{connection}/sync', [App\Http\Controllers\EmailInviteController::class, 'syncContacts'])->name('sync');
    Route::get('/connections/{connection}/sync-status', [App\Http\Controllers\EmailInviteController::class, 'checkSyncStatus'])->name('sync-status');
    Route::get('/contacts', [App\Http\Controllers\EmailInviteController::class, 'getContacts'])->name('contacts');
    Route::post('/send-invites', [App\Http\Controllers\EmailInviteController::class, 'sendInvites'])->name('send-invites');
    Route::post('/purchase-emails', [App\Http\Controllers\EmailInviteController::class, 'purchaseEmails'])->name('purchase-emails');
    Route::get('/purchase/success', [App\Http\Controllers\EmailInviteController::class, 'purchaseSuccess'])->name('purchase.success');
    Route::delete('/connections/{connection}', [App\Http\Controllers\EmailInviteController::class, 'disconnect'])->name('disconnect');
    Route::delete('/contacts/{contact}', [App\Http\Controllers\EmailInviteController::class, 'deleteContact'])->name('contacts.delete');
});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
