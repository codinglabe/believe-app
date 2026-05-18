<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminSetting;
use App\Services\BiuPlatformFeeService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BiuFeeSettingsController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/biu-fee/Index', [
            'sales_platform_fee_percentage' => BiuPlatformFeeService::getSalesPlatformFeePercentage(),
            'marketplace_printify_organization_fee_percentage' => BiuPlatformFeeService::getMarketplacePrintifyOrganizationFeePercentage(),
            'marketplace_merchant_pool_fee_percentage' => BiuPlatformFeeService::getMarketplaceMerchantPoolFeePercentage(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'sales_platform_fee_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
            'marketplace_printify_organization_fee_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
            'marketplace_merchant_pool_fee_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
        ]);

        AdminSetting::set(
            BiuPlatformFeeService::SETTING_KEY_SALES,
            (float) $validated['sales_platform_fee_percentage'],
            'float'
        );
        AdminSetting::set(
            BiuPlatformFeeService::SETTING_KEY_MARKETPLACE_PRINTIFY_ORG,
            (float) $validated['marketplace_printify_organization_fee_percentage'],
            'float'
        );
        AdminSetting::set(
            BiuPlatformFeeService::SETTING_KEY_MARKETPLACE_MERCHANT_POOL,
            (float) $validated['marketplace_merchant_pool_fee_percentage'],
            'float'
        );

        return redirect()
            ->route('admin.biu-fee.index')
            ->with(
                'success',
                'BIU fee settings saved. Marketplace checkout charges buyers using the Printify/organization rate and the merchant/pool rate on matching line subtotals. Service Hub, courses, raffles, gift cards, and merchant hub cash redemptions still use the global sales platform fee percentage.'
            );
    }
}
