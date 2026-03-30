<?php

namespace App\Services;

use App\Models\CareAlliance;
use App\Models\CareAllianceMembership;
use App\Models\Donation;
use App\Models\Organization;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Splits normal (main /donate flow) Care Alliance donations across member org wallets and alliance balance.
 * Campaign-specific donations use {@see CareAllianceSplitService} instead.
 */
class CareAllianceGeneralDonationDistributionService
{
    /**
     * Whether funds stay in a pending pool until the scheduled release (weekly / monthly / quarterly).
     */
    public static function distributionIsScheduled(?string $frequency): bool
    {
        return in_array((string) ($frequency ?? 'instant'), ['weekly', 'monthly', 'quarterly'], true);
    }

    /**
     * Apply computed shares to the alliance ledger (`balance_cents`), the creator’s user wallet (`creator_user_id` → `users.balance`),
     * and each member nonprofit owner (`organizations.user_id` → `users.balance`).
     * Used for both instant payouts and scheduled releases after the pending pool flushes.
     *
     * @param  array<int, array{organization_id: int, cents: int}>  $orgShares
     */
    public function creditSplitToWallets(CareAlliance $alliance, array $orgShares, int $feeCents): void
    {
        if ($feeCents > 0) {
            $alliance->increment('balance_cents', $feeCents);

            $creatorId = (int) ($alliance->creator_user_id ?? 0);
            $feeDollars = round($feeCents / 100, 2);
            if ($creatorId > 0 && $feeDollars > 0) {
                $creator = User::query()->find($creatorId);
                if ($creator) {
                    $creator->increment('balance', $feeDollars);
                    $creator->recordTransaction([
                        'type' => 'deposit',
                        'amount' => $feeDollars,
                        'payment_method' => 'care_alliance_split',
                        'meta' => [
                            'source' => 'care_alliance_split',
                            'role' => 'alliance_fee',
                            'care_alliance_id' => $alliance->id,
                            'care_alliance_name' => $alliance->name,
                        ],
                    ]);
                } else {
                    Log::warning('Care Alliance fee: creator user balance not updated (missing user?)', [
                        'care_alliance_id' => $alliance->id,
                        'creator_user_id' => $creatorId,
                        'fee_dollars' => $feeDollars,
                    ]);
                }
            } elseif ($feeDollars > 0) {
                Log::warning('Care Alliance fee: no creator_user_id; credited balance_cents only', [
                    'care_alliance_id' => $alliance->id,
                    'fee_cents' => $feeCents,
                ]);
            }
        }

        foreach ($orgShares as $row) {
            $oid = (int) ($row['organization_id'] ?? 0);
            $cents = (int) ($row['cents'] ?? 0);
            if ($oid < 1 || $cents < 1) {
                continue;
            }

            $org = Organization::query()->select(['id', 'user_id'])->find($oid);
            if (! $org) {
                Log::warning('Care Alliance split: organization not found', [
                    'care_alliance_id' => $alliance->id,
                    'organization_id' => $oid,
                    'cents' => $cents,
                ]);

                continue;
            }

            $userId = (int) ($org->user_id ?? 0);
            if ($userId < 1) {
                Log::warning('Care Alliance split: organization has no owner user_id; cannot credit user balance', [
                    'care_alliance_id' => $alliance->id,
                    'organization_id' => $oid,
                    'cents' => $cents,
                ]);

                continue;
            }

            $dollars = round($cents / 100, 2);
            if ($dollars <= 0) {
                continue;
            }

            $user = User::query()->find($userId);
            if ($user) {
                $user->increment('balance', $dollars);
                $user->recordTransaction([
                    'type' => 'deposit',
                    'amount' => $dollars,
                    'payment_method' => 'care_alliance_split',
                    'meta' => [
                        'source' => 'care_alliance_split',
                        'role' => 'member_share',
                        'care_alliance_id' => $alliance->id,
                        'care_alliance_name' => $alliance->name,
                        'organization_id' => $oid,
                    ],
                ]);
            } else {
                Log::warning('Care Alliance split: user balance not updated (missing user?)', [
                    'care_alliance_id' => $alliance->id,
                    'organization_id' => $oid,
                    'user_id' => $userId,
                    'dollars' => $dollars,
                ]);
            }
        }
    }

