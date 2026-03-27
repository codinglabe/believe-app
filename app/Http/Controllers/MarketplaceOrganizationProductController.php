<?php

namespace App\Http\Controllers;

use App\Models\OrganizationProduct;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MarketplaceOrganizationProductController extends Controller
{
    public function show(Request $request, OrganizationProduct $organization_product): Response
    {
        $organization_product->load(['organization', 'marketplaceProduct.merchant']);

        if ($organization_product->status !== 'active' || ! $organization_product->marketplaceProduct?->inPool()) {
            abort(404);
        }

        $mp = $organization_product->marketplaceProduct;
        $org = $organization_product->organization;

        $images = $mp->images ?? [];
        $imageUrls = array_map(
            fn ($path) => filter_var($path, FILTER_VALIDATE_URL) ? $path : asset('storage/'.ltrim((string) $path, '/')),
            is_array($images) ? $images : []
        );

        return Inertia::render('frontend/marketplace-pool-show', [
            'listing' => [
                'id' => $organization_product->id,
                'custom_price' => (float) $organization_product->custom_price,
                'supporter_message' => $organization_product->supporter_message,
                'is_featured' => $organization_product->is_featured,
                'product' => [
                    'id' => $mp->id,
                    'name' => $mp->name,
                    'description' => $mp->description,
                    'category' => $mp->category,
                    'product_type' => $mp->product_type,
                    'images' => $imageUrls,
                ],
                'organization' => [
                    'id' => $org->id,
                    'name' => $org->name,
                    'mission' => $org->mission,
                    'description' => $org->description,
                ],
                'merchant' => [
                    'business_name' => $mp->merchant?->business_name ?? $mp->merchant?->name,
                ],
                'max_quantity' => $mp->inventory_quantity,
            ],
        ]);
    }
}
