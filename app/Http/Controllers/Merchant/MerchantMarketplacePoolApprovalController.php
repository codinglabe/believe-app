<?php

namespace App\Http\Controllers\Merchant;

use App\Http\Controllers\Controller;
use App\Models\OrganizationProduct;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class MerchantMarketplacePoolApprovalController extends Controller
{
    /**
     * Nonprofit organizations can adopt pool SKUs; when the product uses manual nonprofit approval,
     * listings stay pending until the merchant approves here.
     */
    public function index(Request $request): Response
    {
        $merchant = Auth::guard('merchant')->user();

        $query = OrganizationProduct::query()
            ->whereHas('marketplaceProduct', fn ($q) => $q->where('merchant_id', $merchant->id))
            ->with(['organization:id,name', 'marketplaceProduct:id,name,merchant_id'])
            ->orderByRaw("CASE WHEN status = 'pending_merchant_approval' THEN 0 ELSE 1 END")
            ->orderByDesc('updated_at');

        if ($request->filled('status')) {
            $st = $request->string('status');
            if (in_array($st, ['pending_merchant_approval', 'active'], true)) {
                $query->where('status', $st);
            }
        }

        $rows = $query->paginate(25)->withQueryString();

        $rows->getCollection()->transform(function (OrganizationProduct $op) {
            return [
                'id' => $op->id,
                'status' => $op->status,
                'custom_price' => (string) $op->custom_price,
                'supporter_message' => $op->supporter_message,
                'created_at' => $op->created_at?->toIso8601String(),
                'organization' => $op->organization ? [
                    'id' => $op->organization->id,
                    'name' => $op->organization->name,
                ] : null,
                'marketplace_product' => $op->marketplaceProduct ? [
                    'id' => $op->marketplaceProduct->id,
                    'name' => $op->marketplaceProduct->name,
                ] : null,
            ];
        });

        $pendingCount = OrganizationProduct::query()
            ->where('status', 'pending_merchant_approval')
            ->whereHas('marketplaceProduct', fn ($q) => $q->where('merchant_id', $merchant->id))
            ->count();

        return Inertia::render('merchant/MarketplacePoolApprovals/Index', [
            'requests' => $rows,
            'pendingCount' => $pendingCount,
            'filters' => [
                'status' => $request->input('status', ''),
            ],
        ]);
    }

    public function approve(OrganizationProduct $organization_product): RedirectResponse
    {
        $merchant = Auth::guard('merchant')->user();
        $this->assertMerchantOwnsAdoption($merchant->id, $organization_product);

        if ($organization_product->status !== 'pending_merchant_approval') {
            return redirect()->route('marketplace-pool-approvals.index')
                ->with('error', 'This listing is not waiting for approval.');
        }

        $organization_product->update(['status' => 'active']);

        return redirect()->route('marketplace-pool-approvals.index')
            ->with('success', 'Listing approved. The nonprofit can sell this product on the marketplace.');
    }

    public function decline(OrganizationProduct $organization_product): RedirectResponse
    {
        $merchant = Auth::guard('merchant')->user();
        $this->assertMerchantOwnsAdoption($merchant->id, $organization_product);

        if ($organization_product->status !== 'pending_merchant_approval') {
            return redirect()->route('marketplace-pool-approvals.index')
                ->with('error', 'Only pending requests can be declined.');
        }

        $organization_product->delete();

        return redirect()->route('marketplace-pool-approvals.index')
            ->with('success', 'Request declined. The nonprofit can submit a new listing from the product pool if they choose.');
    }

    private function assertMerchantOwnsAdoption(int $merchantId, OrganizationProduct $organization_product): void
    {
        $organization_product->loadMissing('marketplaceProduct');
        if (! $organization_product->marketplaceProduct || (int) $organization_product->marketplaceProduct->merchant_id !== $merchantId) {
            abort(403);
        }
    }
}
