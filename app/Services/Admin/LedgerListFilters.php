<?php

namespace App\Services\Admin;

use App\Models\BelievePointPurchase;
use App\Models\CareAllianceDonation;
use App\Models\Donation;
use App\Models\Enrollment;
use App\Models\FundMeDonation;
use App\Models\GiftCard;
use App\Models\MerchantHubOfferRedemption;
use App\Models\MerchantHubReferralReward;
use App\Models\Order;
use App\Models\Organization;
use App\Models\Plan;
use App\Models\Raffle;
use App\Models\ServiceOrder;
use App\Models\Transaction;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Schema;

/**
 * Query-layer filters for the admin transaction ledger (approximates UnifiedLedgerPresenter module rules).
 */
final class LedgerListFilters
{
    /**
     * @return array<int, string>
     */
    public static function moduleOptions(): array
    {
        return [
            'donation',
            'fundme',
            'campaign',
            'marketplace',
            'servicehub',
            'course',
            'merchant_hub',
            'organization_subscription',
            'merchant_subscription',
            'payout',
            'refund',
            'adjustment',
            'believe_points',
        ];
    }

    public static function applyOrganization(Builder $query, int $organizationId): void
    {
        if ($organizationId < 1) {
            return;
        }

        $query->where(function (Builder $q) use ($organizationId) {
            $q->where('meta->organization_id', $organizationId)
                ->orWhere(function (Builder $q2) use ($organizationId) {
                    $q2->where('related_type', Organization::class)
                        ->where('related_id', $organizationId);
                });

            if (Schema::hasTable('donations')) {
                $q->orWhereExists(function ($sub) use ($organizationId) {
                    $sub->from('donations')
                        ->where('donations.organization_id', $organizationId)
                        ->whereRaw(self::donationIdEqualsMetaDonationIdExpr());
                });
            }
        });
    }

    public static function applyPeriod(Builder $query, string $period): void
    {
        $period = strtolower(trim($period));
        if (! in_array($period, ['day', 'week', 'month', 'year'], true)) {
            return;
        }

        $start = match ($period) {
            'day' => Carbon::now()->startOfDay(),
            'week' => Carbon::now()->startOfWeek(),
            'month' => Carbon::now()->startOfMonth(),
            'year' => Carbon::now()->startOfYear(),
        };

        $query->whereRaw('COALESCE(processed_at, created_at) >= ?', [$start]);
    }

    public static function applyModule(Builder $query, string $module): void
    {
        $module = strtolower(trim($module));
        $allowed = self::moduleOptions();
        if (! in_array($module, $allowed, true)) {
            return;
        }

        match ($module) {
            'refund' => self::scopeRefund($query),
            'payout' => self::scopePayout($query),
            'campaign' => self::scopeCampaign(self::withRefundPayoutExclusion($query)),
            'fundme' => self::scopeFundme(self::withRefundPayoutExclusion($query)),
            'donation' => self::scopeDonation(self::withRefundPayoutExclusion($query)),
            'servicehub' => self::scopeServicehub(self::withRefundPayoutExclusion($query)),
            'course' => self::scopeCourse(self::withRefundPayoutExclusion($query)),
            'merchant_hub' => self::scopeMerchantHub(self::withRefundPayoutExclusion($query)),
            'organization_subscription' => self::scopeOrganizationSubscription(self::withRefundPayoutExclusion($query)),
            'merchant_subscription' => self::scopeMerchantSubscription(self::withRefundPayoutExclusion($query)),
            'adjustment' => self::scopeAdjustment(self::withRefundPayoutExclusion($query)),
            'marketplace' => self::scopeMarketplace(self::withRefundPayoutExclusion($query)),
            'believe_points' => self::scopeBelievePoints($query),
            default => null,
        };
    }

    private static function withRefundPayoutExclusion(Builder $query): Builder
    {
        $query->whereNot(function (Builder $q) {
            $q->where('type', 'refund')
                ->orWhere('status', Transaction::STATUS_REFUND);
        })->whereNotIn('type', ['withdrawal', 'transfer_out']);

        return $query;
    }

    private static function scopeRefund(Builder $query): void
    {
        $query->where(function (Builder $q) {
            $q->where('type', 'refund')
                ->orWhere('status', Transaction::STATUS_REFUND);
        });
    }

