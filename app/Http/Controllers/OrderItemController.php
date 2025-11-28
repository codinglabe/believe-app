<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Services\PrintifyService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrderItemController extends Controller
{
    /**
     * Display a listing of order items for the authenticated organization/admin
     */
    public function index(Request $request): Response
    {
        $perPage = $request->get('per_page', 10);
        $page = $request->get('page', 1);
        $search = $request->get('search', '');
        $orderFilter = $request->get('order_id', '');

        $query = OrderItem::query();

        // Filter by organization if user is organization
        if (auth()->user()->role === 'organization') {
            $query->where('organization_id', auth()->user()->organization->id);
        }

        // Filter by order if specified
        if ($orderFilter) {
            $query->where('order_id', $orderFilter);
        }

        // Search by product name or order reference
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                    ->orWhereHas('product', function ($q) use ($search) {
                        $q->where('name', 'LIKE', "%{$search}%");
                    })
                    ->orWhereHas('order', function ($q) use ($search) {
                        $q->where('reference_number', 'LIKE', "%{$search}%");
                    });
            });
        }

        $items = $query->with([
            'order' => function ($q) {
                $q->select('id', 'reference_number', 'total_amount', 'status', 'organization_id', 'created_at');
            },
            'product' => function ($q) {
                $q->select('id', 'name', 'image', 'organization_id');
            },
            'organization' => function ($q) {
                $q->select('id', 'name');
            }
        ])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        $itemsData = $items->map(function ($item) {
            return [
                'id' => $item->id,
                'order_id' => $item->order_id,
                'product_id' => $item->product_id,
                'organization_id' => $item->organization_id,
                'name' => $item->name,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'subtotal' => $item->subtotal,
                'printify_product_id' => $item->printify_product_id,
                'printify_synced' => $item->printify_synced,
                'order' => $item->order ? [
                    'id' => $item->order->id,
                    'reference_number' => $item->order->reference_number,
                    'total_amount' => $item->order->total_amount,
                    'status' => $item->order->status,
                    'organization_id' => $item->order->organization_id,
                    'created_at' => $item->order->created_at,
                ] : null,
                'product' => $item->product ? [
                    'id' => $item->product->id,
                    'name' => $item->product->name,
                    'image' => $item->product->image,
                    'cost' => $item->product->cost,
                ] : null,
                'organization' => $item->organization ? [
                    'id' => $item->organization->id,
                    'name' => $item->organization->name,
                ] : null,
                'created_at' => $item->created_at,
            ];
        });

        return Inertia::render('order-items/index', [
            'items' => [
                'data' => $itemsData,
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
                'from' => $items->firstItem(),
                'to' => $items->lastItem(),
                'prev_page_url' => $items->previousPageUrl(),
                'next_page_url' => $items->nextPageUrl(),
            ],
            'filters' => [
                'per_page' => (int) $perPage,
                'page' => (int) $page,
                'search' => $search,
                'order_id' => $orderFilter,
            ],
            'allowedPerPage' => [5, 10, 25, 50, 100],
            'userRole' => auth()->user()->role,
        ]);
    }

    /**
     * Display the specified order item
     */
    public function show(int $item)
    {
        $item = OrderItem::find($item);

        // Authorization check - organization can only see their items
        if (auth()->user()->role === 'organization' && $item->organization_id !== auth()->user()->organization->id) {
            abort(403, 'Unauthorized action.');
        }

        // Load relationships
        $item->load([
            'order' => function ($q) {
                $q->with(['shippingInfo', 'user']);
            },
            'product',
            'organization',
        ]);

        // Initialize Printify cost data
        $printifyCost = 0;
        $printifyCostDetails = null;

        // Get Printify product cost if available
        if ($item->printify_product_id) {
            try {
                $printifyService = app(PrintifyService::class);
                $printifyProduct = $printifyService->getProduct($item->printify_product_id);

                if ($printifyProduct && isset($printifyProduct['variants'])) {
                    // Find the specific variant cost
                    foreach ($printifyProduct['variants'] as $variant) {
                        if ($variant['id'] == $item->printify_variant_id) {
                            $printifyCost = $variant['cost'] / 100; // Convert from cents to dollars
                            $printifyCostDetails = [
                                'cost' => $printifyCost,
                                'variant_title' => $variant['title'] ?? null,
                                'print_provider' => $printifyProduct['print_provider'] ?? null,
                                'blueprint' => $printifyProduct['blueprint'] ?? null,
                            ];
                            break;
                        }
                    }
                }
            } catch (\Exception $e) {
                // Log error but don't break the page
                \Log::error('Failed to fetch Printify cost for product: ' . $item->printify_product_id, [
                    'error' => $e->getMessage()
                ]);
            }
        }

        // Calculate costs and profits
        $productCost = $printifyCostDetails['cost'] ?? 0;
        $subtotal = floatval($item->subtotal);

        // Use Printify cost if available, otherwise use product cost
        $actualCost = $printifyCost > 0 ? $printifyCost : $productCost;
        $profit = $subtotal - ($actualCost * $item->quantity);

        $itemData = [
            'id' => $item->id,
            'order_id' => $item->order_id,
            'product_id' => $item->product_id,
            'organization_id' => $item->organization_id,
            'name' => $item->name,
            'description' => $item->description,
            'quantity' => $item->quantity,
            'unit_price' => $item->unit_price,
            'subtotal' => $item->subtotal,
            'primary_image' => $item->primary_image,
            'variant_data' => $item->variant_data,
            'printify_product_id' => $item->printify_product_id,
            'printify_blueprint_id' => $item->printify_blueprint_id,
            'printify_print_provider_id' => $item->printify_print_provider_id,
            'printify_variant_id' => $item->printify_variant_id,
            'printify_line_item_id' => $item->printify_line_item_id,
            'printify_synced' => $item->printify_synced,
            'created_at' => $item->created_at,
            'updated_at' => $item->updated_at,
            'product_cost' => $productCost,
            'printify_cost' => $printifyCost,
            'actual_cost' => $actualCost, // The cost used for profit calculation
            'profit' => $profit,
            'printify_cost_details' => $printifyCostDetails,
            'product' => $item->product ? [
                'id' => $item->product->id,
                'name' => $item->product->name,
                'image' => $item->product->image,
                'description' => $item->product->description,
                'sku' => $item->product->sku,
                'cost' => $productCost,
            ] : null,
            'organization' => $item->organization ? [
                'id' => $item->organization->id,
                'name' => $item->organization->name,
            ] : null,
            'order' => $item->order ? [
                'id' => $item->order->id,
                'reference_number' => $item->order->reference_number,
                'total_amount' => $item->order->total_amount,
                'shipping_cost' => $item->order->shipping_cost,
                'tax_amount' => $item->order->tax_amount,
                'status' => $item->order->status,
                'payment_status' => $item->order->payment_status,
                'created_at' => $item->order->created_at,
                'user' => [
                    'id' => $item->order->user->id,
                    'name' => $item->order->user->name,
                    'email' => $item->order->user->email,
                ],
                'shipping_info' => $item->order->shippingInfo ? [
                    'first_name' => $item->order->shippingInfo->first_name,
                    'last_name' => $item->order->shippingInfo->last_name,
                    'email' => $item->order->shippingInfo->email,
                    'phone' => $item->order->shippingInfo->phone,
                    'address' => $item->order->shippingInfo->shipping_address,
                    'city' => $item->order->shippingInfo->city,
                    'state' => $item->order->shippingInfo->state,
                    'zip' => $item->order->shippingInfo->zip,
                    'country' => $item->order->shippingInfo->country,
                ] : null,
            ] : null,
        ];

        return Inertia::render('order-items/show', [
            'item' => $itemData,
            'userRole' => auth()->user()->role,
        ]);
    }
}
