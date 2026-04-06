<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\BaseController;
use App\Models\AdminSetting;
use App\Models\BelievePointPurchase;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BelievePointController extends BaseController
{
    /**
     * Display the believe points management page.
     */
    public function index(Request $request)
    {
        $this->authorizeRole($request, 'admin');

        $isEnabled = (bool) AdminSetting::get('believe_points_enabled', true);
        $minPurchaseAmount = (float) AdminSetting::get('believe_points_min_purchase', 1.00);
        $maxPurchaseAmount = (float) AdminSetting::get('believe_points_max_purchase', 10000.00);

        // Get purchase statistics
        $totalPurchases = BelievePointPurchase::where('status', 'completed')->count();
        $totalRevenue = BelievePointPurchase::where('status', 'completed')->sum('amount');
        $totalPointsIssued = BelievePointPurchase::where('status', 'completed')->sum('points');

        // Recent purchases
        $recentPurchases = BelievePointPurchase::with('user')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return Inertia::render('admin/BelievePoints/Index', [
            'settings' => [
                'enabled' => $isEnabled,
                'min_purchase_amount' => $minPurchaseAmount,
                'max_purchase_amount' => $maxPurchaseAmount,
            ],
            'statistics' => [
                'total_purchases' => $totalPurchases,
                'total_revenue' => $totalRevenue,
                'total_points_issued' => $totalPointsIssued,
            ],
            'recentPurchases' => $recentPurchases,
        ]);
    }

    /**
     * Update the believe points settings.
     */
    public function update(Request $request)
    {
        $this->authorizeRole($request, 'admin');

        $request->validate([
            'enabled' => ['required', 'boolean'],
            'min_purchase_amount' => ['required', 'numeric', 'min:1', 'max:1000'],
            'max_purchase_amount' => ['required', 'numeric', 'min:1', 'max:100000'],
        ]);

        AdminSetting::set('believe_points_enabled', $request->input('enabled'), 'boolean');
        AdminSetting::set('believe_points_min_purchase', $request->input('min_purchase_amount'), 'float');
        AdminSetting::set('believe_points_max_purchase', $request->input('max_purchase_amount'), 'float');

        return redirect()->back()->with('success', 'Believe Points settings updated successfully.');
    }
}
