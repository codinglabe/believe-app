<?php

namespace App\Http\Controllers;

use App\Models\MerchantBrpCampaign;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BrpCampaignBrowserController extends Controller
{
    /**
     * Browse active merchant BRP campaigns on the main app.
     */
    public function index(Request $request)
    {
        $query = MerchantBrpCampaign::query()
            ->where('status', 'active')
            ->with(['merchant:id,business_name,name']);

        if ($request->filled('search')) {
            $search = trim((string) $request->string('search'));
            $query->where(function ($builder) use ($search) {
                $builder->where('name', 'like', "%{$search}%")
                    ->orWhereHas('merchant', function ($merchantQuery) use ($search) {
                        $merchantQuery->where('business_name', 'like', "%{$search}%")
                            ->orWhere('name', 'like', "%{$search}%");
                    });
            });
        }

        $sort = $request->string('sort')->toString() ?: 'newest';
        match ($sort) {
            'budget_high' => $query->orderByDesc('merchant_brp_amount')->orderByDesc('created_at'),
            'budget_low' => $query->orderBy('merchant_brp_amount')->orderByDesc('created_at'),
            default => $query->orderByDesc('created_at'),
        };

        $campaigns = $query->paginate(12)->withQueryString();

        return Inertia::render('frontend/brp-campaigns/Index', [
            'campaigns' => $campaigns->through(function (MerchantBrpCampaign $campaign) {
                return [
                    'id' => $campaign->id,
                    'name' => $campaign->name ?: 'Merchant BRP Campaign',
                    'merchant_name' => $campaign->merchant->business_name ?? $campaign->merchant->name ?? 'Merchant',
                    'fund_amount_usd' => (float) $campaign->fund_amount_usd,
                    'merchant_brp_amount' => (int) $campaign->merchant_brp_amount,
                    'award_triggers' => $campaign->award_triggers ?? [],
                    'created_at' => optional($campaign->created_at)?->toIso8601String(),
                ];
            }),
            'filters' => [
                'search' => $request->string('search')->toString(),
                'sort' => $sort,
            ],
            'stats' => [
                'active_campaigns' => MerchantBrpCampaign::where('status', 'active')->count(),
                'total_merchant_brp' => (int) MerchantBrpCampaign::where('status', 'active')->sum('merchant_brp_amount'),
            ],
        ]);
    }
}

