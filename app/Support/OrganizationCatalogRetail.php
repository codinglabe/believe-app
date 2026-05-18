<?php

namespace App\Support;

use App\Models\Product;

/**
 * Organization storefront catalog: unit cost hints and a fallback "typical retail" reference when no real split exists.
 */
final class OrganizationCatalogRetail
{
    /** When no meaningful typical retail exists, use this markup on the checkout base for display-only reference. */
    public const REFERENCE_TYPICAL_MARKUP_PERCENT = 25.0;

    /**
     * Best-effort supplier/unit cost for manual (non-Printify) catalog products.
     * Uses source_cost when set; otherwise implied cost from profit_margin_percentage (retail = cost × (1 + p/100)).
     */
    public static function manualCatalogUnitCostUsd(Product $product, float $retailUnitUsd): ?float
    {
        if ($retailUnitUsd <= 0.0001) {
            return null;
        }
        if ($product->source_cost !== null && $product->source_cost !== '') {
            $sc = (float) $product->source_cost;
            if ($sc > 0.0001) {
                return round(min($sc, $retailUnitUsd), 2);
            }
        }
        $p = (float) ($product->profit_margin_percentage ?? 0);
        if ($p > 0.0001) {
            return round($retailUnitUsd * 100 / (100 + $p), 2);
        }

        return null;
    }

    public static function syntheticTypicalRetailFromCheckoutBase(float $checkoutBaseUsd): float
    {
        return round($checkoutBaseUsd * (1 + self::REFERENCE_TYPICAL_MARKUP_PERCENT / 100), 2);
    }
}
