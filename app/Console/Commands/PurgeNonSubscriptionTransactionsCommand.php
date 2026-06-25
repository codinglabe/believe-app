<?php

namespace App\Console\Commands;

use App\Models\BelievePointPurchase;
use App\Models\BelievePointWalletTransfer;
use App\Models\BelievePointsLedgerEntry;
use App\Models\BelievePointsRefund;
use App\Models\BridgeWallet;
use App\Models\CareAlliance;
use App\Models\CareAllianceDonation;
use App\Models\Donation;
use App\Models\FundMeDonation;
use App\Models\Merchant;
use App\Models\MerchantBrpTransaction;
use App\Models\MerchantBrpWallet;
use App\Models\NonprofitBarterTransaction;
use App\Models\Organization;
use App\Models\PaymentTransaction;
use App\Models\PhazeBalanceLedgerEntry;
use App\Models\PhazeBalanceWallet;
use App\Models\Plan;
use App\Models\RewardPointLedger;
use App\Models\Subscription;
use App\Models\SupporterBelievePointGift;
use App\Models\SupporterBrpTransaction;
use App\Models\SupporterBrpWallet;
use App\Models\Transaction;
use App\Models\User;
use App\Support\PlanFirstMonthWelcomeCredits;
use App\Support\StripeTestReference;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class PurgeNonSubscriptionTransactionsCommand extends Command
{
    protected $signature = 'transactions:purge-non-subscription
                            {--dry-run : Report counts without deleting}
                            {--force : Confirm deletion (required unless --dry-run)}';

    protected $description = 'Delete non-subscription and Stripe test-mode transaction history; zero balances except live active subscription entitlements';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $force = (bool) $this->option('force');

        if (! $dryRun && ! $force) {
            $this->error('Refusing to run without --force. Use --dry-run to preview first.');

            return self::FAILURE;
        }

        $activeSubscriptions = $this->activeSubscriptions();
        $activeUserIds = $this->activeOwnerIds($activeSubscriptions, User::class);
        $activeMerchantIds = $this->activeOwnerIds($activeSubscriptions, Merchant::class);
        $activeUserIdSet = array_fill_keys($activeUserIds, true);

        $subscriptionDbIds = $activeSubscriptions->pluck('id')->map(fn ($id) => (string) $id)->all();
        $subscriptionStripeIds = $activeSubscriptions->pluck('stripe_id')->filter()->values()->all();

        $protectedQuery = $this->protectedTransactionsQuery(
            $activeUserIds,
            $activeMerchantIds,
            $subscriptionDbIds,
            $subscriptionStripeIds,
        );

        $stripeTestLedgerCount = StripeTestReference::applyTransactionScope(Transaction::query())->count();

        $totalTransactions = Transaction::query()->count();
        $protectedTransactions = (clone $protectedQuery)
            ->whereNot(function (Builder $testScope) {
                StripeTestReference::applyTransactionScope($testScope);
            })
            ->count();
        $transactionsToDelete = Transaction::query()
            ->where(function (Builder $query) use ($protectedQuery) {
                $protectedIds = (clone $protectedQuery)->select('transactions.id');
                $query->whereNotIn('id', $protectedIds)
                    ->orWhere(function (Builder $testScope) {
                        StripeTestReference::applyTransactionScope($testScope);
                    });
            })
            ->count();

        $balancePreview = $this->previewBalanceResets($activeUserIdSet);
        $activityCounts = $this->activityRecordCounts();
        $stripeTestCounts = $this->stripeTestRecordCounts();

        $this->info('Active subscriptions: '.$activeSubscriptions->count());
        $this->info('Users with active subscription: '.count($activeUserIds));
        $this->info('Merchants with active subscription: '.count($activeMerchantIds));
        $this->newLine();
        $this->info('Ledger transactions total: '.$totalTransactions);
        $this->info('Protected (live subscription-related): '.$protectedTransactions);
        $this->warn('Stripe test-mode ledger rows (always removed): '.$stripeTestLedgerCount);
        $this->warn('Ledger transactions to delete: '.$transactionsToDelete);
        $this->newLine();
        $this->info('Stripe test / local-dev records to delete:');
        foreach ($stripeTestCounts as $label => $count) {
            if ($count > 0) {
                $this->line('  '.$label.': '.$count);
            }
        }
        $this->newLine();
        $this->info('Activity / payment records to delete:');
        foreach ($activityCounts as $label => $count) {
            $this->line('  '.$label.': '.$count);
        }
        $this->newLine();
        $this->info('Users to reset balances: '.$balancePreview['users_total']);
        $this->info('Users keeping subscription entitlements: '.$balancePreview['users_with_entitlements']);
        $this->warn('Users zeroed completely: '.$balancePreview['users_zeroed']);
        $this->line(sprintf(
            'Subscription entitlements preserved — AI Media Studio: %.2f, AI tokens: %d, emails: %d',
            $balancePreview['total_ai_media_credits'],
            $balancePreview['total_ai_tokens'],
            $balancePreview['total_emails'],
        ));
        $this->newLine();
        $this->info('Also zeroed: org wallet, BRP, Phaze, Bridge cache, Care Alliance pools, reward/BP ledgers');

        $activityToDelete = array_sum($activityCounts);
        $stripeTestToDelete = array_sum($stripeTestCounts);
        if ($transactionsToDelete <= 0 && $activityToDelete <= 0 && $stripeTestToDelete <= 0) {
            $this->comment('Nothing to change.');

            return self::SUCCESS;
        }

        if ($dryRun) {
            $this->newLine();
            $this->comment('Dry run only. Re-run with --force to apply.');

            return self::SUCCESS;
        }

        if (! $this->confirm(
            'Delete '.$transactionsToDelete.' ledger row(s), '.$activityToDelete.' activity/payment record(s), and reset all non-subscription balances? This cannot be undone.',
            false,
        )) {
            $this->comment('Cancelled.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($protectedQuery, $activeUserIdSet) {
            $protectedIds = (clone $protectedQuery)->select('transactions.id');

            Transaction::query()
                ->where(function (Builder $query) use ($protectedIds) {
                    $query->whereNotIn('id', $protectedIds)
                        ->orWhere(function (Builder $testScope) {
                            StripeTestReference::applyTransactionScope($testScope);
                        });
                })
                ->delete();

            $this->purgeStripeTestRecords();
            $this->purgeActivityRecords();
            $this->resetBalances($activeUserIdSet);
            $this->resetAuxiliaryBalances();
            $this->purgeBalanceLedgers();
        });

        $this->info('Deleted '.max(0, $transactionsToDelete).' non-subscription ledger row(s).');
        $this->info('Remaining ledger rows: '.Transaction::query()->count());
        $this->info('Believe Point purchases remaining: '.BelievePointPurchase::query()->count());
        $this->info('Balance reset complete.');

        return self::SUCCESS;
    }

    /** @return Collection<int, Subscription> */
    private function activeSubscriptions(): Collection
    {
        return Subscription::query()
            ->whereIn('stripe_status', ['active', 'trialing'])
            ->where(function (Builder $query) {
                $query->whereNull('ends_at')
                    ->orWhere('ends_at', '>', now());
            })
            ->whereNotNull('stripe_id')
            ->get(['id', 'user_id', 'user_type', 'stripe_id', 'type', 'stripe_status'])
            ->filter(fn (Subscription $subscription) => $this->isLiveSubscription($subscription))
            ->values();
    }

    private function isLiveSubscription(Subscription $subscription): bool
    {
        if (StripeTestReference::isTest($subscription->stripe_id)) {
            return false;
        }

        return ! Transaction::query()
            ->where(function (Builder $query) use ($subscription) {
                $query->where('meta->subscription_id', (string) $subscription->id)
                    ->orWhere('meta->stripe_subscription_id', $subscription->stripe_id)
                    ->orWhere('transaction_id', $subscription->stripe_id);
            })
            ->where(function (Builder $testScope) {
                StripeTestReference::applyTransactionScope($testScope);
            })
            ->exists();
    }

    /**
     * @return array<string, int>
     */
    private function stripeTestRecordCounts(): array
    {
        $counts = [
            'Stripe test ledger rows' => StripeTestReference::applyTransactionScope(Transaction::query())->count(),
        ];

        if (Schema::hasTable('subscriptions')) {
            $counts['Stripe test subscriptions'] = Subscription::query()
                ->where(function (Builder $query) {
                    StripeTestReference::applyColumnScope($query, 'stripe_id');
                })
                ->count();
        }

        if (Schema::hasTable('believe_point_purchases')) {
            $counts['Stripe test BP purchases'] = BelievePointPurchase::query()
                ->where(function (Builder $query) {
                    StripeTestReference::applyColumnScope($query, 'stripe_session_id');
                    $query->orWhere(function (Builder $intentScope) {
                        StripeTestReference::applyColumnScope($intentScope, 'stripe_payment_intent_id');
                    });
                })
                ->count();
        }

        if (Schema::hasTable('donations')) {
            $counts['Stripe test donations'] = Donation::query()
                ->where(function (Builder $query) {
                    StripeTestReference::applyColumnScope($query, 'transaction_id');
                })
                ->count();
        }

        return $counts;
    }

    private function purgeStripeTestRecords(): void
    {
        if (Schema::hasTable('subscriptions')) {
            $testSubscriptionIds = $this->stripeTestSubscriptionIds();

            if (Schema::hasTable('subscription_items') && $testSubscriptionIds !== []) {
                DB::table('subscription_items')
                    ->whereIn('subscription_id', $testSubscriptionIds)
                    ->delete();
            }

            Subscription::query()
                ->where(function (Builder $query) use ($testSubscriptionIds) {
                    StripeTestReference::applyColumnScope($query, 'stripe_id');

                    if ($testSubscriptionIds !== []) {
                        $query->orWhereIn('id', $testSubscriptionIds);
                    }
                })
                ->delete();
        }

        if (Schema::hasTable('believe_point_purchases')) {
            BelievePointPurchase::query()
                ->where(function (Builder $query) {
                    StripeTestReference::applyColumnScope($query, 'stripe_session_id');
                    $query->orWhere(function (Builder $intentScope) {
                        StripeTestReference::applyColumnScope($intentScope, 'stripe_payment_intent_id');
                    });
                })
                ->delete();
        }

        if (Schema::hasTable('donations')) {
            Donation::query()
                ->where(function (Builder $query) {
                    StripeTestReference::applyColumnScope($query, 'transaction_id');
                })
                ->delete();
        }

        if (Schema::hasTable('fundme_donations') && Schema::hasColumn('fundme_donations', 'stripe_payment_intent_id')) {
            FundMeDonation::query()
                ->where(function (Builder $query) {
                    StripeTestReference::applyColumnScope($query, 'stripe_payment_intent_id');
                })
                ->delete();
        }

        if (Schema::hasTable('care_alliance_donations') && Schema::hasColumn('care_alliance_donations', 'payment_reference')) {
            CareAllianceDonation::query()
                ->where(function (Builder $query) {
                    StripeTestReference::applyColumnScope($query, 'payment_reference');
                })
                ->delete();
        }
    }

    /** @return list<int> */
    private function stripeTestSubscriptionIds(): array
    {
        $ids = Subscription::query()
            ->where(function (Builder $query) {
                StripeTestReference::applyColumnScope($query, 'stripe_id');
            })
            ->pluck('id')
            ->all();

        $stripeIdsFromTestLedger = Transaction::query()
            ->where(function (Builder $testScope) {
                StripeTestReference::applyTransactionScope($testScope);
            })
            ->get(['meta'])
            ->flatMap(function (Transaction $transaction) {
                $meta = is_array($transaction->meta) ? $transaction->meta : [];

                return array_filter([
                    isset($meta['subscription_id']) ? (int) $meta['subscription_id'] : null,
                    $meta['stripe_subscription_id'] ?? null,
                ]);
            })
            ->unique()
            ->values()
            ->all();

        if ($stripeIdsFromTestLedger !== []) {
            $linkedIds = Subscription::query()
                ->where(function (Builder $query) use ($stripeIdsFromTestLedger) {
                    $query->whereIn('id', array_filter($stripeIdsFromTestLedger, 'is_int'))
                        ->orWhereIn('stripe_id', array_filter($stripeIdsFromTestLedger, 'is_string'));
                })
                ->pluck('id')
                ->all();

            $ids = array_values(array_unique(array_merge($ids, $linkedIds)));
        }

        return $ids;
    }

    /**
     * @param  Collection<int, Subscription>  $subscriptions
     * @return list<int>
     */
    private function activeOwnerIds(Collection $subscriptions, string $ownerClass): array
    {
        return $subscriptions
            ->where('user_type', $ownerClass)
            ->pluck('user_id')
            ->unique()
            ->values()
            ->all();
    }

    /**
     * @param  array<int, true>  $activeUserIdSet
     * @return array{
     *     users_total: int,
     *     users_with_entitlements: int,
     *     users_zeroed: int,
     *     total_ai_media_credits: float,
     *     total_ai_tokens: int,
     *     total_emails: int
     * }
     */
    private function previewBalanceResets(array $activeUserIdSet): array
    {
        $summary = [
            'users_total' => 0,
            'users_with_entitlements' => 0,
            'users_zeroed' => 0,
            'total_ai_media_credits' => 0.0,
            'total_ai_tokens' => 0,
            'total_emails' => 0,
        ];

        User::query()
            ->select([
                'id',
                'current_plan_details',
            ])
            ->orderBy('id')
            ->chunkById(200, function ($users) use ($activeUserIdSet, &$summary) {
                foreach ($users as $user) {
                    /** @var User $user */
                    $summary['users_total']++;
                    $allowances = $this->subscriptionBalanceAllowances(
                        $user,
                        isset($activeUserIdSet[$user->id]),
                    );

                    $hasEntitlements = $allowances['ai_media_studio_credits'] > 0
                        || $allowances['ai_tokens_included'] > 0
                        || $allowances['emails_included'] > 0;

                    if ($hasEntitlements) {
                        $summary['users_with_entitlements']++;
                    } else {
                        $summary['users_zeroed']++;
                    }

                    $summary['total_ai_media_credits'] += $allowances['ai_media_studio_credits'];
                    $summary['total_ai_tokens'] += $allowances['ai_tokens_included'];
                    $summary['total_emails'] += $allowances['emails_included'];
                }
            });

        return $summary;
    }

    /**
     * @param  array<int, true>  $activeUserIdSet
     */
    private function resetBalances(array $activeUserIdSet): void
    {
        User::query()
            ->select(['id', 'current_plan_details'])
            ->orderBy('id')
            ->chunkById(200, function ($users) use ($activeUserIdSet) {
                foreach ($users as $user) {
                    /** @var User $user */
                    $allowances = $this->subscriptionBalanceAllowances(
                        $user,
                        isset($activeUserIdSet[$user->id]),
                    );

                    User::query()->whereKey($user->id)->update($allowances);
                }
            });
    }

    private function resetAuxiliaryBalances(): void
    {
        Organization::query()->update(['balance' => 0]);

        if (Schema::hasTable('merchant_brp_wallets')) {
            MerchantBrpWallet::query()->update([
                'balance_brp' => 0,
                'reserved_brp' => 0,
                'spent_brp' => 0,
            ]);
        }

        if (Schema::hasTable('supporter_brp_wallets')) {
            SupporterBrpWallet::query()->update(['balance_brp' => 0]);
        }

        if (Schema::hasTable('phaze_balance_wallets')) {
            PhazeBalanceWallet::query()->update(['available_balance' => 0]);
        }

        if (Schema::hasTable('bridge_wallets')) {
            BridgeWallet::query()->update(['balance' => 0]);
        }

        if (Schema::hasTable('care_alliances')) {
            CareAlliance::query()->update(['balance_cents' => 0]);
        }
    }

    /**
     * @return array<string, int>
     */
    private function activityRecordCounts(): array
    {
        $counts = [];

        if (Schema::hasTable('believe_point_purchases')) {
            $counts['Believe Point purchases'] = BelievePointPurchase::query()->count();
        }

        if (Schema::hasTable('believe_point_wallet_transfers')) {
            $counts['BP wallet transfers'] = BelievePointWalletTransfer::query()->count();
        }

        if (Schema::hasTable('payment_transactions')) {
            $counts['Payment transactions'] = PaymentTransaction::query()->count();
        }

        if (Schema::hasTable('donations')) {
            $counts['Donations'] = Donation::query()->count();
        }

        if (Schema::hasTable('fundme_donations')) {
            $counts['FundMe donations'] = FundMeDonation::query()->count();
        }

        if (Schema::hasTable('care_alliance_donations')) {
            $counts['Care Alliance donations'] = CareAllianceDonation::query()->count();
        }

        if (Schema::hasTable('supporter_believe_point_gifts')) {
            $counts['Supporter BP gifts'] = SupporterBelievePointGift::query()->count();
        }

        if (Schema::hasTable('believe_points_refunds')) {
            $counts['Believe Points refunds'] = BelievePointsRefund::query()->count();
        }

        if (Schema::hasTable('nonprofit_barter_transactions')) {
            $counts['Nonprofit barter transactions'] = NonprofitBarterTransaction::query()->count();
        }

        return $counts;
    }

    private function purgeActivityRecords(): void
    {
        if (Schema::hasTable('payment_transactions')) {
            PaymentTransaction::query()->delete();
        }

        if (Schema::hasTable('believe_points_refunds')) {
            BelievePointsRefund::query()->delete();
        }

        if (Schema::hasTable('believe_point_wallet_transfers')) {
            BelievePointWalletTransfer::query()->delete();
        }

        if (Schema::hasTable('believe_point_purchases')) {
            BelievePointPurchase::query()->delete();
        }

        if (Schema::hasTable('supporter_believe_point_gifts')) {
            SupporterBelievePointGift::query()->delete();
        }

        if (Schema::hasTable('care_alliance_donations')) {
            CareAllianceDonation::query()->delete();
        }

        if (Schema::hasTable('fundme_donations')) {
            FundMeDonation::query()->delete();
        }

        if (Schema::hasTable('donations')) {
            Donation::query()->delete();
        }

        if (Schema::hasTable('nonprofit_barter_transactions')) {
            NonprofitBarterTransaction::query()->delete();
        }
    }

    private function purgeBalanceLedgers(): void
    {
        if (Schema::hasTable('reward_point_ledgers')) {
            RewardPointLedger::query()->delete();
        }

        if (Schema::hasTable('believe_points_ledger_entries')) {
            BelievePointsLedgerEntry::query()->delete();
        }

        if (Schema::hasTable('phaze_balance_ledger_entries')) {
            PhazeBalanceLedgerEntry::query()->delete();
        }

        if (Schema::hasTable('merchant_brp_transactions')) {
            MerchantBrpTransaction::query()->delete();
        }

        if (Schema::hasTable('supporter_brp_transactions')) {
            SupporterBrpTransaction::query()->delete();
        }
    }

    /**
     * Balances granted through the user's current active subscription checkout / renewals.
     *
     * @return array<string, int|float>
     */
    private function subscriptionBalanceAllowances(User $user, bool $hasActiveSubscription): array
    {
        $zeroed = [
            'balance' => 0,
            'reward_points' => 0,
            'believe_points' => 0,
            'processing_believe_points' => 0,
            'gifted_believe_points' => 0,
            'credits' => 0,
            'ai_media_studio_credits' => 0,
            'ai_tokens_included' => 0,
            'ai_tokens_used' => 0,
            'emails_included' => 0,
            'emails_used' => 0,
            'sms_included' => 0,
            'sms_used' => 0,
        ];

        if (! $hasActiveSubscription) {
            return $zeroed;
        }

        $details = is_array($user->current_plan_details) ? $user->current_plan_details : [];

        $initialAiMedia = (float) ($details['ai_media_studio_credits_granted'] ?? 0);
        $renewalAiMedia = 0.0;

        if (Schema::hasTable('ai_media_studio_subscription_invoice_grants')) {
            $renewalAiMedia = (float) DB::table('ai_media_studio_subscription_invoice_grants')
                ->where('user_id', $user->id)
                ->sum('credits_granted');
        }

        $zeroed['ai_media_studio_credits'] = round($initialAiMedia + $renewalAiMedia, 2);

        if (! empty($details['first_month_welcome_granted'])) {
            $zeroed['ai_tokens_included'] = (int) (
                $details['first_month_welcome_ai_tokens'] ?? PlanFirstMonthWelcomeCredits::aiTokensAmount()
            );
            $zeroed['emails_included'] = (int) (
                $details['first_month_welcome_emails'] ?? PlanFirstMonthWelcomeCredits::emailsAmount()
            );
        }

        return $zeroed;
    }

    /**
     * @param  list<int|string>  $activeUserIds
     * @param  list<int|string>  $activeMerchantIds
     * @param  list<string>  $subscriptionDbIds
     * @param  list<string>  $subscriptionStripeIds
     */
    private function protectedTransactionsQuery(
        array $activeUserIds,
        array $activeMerchantIds,
        array $subscriptionDbIds,
        array $subscriptionStripeIds,
    ): Builder {
        return Transaction::query()->where(function (Builder $query) use (
            $activeUserIds,
            $activeMerchantIds,
            $subscriptionDbIds,
            $subscriptionStripeIds,
        ) {
            if ($activeUserIds !== []) {
                $query->where(function (Builder $userScope) use ($activeUserIds) {
                    $userScope->whereIn('user_id', $activeUserIds)
                        ->where(function (Builder $subscriptionRows) {
                            $subscriptionRows
                                ->whereIn('type', [
                                    'wallet_subscription',
                                    'plan_subscription',
                                    'kyc_fee',
                                    'plan_welcome_bonus',
                                ])
                                ->orWhere('related_type', Plan::class)
                                ->orWhereNotNull('meta->wallet_plan_id')
                                ->orWhere(function (Builder $planPurchase) {
                                    $planPurchase->where('type', 'purchase')
                                        ->whereNotNull('meta->plan_id')
                                        ->whereNotNull('meta->plan_name');
                                });
                        });
                });
            }

            if ($subscriptionDbIds !== []) {
                $query->orWhereIn('meta->subscription_id', $subscriptionDbIds);
            }

            if ($subscriptionStripeIds !== []) {
                $query->orWhereIn('meta->stripe_subscription_id', $subscriptionStripeIds)
                    ->orWhereIn('transaction_id', $subscriptionStripeIds);
            }

            if ($activeMerchantIds !== []) {
                $query->orWhere(function (Builder $merchantScope) use ($activeMerchantIds, $subscriptionDbIds) {
                    $merchantScope->whereIn('meta->merchant_id', $activeMerchantIds)
                        ->where(function (Builder $merchantSubscriptionRows) use ($subscriptionDbIds) {
                            $merchantSubscriptionRows->where('type', 'merchant_subscription');

                            if ($subscriptionDbIds !== []) {
                                $merchantSubscriptionRows->orWhereIn('meta->subscription_id', $subscriptionDbIds);
                            }
                        });
                });
            }
        });
    }
}
