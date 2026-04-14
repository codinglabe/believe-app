<?php

namespace App\Models;

use Laravel\Cashier\Subscription as CashierSubscription;

/**
 * Merchant subscriptions use polymorphic user_type + user_id. Cashier's default
 * owner() is belongsTo(User), so owner was null when user_id held a merchant id.
 */
class Subscription extends CashierSubscription
{
    protected static function booted(): void
    {
        static::creating(function (Subscription $subscription) {
            if (blank($subscription->user_type)) {
                $subscription->user_type = User::class;
            }
        });
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\MorphTo<\Illuminate\Database\Eloquent\Model, $this>
     */
    public function owner()
    {
        return $this->morphTo('owner', 'user_type', 'user_id');
    }
}
