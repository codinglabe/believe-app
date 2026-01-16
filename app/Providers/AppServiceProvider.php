<?php

namespace App\Providers;

use App\Models\NodeSell;
use App\Models\User;
use App\Observers\NodeSellObserver;
use App\Listeners\AwardInviteRewardPoints;
use Illuminate\Auth\Events\Verified;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Event;
use Inertia\Inertia;
use Laravel\Cashier\Cashier;

use App\Notifications\Channels\FirebaseChannel;
use Illuminate\Notifications\ChannelManager;
use Illuminate\Support\ServiceProvider;

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
        Cashier::useCustomerModel(User::class);
        
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
            return new FirebaseChannel();
        });
    }
}
