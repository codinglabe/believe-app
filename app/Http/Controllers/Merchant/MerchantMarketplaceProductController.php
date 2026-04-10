<?php

namespace App\Http\Controllers\Merchant;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\MarketplaceProduct;
use App\Services\MerchantMarketplacePoolListingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class MerchantMarketplaceProductController extends Controller
{
    public function index(Request $request)
    {
        $merchant = Auth::guard('merchant')->user();

        $query = MarketplaceProduct::query()->where('merchant_id', $merchant->id);

        if ($request->filled('search')) {
            $s = $request->string('search');
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', '%'.$s.'%')
                    ->orWhere('description', 'like', '%'.$s.'%');
            });
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        $products = $query->with('productCategory:id,name')->orderByDesc('created_at')->paginate(20)->withQueryString();

        $products->getCollection()->transform(fn (MarketplaceProduct $p) => $this->transformForFrontend($p));

        return Inertia::render('merchant/MarketplaceProducts/Index', [
            'products' => $products,
            'filters' => [
                'search' => $request->input('search', ''),
                'status' => $request->input('status', ''),
            ],
        ]);
    }

    public function create()
    {
        return Inertia::render('merchant/MarketplaceProducts/Create', [
            'product' => null,
            'categories' => $this->parentCategorySelectOptions(),
        ]);
    }

    public function store(Request $request)
    {
        $merchant = Auth::guard('merchant')->user();

        $validated = $this->validatePayload($request);

        $paths = [];
        $uploaded = $request->file('images');
        if ($uploaded) {
            foreach (is_array($uploaded) ? $uploaded : [$uploaded] as $file) {
                if ($file && $file->isValid()) {
                    $paths[] = $file->store('marketplace-products', 'public');
                }
            }
        }
        unset($validated['images']);
        $validated['images'] = $paths ?: null;
        $validated['merchant_id'] = $merchant->id;

        $product = MarketplaceProduct::create($validated);
        app(MerchantMarketplacePoolListingService::class)->sync($product);

        return redirect()->route('marketplace-products.index')
            ->with('success', 'Product saved.');
    }

    public function edit(MarketplaceProduct $marketplace_product)
    {
        $this->assertOwns($marketplace_product);

        return Inertia::render('merchant/MarketplaceProducts/Create', [
            'product' => $this->transformForFrontend($marketplace_product),
            'categories' => $this->parentCategorySelectOptions(),
        ]);
    }

    public function update(Request $request, MarketplaceProduct $marketplace_product)
    {
        $this->assertOwns($marketplace_product);

        $validated = $this->validatePayload($request);

        $existing = $marketplace_product->images ?? [];
        $uploaded = $request->file('images');
        if ($uploaded) {
            foreach (is_array($uploaded) ? $uploaded : [$uploaded] as $file) {
                if ($file && $file->isValid()) {
                    $existing[] = $file->store('marketplace-products', 'public');
                }
            }
        }
        unset($validated['images']);
        $validated['images'] = $existing ?: null;

        $marketplace_product->update($validated);
        $marketplace_product->refresh();
        app(MerchantMarketplacePoolListingService::class)->sync($marketplace_product);

        return redirect()->route('marketplace-products.index')
            ->with('success', 'Product updated.');
    }

    public function destroy(MarketplaceProduct $marketplace_product)
    {
        $this->assertOwns($marketplace_product);
        $marketplace_product->delete();

        return redirect()->route('marketplace-products.index')
            ->with('success', 'Product removed.');
    }

    /**
     * @return \Illuminate\Support\Collection<int, array{id: int, name: string}>
     */
    private function parentCategorySelectOptions()
    {
        return Category::query()
            ->where('status', 'active')
            ->parents()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Category $c) => [
                'id' => $c->id,
                'name' => $c->name,
            ])
            ->values();
    }

    private function assertOwns(MarketplaceProduct $product): void
    {
        $merchant = Auth::guard('merchant')->user();
        if ((int) $product->merchant_id !== (int) $merchant->id) {
            abort(403);
        }
    }

    private function validatePayload(Request $request): array
    {
        $poolOn = $request->boolean('nonprofit_marketplace_enabled');

        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'category_id' => [
                'required',
                'integer',
                Rule::exists('categories', 'id')->where(fn ($q) => $q->whereNull('parent_id')->where('status', 'active')),
            ],
            'base_price' => ['required', 'numeric', 'min:0'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'inventory_quantity' => ['nullable', 'integer', 'min:0'],
            'unlimited_inventory' => ['sometimes', 'boolean'],
            'product_type' => ['required', Rule::in(['physical', 'digital', 'service', 'media'])],
            'fulfillment_shipping_by' => ['required', Rule::in(['merchant', 'biu'])],
            'digital_delivery_notes' => ['nullable', 'string'],
            'nonprofit_marketplace_enabled' => ['required', 'boolean'],
            'pct_nonprofit' => [Rule::requiredIf($poolOn), 'nullable', 'numeric', 'min:0', 'max:100'],
            'pct_merchant' => [Rule::requiredIf($poolOn), 'nullable', 'numeric', 'min:0', 'max:100'],
            'pct_biu' => [Rule::requiredIf($poolOn), 'nullable', 'numeric', 'min:0', 'max:100'],
            'min_resale_price' => ['nullable', 'numeric', 'min:0'],
            'suggested_retail_price' => ['nullable', 'numeric', 'min:0'],
            'nonprofit_approval_type' => ['required', Rule::in(['auto', 'manual'])],
            'status' => ['required', Rule::in(['draft', 'pending_review', 'active', 'inactive'])],
            'images' => ['nullable', 'array'],
            'images.*' => ['image', 'mimes:jpeg,png,jpg,gif,webp', 'max:5120'],
        ];

        $validated = $request->validate($rules);
        unset($validated['images']);

        if (! empty($validated['unlimited_inventory'])) {
            $validated['inventory_quantity'] = null;
        }
        unset($validated['unlimited_inventory']);

        if (! empty($validated['nonprofit_marketplace_enabled'])) {
            $sum = (float) ($validated['pct_nonprofit'] ?? 0)
                + (float) ($validated['pct_merchant'] ?? 0)
                + (float) ($validated['pct_biu'] ?? 0);
            if (abs($sum - 100) > 0.01) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'pct_nonprofit' => 'Nonprofit, merchant, and BIU percentages must total 100%.',
                ]);
            }
        } else {
            $validated['pct_nonprofit'] = null;
            $validated['pct_merchant'] = null;
            $validated['pct_biu'] = null;
            $validated['min_resale_price'] = $validated['min_resale_price'] ?? null;
            $validated['suggested_retail_price'] = $validated['suggested_retail_price'] ?? null;
        }

        $validated['category_id'] = (int) $validated['category_id'];

        return $validated;
    }

    private function transformForFrontend(MarketplaceProduct $p): array
    {
        $p->loadMissing('productCategory:id,name');
        $data = $p->toArray();
        $data['category'] = $p->productCategory?->name
            ?? (isset($data['category']) && is_string($data['category']) ? $data['category'] : null);
        if (! empty($data['images']) && is_array($data['images'])) {
            $data['images'] = array_map(
                fn ($path) => filter_var($path, FILTER_VALIDATE_URL) ? $path : asset('storage/'.ltrim($path, '/')),
                $data['images']
            );
        }

        return $data;
    }
}
