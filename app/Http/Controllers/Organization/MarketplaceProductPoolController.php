<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\MarketplaceProduct;
use App\Models\OrganizationProduct;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MarketplaceProductPoolController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $organization = $user->organization;
        if (! $organization || (int) $organization->user_id !== (int) $user->id) {
            abort(403, 'You do not have an organization');
        }

        $adoptionsByMarketplaceProductId = OrganizationProduct::query()
            ->where('organization_id', $organization->id)
            ->get(['id', 'marketplace_product_id', 'status', 'pickup_available', 'supporter_message', 'is_featured'])
            ->keyBy('marketplace_product_id');

        $query = MarketplaceProduct::query()
            ->with(['merchant:id,business_name,name', 'productCategory:id,name'])
            ->where('status', 'active')
            ->where('nonprofit_marketplace_enabled', true)
            ->where(function ($q) {
                $q->whereNull('inventory_quantity')
                    ->orWhere('inventory_quantity', '>', 0);
            });

        if ($request->filled('category')) {
            $query->where('category_id', (int) $request->input('category'));
        }
        if ($request->filled('search')) {
            $s = $request->string('search');
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', '%'.$s.'%')
                    ->orWhere('description', 'like', '%'.$s.'%');
            });
        }

        $products = $query->orderByDesc('created_at')->paginate(24)->withQueryString();

        $categoryIdsInPool = MarketplaceProduct::query()
            ->where('status', 'active')
            ->where('nonprofit_marketplace_enabled', true)
            ->whereNotNull('category_id')
            ->distinct()
            ->pluck('category_id');

        $categories = Category::query()
            ->whereIn('id', $categoryIdsInPool)
            ->where('status', 'active')
            ->parents()
            ->orderBy('name')
            ->get(['id', 'name']);

        $products->getCollection()->transform(function (MarketplaceProduct $p) use ($adoptionsByMarketplaceProductId) {
            $row = $p->toArray();
            $row['category'] = $p->productCategory?->name
                ?? (isset($row['category']) && is_string($row['category']) ? $row['category'] : null);
            $adopt = $adoptionsByMarketplaceProductId->get($p->id);
            $row['already_adopted'] = $adopt !== null;
            $row['adoption_status'] = $adopt?->status;
            $row['organization_product_id'] = $adopt?->id;
            $row['listing_pickup_available'] = (bool) ($adopt?->pickup_available ?? false);
            $row['listing_supporter_message'] = $adopt?->supporter_message;
            $row['listing_is_featured'] = (bool) ($adopt?->is_featured ?? false);
            if (! empty($row['images']) && is_array($row['images'])) {
                $row['images'] = array_map(
                    fn ($path) => filter_var($path, FILTER_VALIDATE_URL) ? $path : asset('storage/'.ltrim($path, '/')),
                    $row['images']
                );
            }

            return $row;
        });

        return Inertia::render('Organization/MarketplaceProductPool/Index', [
            'products' => $products,
            'categories' => $categories,
            'filters' => [
                'search' => $request->input('search', ''),
                'category' => $request->input('category', ''),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $organization = $user->organization;
        if (! $organization || (int) $organization->user_id !== (int) $user->id) {
            abort(403, 'You do not have an organization');
        }

        $validated = $request->validate([
            'marketplace_product_id' => ['required', 'exists:marketplace_products,id'],
            'custom_price' => ['required', 'numeric', 'min:0.01'],
            'supporter_message' => ['nullable', 'string', 'max:2000'],
            'is_featured' => ['sometimes', 'boolean'],
            'pickup_available' => ['sometimes', 'boolean'],
        ]);

        $mp = MarketplaceProduct::query()->findOrFail($validated['marketplace_product_id']);
        if (! $mp->inPool()) {
            return back()->withErrors(['marketplace_product_id' => 'This product is not available in the pool.']);
        }

        if ($mp->min_resale_price !== null && (float) $validated['custom_price'] < (float) $mp->min_resale_price) {
            return back()->withErrors(['custom_price' => 'Price must be at least $'.number_format((float) $mp->min_resale_price, 2)]);
        }

        $exists = OrganizationProduct::query()
            ->where('organization_id', $organization->id)
            ->where('marketplace_product_id', $mp->id)
            ->exists();
        if ($exists) {
            return back()->withErrors(['marketplace_product_id' => 'You already sell this product.']);
        }

        $status = $mp->nonprofit_approval_type === 'manual' ? 'pending_merchant_approval' : 'active';

        $merchantAllowsPickup = (bool) ($mp->pickup_available ?? false)
            && in_array((string) $mp->product_type, ['physical', 'service', 'media'], true);
        $orgPickup = $merchantAllowsPickup && $request->boolean('pickup_available', true);

        OrganizationProduct::create([
            'organization_id' => $organization->id,
            'marketplace_product_id' => $mp->id,
            'custom_price' => $validated['custom_price'],
            'supporter_message' => $validated['supporter_message'] ?? null,
            'is_featured' => (bool) ($validated['is_featured'] ?? false),
            'status' => $status,
            'pickup_available' => $orgPickup,
        ]);

        $msg = $status === 'active'
            ? 'You are now selling this product.'
            : 'Listing submitted; the merchant must approve before it goes live.';

        return redirect()->route('marketplace.product-pool.index')->with('success', $msg);
    }

    /**
     * Update this organization's pool listing (pickup at org, supporter message, featured).
     */
    public function updateListing(Request $request, OrganizationProduct $organization_product)
    {
        $user = $request->user();
        $organization = $user->organization;
        if (! $organization || (int) $organization->user_id !== (int) $user->id) {
            abort(403, 'You do not have an organization');
        }
        if ((int) $organization_product->organization_id !== (int) $organization->id) {
            abort(403);
        }

        $validated = $request->validate([
            'pickup_available' => ['sometimes', 'boolean'],
            'supporter_message' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'is_featured' => ['sometimes', 'boolean'],
        ]);

        $organization_product->load('marketplaceProduct');
        $mp = $organization_product->marketplaceProduct;
        if (! $mp) {
            return back()->withErrors(['error' => 'This listing is missing its merchant product.']);
        }

        $updates = [];

        if (array_key_exists('pickup_available', $validated)) {
            $want = (bool) $validated['pickup_available'];
            if ($want) {
                if (! in_array((string) $mp->product_type, ['physical', 'service', 'media'], true)) {
                    return back()->withErrors([
                        'pickup_available' => 'Local pickup is only available for physical, service, or media products.',
                    ]);
                }
                if (! (bool) ($mp->pickup_available ?? false)) {
                    return back()->withErrors([
                        'pickup_available' => 'The merchant has not enabled pickup on this SKU, so it cannot be offered on your listing.',
                    ]);
                }
            }
            $updates['pickup_available'] = $want;
        }

        if (array_key_exists('supporter_message', $validated)) {
            $updates['supporter_message'] = $validated['supporter_message'];
        }

        if (array_key_exists('is_featured', $validated)) {
            $updates['is_featured'] = (bool) $validated['is_featured'];
        }

        if ($updates !== []) {
            $organization_product->update($updates);
        }

        return back()->with('success', 'Listing updated.');
    }
}
