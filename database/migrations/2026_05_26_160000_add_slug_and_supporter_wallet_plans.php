<?php

use App\Models\WalletPlan;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('wallet_plans', 'slug')) {
            Schema::table('wallet_plans', function (Blueprint $table) {
                $table->string('slug')->nullable()->unique()->after('name');
            });
        }

        WalletPlan::query()->updateOrCreate(
            ['slug' => 'free_supporter'],
            [
                'name' => 'Free Supporter',
                'frequency' => 'monthly',
                'price' => 0,
                'one_time_fee' => null,
                'description' => 'Follow organizations, donate, join groups, and access core Believe In Unity supporter features.',
                'trial_days' => 0,
                'is_active' => true,
                'sort_order' => 1,
            ]
        );

        WalletPlan::query()->updateOrCreate(
            ['slug' => 'prime_supporter'],
            [
                'name' => 'Prime Supporter',
                'frequency' => 'monthly',
                'price' => 4.99,
                'one_time_fee' => null,
                'description' => 'Full Unity Meet access, 2X BRP rewards, premium deals, bonus sweepstakes entries, and exclusive member benefits.',
                'trial_days' => 0,
                'is_active' => true,
                'sort_order' => 2,
            ]
        );
    }

    public function down(): void
    {
        WalletPlan::query()->whereIn('slug', ['free_supporter', 'prime_supporter'])->delete();

        if (Schema::hasColumn('wallet_plans', 'slug')) {
            Schema::table('wallet_plans', function (Blueprint $table) {
                $table->dropColumn('slug');
            });
        }
    }
};