    /**
     * @param  array<int, array{organization_id: int, cents: int}>  $orgShares
     */
    public function distributeCompletedDonation(Donation $donation, CareAlliance $alliance, array $orgShares, int $feeCents): void
    {
        DB::transaction(function () use ($donation, $alliance, $orgShares, $feeCents) {
            $this->creditSplitToWallets($alliance, $orgShares, $feeCents);
        });

        Log::info('Care Alliance general donation distributed', [
            'donation_id' => $donation->id,
            'care_alliance_id' => $alliance->id,
            'fee_cents' => $feeCents,
            'shares' => $orgShares,
        ]);
    }

    /**
     * Hold split amounts until {@see releasePendingIfDue()} runs after the configured period.
     *
     * @param  array<int, array{organization_id: int, cents: int}>  $orgShares
     */
    public function accumulatePendingDistribution(CareAlliance $alliance, array $orgShares, int $feeCents): void
    {
        DB::transaction(function () use ($alliance, $orgShares, $feeCents) {
            $locked = CareAlliance::query()->whereKey($alliance->id)->lockForUpdate()->firstOrFail();
            $state = $locked->pending_distribution_json;
            if (! is_array($state)) {
                $state = ['org_cents' => [], 'fee_cents' => 0];
            }
            $orgCents = $state['org_cents'] ?? [];
            if (! is_array($orgCents)) {
                $orgCents = [];
            }
            foreach ($orgShares as $row) {
                $oid = (int) ($row['organization_id'] ?? 0);
                $cents = (int) ($row['cents'] ?? 0);
                if ($oid < 1 || $cents < 1) {
                    continue;
                }
                $key = (string) $oid;
                $orgCents[$key] = (int) ($orgCents[$key] ?? 0) + $cents;
            }
            $state['org_cents'] = $orgCents;
            $state['fee_cents'] = (int) ($state['fee_cents'] ?? 0) + $feeCents;

            $hasAny = $feeCents > 0 || array_sum(array_map('intval', $orgCents)) > 0;
            $locked->pending_distribution_json = $state;
            if ($hasAny && $locked->pending_distribution_started_at === null) {
                $locked->pending_distribution_started_at = now();
            }
            $locked->save();
        });

        Log::info('Care Alliance donation queued for scheduled distribution', [
            'care_alliance_id' => $alliance->id,
            'fee_cents' => $feeCents,
            'shares' => $orgShares,
        ]);
    }

    /**
     * Move any pooled amounts to wallets immediately (e.g. when the alliance switches to Instant distribution).
     */
    public function releasePendingImmediately(CareAlliance $alliance): bool
    {
        return (bool) DB::transaction(function () use ($alliance) {
            $locked = CareAlliance::query()->whereKey($alliance->id)->lockForUpdate()->first();
            if (! $locked) {
                return false;
            }

            return $this->flushPendingStateToWallets($locked, true);
        });
    }

    /**
     * Release pending pool to wallets if the schedule window has elapsed. Returns true if a release ran.
     */
    public function releasePendingIfDue(CareAlliance $alliance): bool
    {
        return (bool) DB::transaction(function () use ($alliance) {
            $locked = CareAlliance::query()->whereKey($alliance->id)->lockForUpdate()->first();
            if (! $locked) {
                return false;
            }

            if (! self::distributionIsScheduled($locked->distribution_frequency)) {
                return false;
            }

            $started = $locked->pending_distribution_started_at;
            if (! $started instanceof Carbon) {
                return false;
            }

            $days = match ($locked->distribution_frequency) {
                'weekly' => 7,
                'monthly' => 30,
                'quarterly' => 90,
                default => 0,
            };
            if ($days < 1) {
                return false;
            }

            if ($started->copy()->addDays($days)->isFuture()) {
                return false;
            }

            return $this->flushPendingStateToWallets($locked, false);
        });
    }

