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

        if (!empty($offerIds)) {
            // Total redemptions
            $totalRedemptions = MerchantHubOfferRedemption::whereIn('merchant_hub_offer_id', $offerIds)->count();

            // Weekly redemptions (last 7 weeks)
            $weeklyData = MerchantHubOfferRedemption::whereIn('merchant_hub_offer_id', $offerIds)
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
                    'week' => 'Week ' . $weekCounter,
                    'value' => (int) $week->total_points
                ];
                $weekCounter++;
            }

            // Fill in missing weeks with 0
            while (count($weeklyRedemptions) < 7) {
                $weeklyRedemptions[] = [
                    'week' => 'Week ' . count($weeklyRedemptions) + 1,
                    'value' => 0
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
                        'created_at' => $redemption->created_at->toIso8601String(),
                    ];
                });

            // Weekly rewards data (last 7 weeks) - count of redemptions per week
            $rewardsWeeklyData = MerchantHubOfferRedemption::whereIn('merchant_hub_offer_id', $offerIds)
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
                    'value' => (int) $week->count
                ];
                $weekCounter++;
            }

            // Fill in missing weeks with 0
            while (count($rewardsData) < 7) {
                $rewardsData[] = [
                    'week' => 'W' . (count($rewardsData) + 1),
                    'value' => 0
                ];
            }
        } else {
            // No offers yet, return empty data
            for ($i = 1; $i <= 7; $i++) {
                $weeklyRedemptions[] = ['week' => 'Week ' . $i, 'value' => 0];
                $rewardsData[] = ['week' => 'W' . $i, 'value' => 0];
            }
        }

        // Calculate total points earned from all redemptions
        $totalPointsEarned = 0;
        if (!empty($offerIds)) {
            $totalPointsEarned = MerchantHubOfferRedemption::whereIn('merchant_hub_offer_id', $offerIds)
                ->sum('points_spent');
        }

        // Calculate total rewards redeemed (count of redemptions)
        $totalRewardsRedeemed = $totalRedemptions;

        return Inertia::render('merchant/Dashboard', [
            'stats' => [
                'activeOffers' => $activeOffers,
                'totalRedemptions' => $totalRedemptions,
                'totalPointsEarned' => (int) $totalPointsEarned,
                'totalRewardsRedeemed' => $totalRewardsRedeemed,
            ],
            'weeklyRedemptions' => $weeklyRedemptions,
            'recentRedemptions' => $recentRedemptions,
            'rewardsData' => $rewardsData,
            'subscription_required' => $request->session()->get('subscription_required', false),
        ]);
    }
}

