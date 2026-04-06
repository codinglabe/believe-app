<?php

namespace App\Services;

use App\Models\MarketplaceProduct;
use App\Models\Organization;
use App\Models\OrganizationProduct;
use Illuminate\Support\Facades\Log;

/**
 * Keeps a default marketplace listing (OrganizationProduct) in sync when merchants publish pool products.
 * Public /marketplace pool tab only shows OrganizationProduct rows — this links the merchant SKU to that org.
 */
class MerchantMarketplacePoolListingService
{
    public function sync(MarketplaceProduct $mp): void
    {
        $raw = config('services.marketplace.pool_listing_organization_id');
        if ($raw === null || $raw === '') {
            Log::info('Merchant pool listing skipped: MARKETPLACE_POOL_LISTING_ORGANIZATION_ID is not set.');

            return;
        }

        $orgId = (int) $raw;
        if (! Organization::query()->whereKey($orgId)->exists()) {
            Log::warning('Merchant pool listing skipped: organization not found.', ['organization_id' => $orgId]);

            return;
        }

        $existing = OrganizationProduct::query()
            ->where('organization_id', $orgId)
            ->where('marketplace_product_id', $mp->id)
            ->first();

        // Mirror Merchant Hub listing: any active in-stock SKU gets a checkout row for supporters.
        // Nonprofit-only browsing (org pool tab) still filters by inPool() separately.
        $shouldList = $mp->isHubCheckoutEligible();

        if (! $shouldList) {
            if ($existing) {
                $existing->delete();
            }

            return;
        }

        $price = $mp->suggested_retail_price ?? $mp->base_price;
        if ($mp->min_resale_price !== null && (float) $price < (float) $mp->min_resale_price) {
            $price = (float) $mp->min_resale_price;
        }

        OrganizationProduct::updateOrCreate(
            [
                'organization_id' => $orgId,
                'marketplace_product_id' => $mp->id,
            ],
            [
                'custom_price' => $price,
                'supporter_message' => null,
                'is_featured' => false,
                'status' => 'active',
            ]
        );
    }
}