    private static function scopePayout(Builder $query): void
    {
        $query->whereIn('type', ['withdrawal', 'transfer_out']);
    }

    private static function scopeCampaign(Builder $query): void
    {
        $query->where(function (Builder $q) {
            $q->where('related_type', CareAllianceDonation::class)
                ->orWhereNotNull('meta->care_alliance_donation_id')
                ->orWhere('meta->source', 'care_alliance_split')
                ->orWhere('meta->source', 'care_alliance_campaign_split');
        });
    }

    private static function scopeFundme(Builder $query): void
    {
        $query->where(function (Builder $q) {
            $q->where('related_type', FundMeDonation::class)
                ->orWhereNotNull('meta->fundme_donation_id')
                ->orWhereNotNull('meta->fundme_campaign_id');
        });
    }

    /**
     * Rows classified as the ledger "donation" module (direct Believe donations; excludes Care Alliance & FundMe).
     *
     * @see \App\Services\Admin\UnifiedLedgerPresenter::resolveModule
     */
    private static function whereMatchesDonationModule(Builder $query): void
    {
        $query->where(function (Builder $q) {
            $q->where(function (Builder $inner) {
                $inner->where(function (Builder $d) {
                    $d->where('related_type', Donation::class)
                        ->whereNotNull('related_id');
                })
                    ->orWhereNotNull('meta->donation_id')
                    ->orWhere('meta->source', 'organization_donation')
                    ->orWhere('payment_method', 'donation')
                    ->orWhere(function (Builder $p) {
                        $p->where('meta->ledger_role', 'donor_payment')
                            ->whereNotNull('meta->donation_id');
                    });
            })
                ->whereNot(function (Builder $ex) {
                    $ex->where('related_type', CareAllianceDonation::class)
                        ->orWhereNotNull('meta->care_alliance_donation_id')
                        ->orWhere('meta->source', 'care_alliance_split')
                        ->orWhere('meta->source', 'care_alliance_campaign_split');
                })
                ->whereNot(function (Builder $ex) {
                    $ex->where('related_type', FundMeDonation::class)
                        ->orWhereNotNull('meta->fundme_donation_id')
                        ->orWhereNotNull('meta->fundme_campaign_id');
                });
        });
    }

    private static function scopeDonation(Builder $query): void
    {
        self::whereMatchesDonationModule($query);
    }

    private static function scopeServicehub(Builder $query): void
    {
        $query->where(function (Builder $q) {
            $q->where('related_type', ServiceOrder::class)
                ->orWhereNotNull('meta->service_order_id');
        });
    }

    private static function scopeCourse(Builder $query): void
    {
        $query->where(function (Builder $q) {
            $q->where('related_type', Enrollment::class)
                ->orWhereNotNull('meta->enrollment_id');
        });
    }

    private static function scopeMerchantHub(Builder $query): void
    {
        $query->where(function (Builder $q) {
            $q->where('related_type', MerchantHubOfferRedemption::class)
                ->orWhere('related_type', MerchantHubReferralReward::class);
        });
    }

    private static function scopeOrganizationSubscription(Builder $query): void
    {
        $query->where(function (Builder $q) {
            $q->where('related_type', Plan::class)
                ->orWhereIn('type', ['plan_subscription', 'kyc_fee', 'wallet_subscription'])
                ->orWhereNotNull('meta->wallet_plan_id')
                ->orWhere(function (Builder $c) {
                    $c->where('type', 'commission')
                        ->where(function (Builder $m) {
                            $m->whereNull('meta->merchant_id')
                                ->orWhere('meta->merchant_id', '')
                                ->orWhere('meta->merchant_id', '0');
                        });
                });
        });
    }

    private static function scopeMerchantSubscription(Builder $query): void
    {
        $query->where(function (Builder $q) {
            $q->where(function (Builder $c) {
                $c->where('type', 'commission')
                    ->whereNotNull('meta->merchant_id')
                    ->where('meta->merchant_id', '!=', '')
                    ->where('meta->merchant_id', '!=', '0');
            })
                ->orWhere(function (Builder $m) {
                    $m->whereNotNull('meta->merchant_id')
                        ->where('meta->merchant_id', '!=', '')
                        ->where('meta->merchant_id', '!=', '0')
                        ->whereNotNull('meta->subscription_id');
                });
        });
    }

