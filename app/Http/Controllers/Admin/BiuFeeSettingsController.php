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
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'sales_platform_fee_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
        ]);

        AdminSetting::set(
            BiuPlatformFeeService::SETTING_KEY_SALES,
            (float) $validated['sales_platform_fee_percentage'],
            'float'
        );

        return redirect()
            ->route('admin.biu-fee.index')
            ->with(
                'success',
                'BIU platform fee saved. Marketplace, Service Hub, courses, raffles, gift cards, and merchant hub sales use this percentage on the sale base (buyer total unchanged; fee is ledger/seller-side).'
            );
    }
}
