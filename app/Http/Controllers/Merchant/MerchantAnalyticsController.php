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
use Carbon\Carbon;

class MerchantAnalyticsController extends Controller
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
     * Display analytics page with statistics
     */
    public function index(Request $request)
    {
        $merchant = Auth::guard('merchant')->user();
        $timeRange = $request->get('timeRange', '30d');

        // Get or create MerchantHubMerchant for this merchant
        $merchantHubMerchant = $this->getOrCreateMerchantHubMerchant($merchant);

        // Get all offer IDs for this merchant
        $offerIds = MerchantHubOffer::where('merchant_hub_merchant_id', $merchantHubMerchant->id)
            ->pluck('id')
            ->toArray();

        // Calculate date range based on timeRange
        $endDate = now();
        $startDate = match($timeRange) {
            '7d' => now()->subDays(7),
            '30d' => now()->subDays(30),
            '90d' => now()->subDays(90),
            '1y' => now()->subYear(),
            default => now()->subDays(30),
        };

        $previousStartDate = $startDate->copy()->sub($endDate->diffInDays($startDate) + 1, 'days');
        $previousEndDate = $startDate->copy()->subDay();

        $stats = [];
        $weeklyRedemptions = [];
        $revenueData = [];
        $topOffers = [];

        if (!empty($offerIds)) {
            // Current period stats
            $currentRedemptions = MerchantHubOfferRedemption::whereIn('merchant_hub_offer_id', $offerIds)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->get();

            $previousRedemptions = MerchantHubOfferRedemption::whereIn('merchant_hub_offer_id', $offerIds)
                ->whereBetween('created_at', [$previousStartDate, $previousEndDate])
                ->get();

            // Total redemptions
            $totalRedemptions = $currentRedemptions->count();
            $previousTotalRedemptions = $previousRedemptions->count();
            $redemptionGrowth = $previousTotalRedemptions > 0 
                ? (($totalRedemptions - $previousTotalRedemptions) / $previousTotalRedemptions) * 100 
                : ($totalRedemptions > 0 ? 100 : 0);

            // Total revenue (cash_spent)
            $totalRevenue = $currentRedemptions->sum('cash_spent');
            $previousRevenue = $previousRedemptions->sum('cash_spent');
            $revenueGrowth = $previousRevenue > 0 
                ? (($totalRevenue - $previousRevenue) / $previousRevenue) * 100 
                : ($totalRevenue > 0 ? 100 : 0);

            // Average points per redemption
            $totalPoints = $currentRedemptions->sum('points_spent');
            $averagePointsPerRedemption = $totalRedemptions > 0 
                ? (int) ($totalPoints / $totalRedemptions) 
                : 0;

            // Active customers (unique users)
            $activeCustomers = MerchantHubOfferRedemption::whereIn('merchant_hub_offer_id', $offerIds)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->distinct('user_id')
                ->count('user_id');

            $stats = [
                'totalRedemptions' => $totalRedemptions,
                'totalRevenue' => (float) $totalRevenue,
                'averagePointsPerRedemption' => $averagePointsPerRedemption,
                'activeCustomers' => $activeCustomers,
                'redemptionGrowth' => round($redemptionGrowth, 1),
                'revenueGrowth' => round($revenueGrowth, 1),
            ];

            // Weekly redemptions data
            if ($timeRange === '7d' || $timeRange === '30d') {
                // Group by week
                $weeklyData = MerchantHubOfferRedemption::whereIn('merchant_hub_offer_id', $offerIds)
                    ->whereBetween('created_at', [$startDate, $endDate])
                    ->select(
                        DB::raw('WEEK(created_at) as week'),
                        DB::raw('YEAR(created_at) as year'),
                        DB::raw('SUM(points_spent) as total_points')
                    )
                    ->groupBy('year', 'week')
                    ->orderBy('year', 'asc')
                    ->orderBy('week', 'asc')
                    ->get();

                $weekCounter = 1;
                foreach ($weeklyData as $week) {
                    $weeklyRedemptions[] = [
                        'week' => 'Week ' . $weekCounter,
                        'value' => (int) $week->total_points
                    ];
                    $weekCounter++;
                }
            } else {
                // For longer periods, group by month
                $monthlyData = MerchantHubOfferRedemption::whereIn('merchant_hub_offer_id', $offerIds)
                    ->whereBetween('created_at', [$startDate, $endDate])
                    ->select(
                        DB::raw('MONTH(created_at) as month'),
                        DB::raw('YEAR(created_at) as year'),
                        DB::raw('SUM(points_spent) as total_points')
                    )
                    ->groupBy('year', 'month')
                    ->orderBy('year', 'asc')
                    ->orderBy('month', 'asc')
                    ->get();

                $monthCounter = 1;
                foreach ($monthlyData as $month) {
                    $weeklyRedemptions[] = [
                        'week' => 'M' . $monthCounter,
                        'value' => (int) $month->total_points
                    ];
                    $monthCounter++;
                }
            }

            // Revenue data (weekly or monthly based on timeRange)
            if ($timeRange === '7d' || $timeRange === '30d') {
                $revenueWeeklyData = MerchantHubOfferRedemption::whereIn('merchant_hub_offer_id', $offerIds)
                    ->whereBetween('created_at', [$startDate, $endDate])
                    ->select(
                        DB::raw('WEEK(created_at) as week'),
                        DB::raw('YEAR(created_at) as year'),
                        DB::raw('SUM(cash_spent) as total_revenue')
                    )
                    ->groupBy('year', 'week')
                    ->orderBy('year', 'asc')
                    ->orderBy('week', 'asc')
                    ->get();

                $weekCounter = 1;
                foreach ($revenueWeeklyData as $week) {
                    $revenueData[] = [
                        'week' => 'W' . $weekCounter,
                        'value' => (float) $week->total_revenue
                    ];
                    $weekCounter++;
                }
            } else {
                $revenueMonthlyData = MerchantHubOfferRedemption::whereIn('merchant_hub_offer_id', $offerIds)
                    ->whereBetween('created_at', [$startDate, $endDate])
                    ->select(
                        DB::raw('MONTH(created_at) as month'),
                        DB::raw('YEAR(created_at) as year'),
                        DB::raw('SUM(cash_spent) as total_revenue')
                    )
                    ->groupBy('year', 'month')
                    ->orderBy('year', 'asc')
                    ->orderBy('month', 'asc')
                    ->get();

                $monthCounter = 1;
                foreach ($revenueMonthlyData as $month) {
                    $revenueData[] = [
                        'week' => 'M' . $monthCounter,
                        'value' => (float) $month->total_revenue
                    ];
                    $monthCounter++;
                }
            }

            // Top performing offers
            $topOffersData = MerchantHubOfferRedemption::whereIn('merchant_hub_offer_id', $offerIds)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->with('offer')
                ->select(
                    'merchant_hub_offer_id',
                    DB::raw('COUNT(*) as redemptions'),
                    DB::raw('SUM(cash_spent) as revenue')
                )
                ->groupBy('merchant_hub_offer_id')
                ->orderBy('redemptions', 'desc')
                ->limit(10)
                ->get();

            $topOffers = $topOffersData->map(function ($item) {
                return [
                    'id' => (string) $item->merchant_hub_offer_id,
                    'title' => $item->offer->title ?? 'N/A',
                    'redemptions' => (int) $item->redemptions,
                    'revenue' => (float) $item->revenue,
                ];
            });
        } else {
            // No offers yet
            $stats = [
                'totalRedemptions' => 0,
                'totalRevenue' => 0.0,
                'averagePointsPerRedemption' => 0,
                'activeCustomers' => 0,
                'redemptionGrowth' => 0,
                'revenueGrowth' => 0,
            ];
        }

        return Inertia::render('merchant/Analytics', [
            'stats' => $stats,
            'weeklyRedemptions' => $weeklyRedemptions,
            'revenueData' => $revenueData,
            'topOffers' => $topOffers,
            'timeRange' => $timeRange,
        ]);
    }
}

