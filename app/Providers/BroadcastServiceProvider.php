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
        Broadcast::routes(['middleware' => ['auth']]);

        // Add debug logging
        \Log::info('Broadcast routes registered');

        require base_path('routes/channels.php');
    }
}
