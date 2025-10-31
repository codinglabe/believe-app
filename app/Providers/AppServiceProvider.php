<?php

namespace App\Providers;

use App\Models\NodeSell;
use App\Models\User;
use App\Observers\NodeSellObserver;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Auth;
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
        Inertia::share([
            'auth' => fn () => [
                'user' => Auth::user(),
            ],
        ]);
        $this->app->make(ChannelManager::class)->extend('firebase', function ($app) {
            return new FirebaseChannel();
        });
    }
}
