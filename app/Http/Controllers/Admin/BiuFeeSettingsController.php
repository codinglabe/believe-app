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
            'course_platform_fee_percentage' => BiuPlatformFeeService::getCoursePlatformFeePercentage(),
            'event_platform_fee_percentage' => BiuPlatformFeeService::getEventPlatformFeePercentage(),
            'marketplace_printify_organization_fee_percentage' => BiuPlatformFeeService::getMarketplacePrintifyOrganizationFeePercentage(),
            'marketplace_merchant_pool_fee_percentage' => BiuPlatformFeeService::getMarketplaceMerchantPoolFeePercentage(),
            'gift_card_platform_fee_usd' => BiuPlatformFeeService::getGiftCardPlatformFeeUsd(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'sales_platform_fee_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
            'course_platform_fee_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
            'event_platform_fee_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
            'marketplace_printify_organization_fee_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
            'marketplace_merchant_pool_fee_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
            'gift_card_platform_fee_usd' => ['required', 'numeric', 'min:0', 'max:100'],
        ]);

        AdminSetting::set(
            BiuPlatformFeeService::SETTING_KEY_SALES,
            (float) $validated['sales_platform_fee_percentage'],
            'float'
        );
        AdminSetting::set(
            BiuPlatformFeeService::SETTING_KEY_COURSE,
            (float) $validated['course_platform_fee_percentage'],
            'float'
        );
        AdminSetting::set(
            BiuPlatformFeeService::SETTING_KEY_EVENT,
            (float) $validated['event_platform_fee_percentage'],
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
        AdminSetting::set(
            BiuPlatformFeeService::SETTING_KEY_GIFT_CARD,
            round((float) $validated['gift_card_platform_fee_usd'], 2),
            'float'
        );

        return redirect()
            ->route('admin.biu-fee.index')
            ->with(
                'success',
                'BIU fee settings saved. Connection Hub courses and meetups use their module rates below (platform fees are never refunded on host cancellation). Marketplace checkout uses Printify/org and merchant/pool line rates. Service Hub, raffles, and merchant hub cash redemptions use the global sales platform fee. Gift cards charge a fixed platform fee on top of face value; BIU also earns a share of provider commissions (see Gift card revenue).'
            );
    }
}
