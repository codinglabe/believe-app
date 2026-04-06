<?php

namespace App\Providers;

use App\Models\NodeSell;
use App\Models\User;
use App\Observers\NodeSellObserver;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;
use Laravel\Cashier\Cashier;

class BroadcastServiceProvider extends ServiceProvider
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
    public function boot()
    {
        Broadcast::routes([
            'middleware' => ['auth'] // Adjust based on your auth middleware
        ]);

        require base_path('routes/channels.php');
    }
}
