<?php

namespace App\Providers;

use App\Listeners\AwardInviteRewardPoints;
use App\Listeners\CompleteBelievePointPurchaseFromStripeWebhook;
use App\Listeners\SyncLedgerTransactionStripeFees;
use App\Listeners\SyncMainDonationFromStripeWebhook;
use App\Models\BelievePointPurchase;
use App\Models\Donation;
use App\Models\Enrollment;
use App\Models\FundMeDonation;
use App\Models\JobApplication;
use App\Models\NodeSell;
use App\Models\Subscription as AppSubscription;
use App\Models\User;
use App\Notifications\Channels\FirebaseChannel;
use App\Observers\BelievePointPurchaseObserver;
use App\Observers\DonationObserver;
use App\Observers\EnrollmentObserver;
use App\Observers\FundMeDonationObserver;
use App\Observers\JobApplicationObserver;
use App\Observers\NodeSellObserver;
use Illuminate\Auth\Events\Verified;
use Illuminate\Notifications\ChannelManager;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;
use Laravel\Cashier\Cashier;
use Laravel\Cashier\Events\WebhookReceived;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        NodeSell::observe(NodeSellObserver::class);
        FundMeDonation::observe(FundMeDonationObserver::class);
        BelievePointPurchase::observe(BelievePointPurchaseObserver::class);
        Donation::observe(DonationObserver::class);
        Enrollment::observe(EnrollmentObserver::class);
        JobApplication::observe(JobApplicationObserver::class);
        Cashier::useCustomerModel(User::class);
        Cashier::useSubscriptionModel(AppSubscription::class);
        if ((bool) config('services.stripe.automatic_tax', false)) {
            Cashier::calculateTaxes();
        }

        // Register event listener for email verification
        Event::listen(Verified::class, AwardInviteRewardPoints::class);

        // Cashier Stripe webhooks: sync ledger fees from PaymentIntent metadata; Believe Points settlement
        Event::listen(WebhookReceived::class, SyncLedgerTransactionStripeFees::class);
        Event::listen(WebhookReceived::class, CompleteBelievePointPurchaseFromStripeWebhook::class);
        Event::listen(WebhookReceived::class, SyncMainDonationFromStripeWebhook::class);

        Inertia::share([
            'auth' => function () {
                $user = Auth::user();

                return [
                    'user' => $user,
                    'roles' => $user?->getRoleNames()->toArray() ?? [],
                    'permissions' => $user?->getAllPermissions()->pluck('name')->toArray() ?? [],
                ];
            },
        ]);
        $this->app->make(ChannelManager::class)->extend('firebase', function ($app) {
            return new FirebaseChannel;
        });
    }
}