    /**
     * Flush pooled cents to wallets. When {@see $ignoreMinPayout} is false (scheduled release), each recipient
     * (alliance fee + each member org bucket) must meet {@see CareAlliance::$min_payout_cents} from Financial Settings
     * before any of that bucket is paid; sub-minimum amounts stay in the pool.
     * When true (e.g. switching to Instant), everything is paid out.
     *
     * @return bool True if any amount was credited (partial flush counts)
     */
    private function flushPendingStateToWallets(CareAlliance $locked, bool $ignoreMinPayout = false): bool
    {
        $state = $locked->pending_distribution_json;
        if (! is_array($state)) {
            return false;
        }

        $fee = (int) ($state['fee_cents'] ?? 0);
        $orgCents = $state['org_cents'] ?? [];
        if (! is_array($orgCents)) {
            $orgCents = [];
        }

        $totalOrg = array_sum(array_map('intval', $orgCents));
        if ($fee < 1 && $totalOrg < 1) {
            return false;
        }

        $minCents = (int) ($locked->min_payout_cents ?? 0);
        if ($minCents < 1) {
            $minCents = 1;
        }

        $payOrgShares = [];
        $remainingOrgCents = [];
        $payFee = 0;
        $remainingFeeCents = 0;

        if ($ignoreMinPayout) {
            $payFee = $fee;
            foreach ($orgCents as $oid => $cents) {
                $cents = (int) $cents;
                if ($cents > 0) {
                    $payOrgShares[] = ['organization_id' => (int) $oid, 'cents' => $cents];
                }
            }
        } else {
            $payFee = $fee >= $minCents ? $fee : 0;
            $remainingFeeCents = $fee >= $minCents ? 0 : $fee;

            foreach ($orgCents as $oid => $cents) {
                $cents = (int) $cents;
                if ($cents < 1) {
                    continue;
                }
                $oidInt = (int) $oid;
                if ($cents >= $minCents) {
                    $payOrgShares[] = ['organization_id' => $oidInt, 'cents' => $cents];
                } else {
                    $remainingOrgCents[(string) $oidInt] = $cents;
                }
            }

            if ($payFee < 1 && $payOrgShares === []) {
                return false;
            }
        }

        $this->creditSplitToWallets($locked, $payOrgShares, $payFee);

        if ($ignoreMinPayout) {
            $locked->pending_distribution_json = null;
            $locked->pending_distribution_started_at = null;
        } else {
            $hasRemainder = $remainingFeeCents > 0 || $remainingOrgCents !== [];
            if ($hasRemainder) {
                $locked->pending_distribution_json = [
                    'org_cents' => $remainingOrgCents,
                    'fee_cents' => $remainingFeeCents,
                ];
            } else {
                $locked->pending_distribution_json = null;
                $locked->pending_distribution_started_at = null;
            }
        }

        $locked->save();

        Log::info('Care Alliance pending distribution flushed to wallets', [
            'care_alliance_id' => $locked->id,
            'ignore_min_payout' => $ignoreMinPayout,
            'min_payout_cents' => $ignoreMinPayout ? null : $minCents,
            'fee_paid_cents' => $payFee,
            'fee_remaining_cents' => $ignoreMinPayout ? 0 : $remainingFeeCents,
            'org_shares_paid' => $payOrgShares,
        ]);

        return true;
    }

    /**
     * Process all alliances that may have due scheduled releases (for the console scheduler).
     */
    public function releaseAllDuePendingDistributions(): int
    {
        $count = 0;
        CareAlliance::query()
            ->whereIn('distribution_frequency', ['weekly', 'monthly', 'quarterly'])
            ->whereNotNull('pending_distribution_json')
            ->orderBy('id')
            ->chunkById(100, function ($alliances) use (&$count) {
                foreach ($alliances as $alliance) {
                    if ($this->releasePendingIfDue($alliance)) {
                        $count++;
                    }
                }
            });

        return $count;
    }

    /**
     * Rows for $100 demo on profile financial settings (labels + cents + % of total).
     *
     * @return list<array{label: string, cents: int, percent: float, tone: string}>
     */
    public function buildExamplePreview(CareAlliance $alliance, int $demoCents = 10000): array
    {
        $dist = $this->computeDistribution($alliance, $demoCents);
        $rows = [];
        foreach ($dist['org_shares'] as $share) {
            $org = Organization::find($share['organization_id']);
            $pct = $demoCents > 0 ? round(100 * $share['cents'] / $demoCents, 1) : 0;
            $rows[] = [
                'label' => $org?->name ?? 'Member organization',
                'cents' => $share['cents'],
                'percent' => $pct,
                'tone' => 'emerald',
            ];
        }
        if ($dist['fee_cents'] > 0) {
            $rows[] = [
                'label' => ($alliance->name ?: 'Alliance').' (Alliance)',
                'cents' => $dist['fee_cents'],
                'percent' => $demoCents > 0 ? round(100 * $dist['fee_cents'] / $demoCents, 1) : 0,
                'tone' => 'violet',
            ];
        }

        return $rows;
    }

