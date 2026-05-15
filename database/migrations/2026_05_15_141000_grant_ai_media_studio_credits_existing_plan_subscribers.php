<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * One-time: add plan subscription AI Media Studio credits to users already on a plan or with an active default subscription.
 */
return new class extends Migration
{
    public function up(): void
    {
        $amount = (float) max(0, (int) config('services.ai_media_studio.plan_subscription_ai_media_studio_credits', 5));
        if ($amount < 0.01) {
            return;
        }

        $userType = User::class;

        DB::table('users')
            ->where(function ($q) use ($userType) {
                $q->whereNotNull('current_plan_id')
                    ->orWhereExists(function ($sub) use ($userType) {
                        $sub->select(DB::raw('1'))
                            ->from('subscriptions')
                            ->whereColumn('subscriptions.user_id', 'users.id')
                            ->where('subscriptions.user_type', $userType)
                            ->where('subscriptions.type', 'default')
                            ->whereIn('subscriptions.stripe_status', ['active', 'trialing']);
                    });
            })
            ->increment('ai_media_studio_credits', $amount);
    }

    public function down(): void
    {
        // Irreversible: cannot know which balances were granted by this migration.
    }
};
