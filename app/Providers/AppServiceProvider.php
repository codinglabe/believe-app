<?php

namespace App\Providers;

use App\Listeners\AwardInviteRewardPoints;
use App\Models\Donation;
use App\Models\Enrollment;
use App\Models\FundMeDonation;
use App\Models\JobApplication;
use App\Models\NodeSell;
use App\Models\User;
use App\Notifications\Channels\FirebaseChannel;
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
        Donation::observe(DonationObserver::class);
        Enrollment::observe(EnrollmentObserver::class);
        JobApplication::observe(JobApplicationObserver::class);
        Cashier::useCustomerModel(User::class);
        Cashier::calculateTaxes();

        // Register event listener for email verification
        Event::listen(Verified::class, AwardInviteRewardPoints::class);

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