    /**
     * Build org share rows + fee cents from alliance financial rules.
     *
     * @return array{fee_cents: int, org_shares: list<array{organization_id: int, cents: int}>}
     */
    public function computeDistribution(CareAlliance $alliance, int $amountCents): array
    {
        if ($amountCents < 1) {
            return ['fee_cents' => 0, 'org_shares' => []];
        }

        $feeBps = (int) ($alliance->management_fee_bps ?? 0);
        if ($feeBps < 0) {
            $feeBps = 0;
        }
        if ($feeBps > 10000) {
            $feeBps = 10000;
        }

        $feeCents = (int) floor($amountCents * $feeBps / 10000);
        $method = $alliance->allocation_method ?? 'proportional_equal';

        if ($method === 'fixed_percentage') {
            $poolBps = (int) ($alliance->financial_fixed_member_pool_bps ?? 0);
            if ($poolBps < 0) {
                $poolBps = 0;
            }
            if ($poolBps > 10000) {
                $poolBps = 10000;
            }
            $memberOrgIds = $this->activeMemberOrganizationIds($alliance);
            $poolCents = (int) floor($amountCents * $poolBps / 10000);

            // Fee + pool are % of gross; flooring can leave small remainders — credit dust to the alliance fee so 100% is allocated.
            $allocated = $feeCents + $poolCents;
            if ($allocated < $amountCents) {
                $feeCents += $amountCents - $allocated;
            }

            return [
                'fee_cents' => $feeCents,
                'org_shares' => $this->equalShares($memberOrgIds, $poolCents),
            ];
        }

        $memberOrgIds = $this->activeMemberOrganizationIds($alliance);
        $remainderCents = $amountCents - $feeCents;
        if ($remainderCents < 1 || $memberOrgIds === []) {
            return ['fee_cents' => $feeCents, 'org_shares' => []];
        }

        if ($method === 'weighted_by_donations') {
            return [
                'fee_cents' => $feeCents,
                'org_shares' => $this->weightedByDonationsShares($memberOrgIds, $remainderCents),
            ];
        }

        return [
            'fee_cents' => $feeCents,
            'org_shares' => $this->equalShares($memberOrgIds, $remainderCents),
        ];
    }

    /**
     * @return list<int>
     */
    public function activeMemberOrganizationIds(CareAlliance $alliance): array
    {
        return CareAllianceMembership::query()
            ->where('care_alliance_id', $alliance->id)
            ->where('status', 'active')
            ->pluck('organization_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    /**
     * @param  list<int>  $memberOrgIds
     * @return list<array{organization_id: int, cents: int}>
     */
    private function equalShares(array $memberOrgIds, int $remainderCents): array
    {
        $n = count($memberOrgIds);
        if ($n < 1) {
            return [];
        }

        $out = [];
        $allocated = 0;
        foreach ($memberOrgIds as $i => $oid) {
            $isLast = $i === $n - 1;
            $cents = $isLast ? ($remainderCents - $allocated) : (int) floor($remainderCents / $n);
            $allocated += $cents;
            $out[] = ['organization_id' => $oid, 'cents' => $cents];
        }

        return $out;
    }

    /**
     * @param  list<int>  $memberOrgIds
     * @return list<array{organization_id: int, cents: int}>
     */
    private function weightedByDonationsShares(array $memberOrgIds, int $remainderCents): array
    {
        if ($memberOrgIds === []) {
            return [];
        }

        $weights = [];
        foreach ($memberOrgIds as $oid) {
            $sum = Donation::query()
                ->where('organization_id', $oid)
                ->whereIn('status', ['completed', 'active'])
                ->sum('amount');
            $weights[$oid] = (float) $sum;
        }

        $totalWeight = array_sum($weights);
        if ($totalWeight <= 0) {
            return $this->equalShares($memberOrgIds, $remainderCents);
        }

        $out = [];
        $allocated = 0;
        $ids = array_values($memberOrgIds);
        $last = count($ids) - 1;

        foreach ($ids as $i => $oid) {
            $w = $weights[$oid] ?? 0;
            $isLast = $i === $last;
            $cents = $isLast
                ? ($remainderCents - $allocated)
                : (int) floor($remainderCents * ($w / $totalWeight));
            $allocated += $cents;
            $out[] = ['organization_id' => $oid, 'cents' => $cents];
        }

        return $out;
    }
}