    private static function scopeAdjustment(Builder $query): void
    {
        $query->where(function (Builder $q) {
            $q->where('type', 'adjustment')
                ->orWhereNotNull('meta->adjustment_reason');
        });
    }

    private static function scopeBelievePoints(Builder $query): void
    {
        $query->where(function (Builder $q) {
            $q->where(function (Builder $bp) {
                $bp->where('related_type', BelievePointPurchase::class)
                    ->orWhere('related_type', 'like', '%BelievePointPurchase')
                    ->orWhere('meta->source', 'believe_points_purchase')
                    ->orWhere('meta->source', 'believe_points_purchase_refund');
            })
                ->whereNot(function (Builder $rf) {
                    $rf->where('type', 'refund')
                        ->orWhere('status', Transaction::STATUS_REFUND);
                });
        });
    }

    private static function scopeMarketplace(Builder $query): void
    {
        $query->where(function (Builder $q) {
            $q->where('related_type', Order::class)
                ->orWhere('related_type', GiftCard::class)
                ->orWhere('related_type', Raffle::class)
                ->orWhere(function (Builder $p) {
                    $p->where('type', 'purchase')
                        ->whereNot(function (Builder $bp) {
                            $bp->where('related_type', BelievePointPurchase::class)
                                ->orWhere('related_type', 'like', '%BelievePointPurchase');
                        })
                        ->whereNot(function (Builder $don) {
                            self::whereMatchesDonationModule($don);
                        })
                        ->whereNot(function (Builder $mh) {
                            $mh->where('related_type', MerchantHubOfferRedemption::class)
                                ->orWhere('related_type', MerchantHubReferralReward::class);
                        })
                        ->whereNot(function (Builder $so) {
                            $so->where('related_type', ServiceOrder::class)
                                ->orWhereNotNull('meta->service_order_id');
                        })
                        ->whereNot(function (Builder $en) {
                            $en->where('related_type', Enrollment::class)
                                ->orWhereNotNull('meta->enrollment_id');
                        })
                        ->whereNot(function (Builder $ca) {
                            $ca->where('related_type', CareAllianceDonation::class)
                                ->orWhereNotNull('meta->care_alliance_donation_id')
                                ->orWhere('meta->source', 'care_alliance_split')
                                ->orWhere('meta->source', 'care_alliance_campaign_split');
                        })
                        ->whereNot(function (Builder $fm) {
                            $fm->where('related_type', FundMeDonation::class)
                                ->orWhereNotNull('meta->fundme_donation_id')
                                ->orWhereNotNull('meta->fundme_campaign_id');
                        });
                })
                ->orWhere('type', 'transfer_in')
                ->orWhere(function (Builder $dep) {
                    $dep->where('type', 'deposit')
                        ->where(function (Builder $z) {
                            $z->whereNull('meta->donation_id')
                                ->where(function (Builder $pm) {
                                    $pm->whereNull('payment_method')
                                        ->orWhere('payment_method', 'not like', '%donat%');
                                });
                        })
                        ->whereNot(function (Builder $so) {
                            $so->where('related_type', ServiceOrder::class)
                                ->orWhereNotNull('meta->service_order_id');
                        })
                        ->whereNot(function (Builder $en) {
                            $en->where('related_type', Enrollment::class)
                                ->orWhereNotNull('meta->enrollment_id');
                        })
                        ->whereNot(function (Builder $ca) {
                            $ca->where('related_type', CareAllianceDonation::class)
                                ->orWhereNotNull('meta->care_alliance_donation_id')
                                ->orWhere('meta->source', 'care_alliance_split')
                                ->orWhere('meta->source', 'care_alliance_campaign_split');
                        })
                        ->whereNot(function (Builder $fm) {
                            $fm->where('related_type', FundMeDonation::class)
                                ->orWhereNotNull('meta->fundme_donation_id')
                                ->orWhereNotNull('meta->fundme_campaign_id');
                        });
                });
        });
    }

    private static function donationIdEqualsMetaDonationIdExpr(): string
    {
        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'sqlite') {
            return 'donations.id = CAST(json_extract(transactions.meta, \'$.donation_id\') AS INTEGER)';
        }

        return 'donations.id = CAST(JSON_UNQUOTE(JSON_EXTRACT(transactions.meta, \'$.donation_id\')) AS UNSIGNED)';
    }
}
