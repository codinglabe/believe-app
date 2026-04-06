<?php

namespace App\Http\Controllers;

use App\Models\MarketplaceProduct;
use Inertia\Inertia;
use Inertia\Response;

class MerchantHubMarketplaceProductController extends Controller
{
    /**
     * Public detail for a merchant marketplace product (Merchant Hub browse).
     * Checkout uses marketplace_product_id + cart.add (no organization pool row).
     */
    public function show(MarketplaceProduct $marketplace_product): Response
    {
        if ($marketplace_product->status !== 'active') {
            abort(404);
        }

        if ($marketplace_product->inventory_quantity !== null && (int) $marketplace_product->inventory_quantity <= 0) {
            abort(404);
        }

        $marketplace_product->load(['merchant', 'productCategory']);

        $images = $marketplace_product->images ?? [];
        $imageUrls = [];
        if (is_array($images)) {
            foreach ($images as $path) {
                if (! $path) {
                    continue;
                }
                $imageUrls[] = filter_var($path, FILTER_VALIDATE_URL)
                    ? $path
                    : asset('storage/'.ltrim((string) $path, '/'));
            }
        }

        $listPrice = (float) ($marketplace_product->suggested_retail_price ?? $marketplace_product->base_price);
        if ($marketplace_product->min_resale_price !== null && $listPrice < (float) $marketplace_product->min_resale_price) {
            $listPrice = (float) $marketplace_product->min_resale_price;
        }

        $m = $marketplace_product->merchant;

        $canPurchase = $marketplace_product->isHubCheckoutEligible();

        $purchaseMessage = null;
        if (! $canPurchase) {
            $purchaseMessage = 'This product is not available for purchase (inactive or out of stock).';
        }

        $maxQty = $marketplace_product->inventory_quantity === null
            ? null
            : max(0, (int) $marketplace_product->inventory_quantity);

        return Inertia::render('frontend/merchant-hub/MarketplaceProductShow', [
            'product' => [
                'id' => $marketplace_product->id,
                'name' => $marketplace_product->name,
                'description' => $marketplace_product->description,
                'product_type' => $marketplace_product->product_type,
                'price' => $listPrice,
                'price_display' => '$'.number_format($listPrice, 2),
                'images' => $imageUrls,
                'category' => $marketplace_product->productCategory?->name,
                'merchant' => $m ? [
                    'id' => $m->id,
                    'name' => $m->business_name ?: $m->name,
                ] : null,
                'marketplace_product_id' => $marketplace_product->id,
                'can_purchase' => $canPurchase,
                'purchase_message' => $purchaseMessage,
                'max_quantity' => $maxQty,
            ],
        ]);
    }
}
