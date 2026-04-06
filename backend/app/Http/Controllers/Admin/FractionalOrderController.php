<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FractionalOrder;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FractionalOrderController extends Controller
{
    public function index(Request $request)
    {
        $query = FractionalOrder::with(['user', 'offering.asset'])
            ->where('status', 'paid')
            ->orderBy('paid_at', 'desc');

        // Search functionality
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('tag_number', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($userQuery) use ($search) {
                      $userQuery->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                  })
                  ->orWhereHas('offering', function ($offeringQuery) use ($search) {
                      $offeringQuery->where('title', 'like', "%{$search}%");
                  });
            });
        }

        // Filter by offering
        if ($request->has('offering_id') && $request->offering_id) {
            $query->where('offering_id', $request->offering_id);
        }

        $orders = $query->paginate(20);

        // Get all offerings for filter
        $offerings = \App\Models\FractionalOffering::select('id', 'title')
            ->orderBy('title')
            ->get();

        // Calculate totals
        $totalRevenue = FractionalOrder::where('status', 'paid')->sum('amount');
        $totalOrders = FractionalOrder::where('status', 'paid')->count();
        $totalTokens = FractionalOrder::where('status', 'paid')->sum('tokens');

        return Inertia::render('admin/fractional/OrderIndex', [
            'orders' => $orders,
            'offerings' => $offerings,
            'filters' => [
                'search' => $request->search,
                'offering_id' => $request->offering_id ?: 'all',
            ],
            'stats' => [
                'total_revenue' => $totalRevenue,
                'total_orders' => $totalOrders,
                'total_tokens' => $totalTokens,
            ],
        ]);
    }

    public function show(FractionalOrder $order)
    {
        $order->load(['user', 'offering.asset']);

        return Inertia::render('admin/fractional/OrderShow', [
            'order' => $order,
        ]);
    }
}
