<?php

namespace App\Providers;

use App\Models\NodeSell;
use App\Models\User;
use App\Observers\NodeSellObserver;
use Illuminate\Support\Facades\Auth;
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
        Cashier::useCustomerModel(User::class);
        Inertia::share([
            'auth' => fn () => [
                'user' => Auth::user(),
            ],
        ]);
    }
}
