<?php

namespace App\Http\Controllers\Merchant;

use App\Http\Controllers\Controller;
use App\Models\MerchantHubOffer;
use App\Models\MerchantHubOfferRedemption;
use App\Models\MerchantHubMerchant;
use App\Models\Merchant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class MerchantDashboardController extends Controller
{
    protected function pctChange(float $recent, float $prior): ?float
    {
        if ($prior <= 0.0) {
            return $recent > 0 ? 100.0 : null;
        }

        return round((($recent - $prior) / $prior) * 100, 1);
    }

    /**
     * Get or create MerchantHubMerchant for the authenticated merchant
     */
    protected function getOrCreateMerchantHubMerchant(Merchant $merchant): MerchantHubMerchant
    {
        $merchantHubMerchant = MerchantHubMerchant::where('name', $merchant->business_name ?? $merchant->name)
            ->orWhere('slug', \Illuminate\Support\Str::slug($merchant->business_name ?? $merchant->name))
            ->first();

        if (!$merchantHubMerchant) {
            $merchantHubMerchant = MerchantHubMerchant::create([
                'name' => $merchant->business_name ?? $merchant->name,
                'slug' => \Illuminate\Support\Str::slug($merchant->business_name ?? $merchant->name) . '-' . $merchant->id,
                'is_active' => true,
            ]);
        }

        return $merchantHubMerchant;
    }

    /**
     * Display the merchant dashboard with statistics
     */
    public function index(Request $request)
    {
        $merchant = Auth::guard('merchant')->user();

        // Get or create MerchantHubMerchant for this merchant
        $merchantHubMerchant = $this->getOrCreateMerchantHubMerchant($merchant);

        // Get all offer IDs for this merchant
        $offerIds = MerchantHubOffer::where('merchant_hub_merchant_id', $merchantHubMerchant->id)
            ->pluck('id')
            ->toArray();

        // Calculate statistics
        $activeOffers = MerchantHubOffer::where('merchant_hub_merchant_id', $merchantHubMerchant->id)
            ->where('status', 'active')
            ->count();

        $totalRedemptions = 0;
        $weeklyRedemptions = [];
        $recentRedemptions = [];
        $rewardsData = [];
        $totalCustomers = 0;
        $weeklyPointsChartGrowthPercent = null;
        $weeklyRedemptionsCountGrowthPercent = null;
        $growth = [
            'activeOffersNew' => null,
            'redemptions' => null,
            'pointsEarned' => null,
            'customers' => null,
        ];

        $redemptionBase = fn () => MerchantHubOfferRedemption::whereIn('merchant_hub_offer_id', $offerIds);

        if (!empty($offerIds)) {
            // Total redemptions
            $totalRedemptions = (int) $redemptionBase()->count();

            $totalCustomers = (int) $redemptionBase()->distinct('user_id')->count('user_id');

            $last7 = now()->subDays(7);
            $prev7End = $last7;
            $prev7Start = now()->subDays(14);

            $newOffersLast7 = (int) MerchantHubOffer::where('merchant_hub_merchant_id', $merchantHubMerchant->id)
                ->where('created_at', '>=', $last7)
                ->count();
            $newOffersPrev7 = (int) MerchantHubOffer::where('merchant_hub_merchant_id', $merchantHubMerchant->id)
                ->where('created_at', '>=', $prev7Start)
                ->where('created_at', '<', $prev7End)
                ->count();

            $redemptionsLast7 = (int) $redemptionBase()->clone()->where('created_at', '>=', $last7)->count();
            $redemptionsPrev7 = (int) $redemptionBase()->clone()
                ->where('created_at', '>=', $prev7Start)
                ->where('created_at', '<', $prev7End)
                ->count();

            $pointsLast7 = (int) $redemptionBase()->clone()->where('created_at', '>=', $last7)->sum('points_spent');
            $pointsPrev7 = (int) $redemptionBase()->clone()
                ->where('created_at', '>=', $prev7Start)
                ->where('created_at', '<', $prev7End)
                ->sum('points_spent');

            $customersLast7 = (int) $redemptionBase()->clone()->where('created_at', '>=', $last7)->distinct('user_id')->count('user_id');
            $customersPrev7 = (int) $redemptionBase()->clone()
                ->where('created_at', '>=', $prev7Start)
                ->where('created_at', '<', $prev7End)
                ->distinct('user_id')
                ->count('user_id');

            $growth['activeOffersNew'] = $this->pctChange((float) $newOffersLast7, (float) $newOffersPrev7);
            $growth['redemptions'] = $this->pctChange((float) $redemptionsLast7, (float) $redemptionsPrev7);
            $growth['pointsEarned'] = $this->pctChange((float) $pointsLast7, (float) $pointsPrev7);
            $growth['customers'] = $this->pctChange((float) $customersLast7, (float) $customersPrev7);

            $last7WeeksStart = now()->subDays(49);
            $prev7WeeksStart = now()->subDays(98);
            $pointsRollingLast7w = (int) $redemptionBase()->clone()->where('created_at', '>=', $last7WeeksStart)->sum('points_spent');
            $pointsRollingPrev7w = (int) $redemptionBase()->clone()
                ->where('created_at', '>=', $prev7WeeksStart)
                ->where('created_at', '<', $last7WeeksStart)
                ->sum('points_spent');
            $weeklyPointsChartGrowthPercent = $this->pctChange((float) $pointsRollingLast7w, (float) $pointsRollingPrev7w);

            $countsRollingLast7w = (int) $redemptionBase()->clone()->where('created_at', '>=', $last7WeeksStart)->count();
            $countsRollingPrev7w = (int) $redemptionBase()->clone()
                ->where('created_at', '>=', $prev7WeeksStart)
                ->where('created_at', '<', $last7WeeksStart)
                ->count();
            $weeklyRedemptionsCountGrowthPercent = $this->pctChange((float) $countsRollingLast7w, (float) $countsRollingPrev7w);

            // Weekly points redeemed (chart — last 7 rolling week buckets from DB)
            $weeklyData = $redemptionBase()->clone()
                ->select(
                    DB::raw('WEEK(created_at) as week'),
                    DB::raw('YEAR(created_at) as year'),
                    DB::raw('SUM(points_spent) as total_points')
                )
                ->where('created_at', '>=', now()->subWeeks(7))
                ->groupBy('year', 'week')
                ->orderBy('year', 'desc')
                ->orderBy('week', 'desc')
                ->limit(7)
                ->get();

            $weekCounter = 1;
            foreach ($weeklyData->reverse() as $week) {
                $weeklyRedemptions[] = [
                    'week' => 'W' . $weekCounter,
                    'value' => (int) $week->total_points,
                ];
                $weekCounter++;
            }

            while (count($weeklyRedemptions) < 7) {
                $weeklyRedemptions[] = [
                    'week' => 'W' . (count($weeklyRedemptions) + 1),
                    'value' => 0,
                ];
            }

            // Recent redemptions (last 5)
            $recentRedemptions = MerchantHubOfferRedemption::whereIn('merchant_hub_offer_id', $offerIds)
                ->with(['offer', 'user'])
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get()
                ->map(function ($redemption) {
                    return [
                        'id' => (string) $redemption->id,
                        'points' => $redemption->points_spent,
                        'status' => $redemption->status,
                        'code' => $redemption->receipt_code,
                        'customer_name' => $redemption->user->name ?? 'N/A',
                        'offer_title' => $redemption->offer->title ?? 'N/A',
                        'offer_image_url' => $redemption->offer->image_url ?? null,
                        'created_at' => $redemption->created_at->toIso8601String(),
                    ];
                });

            // Weekly reward redemption counts for bar chart
            $rewardsWeeklyData = $redemptionBase()->clone()
                ->select(
                    DB::raw('WEEK(created_at) as week'),
                    DB::raw('YEAR(created_at) as year'),
                    DB::raw('COUNT(*) as count')
                )
                ->where('created_at', '>=', now()->subWeeks(7))
                ->groupBy('year', 'week')
                ->orderBy('year', 'desc')
                ->orderBy('week', 'desc')
                ->limit(7)
                ->get();

            $weekCounter = 1;
            foreach ($rewardsWeeklyData->reverse() as $week) {
                $rewardsData[] = [
                    'week' => 'W' . $weekCounter,
                    'value' => (int) $week->count,
                ];
                $weekCounter++;
            }

            while (count($rewardsData) < 7) {
                $rewardsData[] = [
                    'week' => 'W' . (count($rewardsData) + 1),
                    'value' => 0,
                ];
            }
        } else {
            for ($i = 1; $i <= 7; $i++) {
                $weeklyRedemptions[] = ['week' => 'W' . $i, 'value' => 0];
                $rewardsData[] = ['week' => 'W' . $i, 'value' => 0];
            }
        }

        $totalPointsEarned = empty($offerIds)
            ? 0
            : (int) $redemptionBase()->sum('points_spent');

        $totalRewardsRedeemed = $totalRedemptions;
        $weeklyPointsRedeemedTotal = array_sum(array_column($weeklyRedemptions, 'value'));

        return Inertia::render('merchant/Dashboard', [
            'stats' => [
                'activeOffers' => $activeOffers,
                'totalRedemptions' => $totalRedemptions,
                'totalPointsEarned' => $totalPointsEarned,
                'totalRewardsRedeemed' => $totalRewardsRedeemed,
                'totalCustomers' => $totalCustomers,
                'growth' => $growth,
                'weeklyPointsRedeemedTotal' => $weeklyPointsRedeemedTotal,
                'weeklyPointsChartGrowthPercent' => $weeklyPointsChartGrowthPercent,
                'weeklyRedemptionsCountGrowthPercent' => $weeklyRedemptionsCountGrowthPercent,
            ],
            'weeklyRedemptions' => $weeklyRedemptions,
            'recentRedemptions' => $recentRedemptions,
            'rewardsData' => $rewardsData,
        ]);
    }
}

