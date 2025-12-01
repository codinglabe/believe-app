<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Country;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CountryController extends Controller
{
    /**
     * Search countries with pagination for combobox
     */
    public function search(Request $request): JsonResponse
    {
        $query = Country::query()->where('is_active', true);

        // Search by name or code
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
            });
        }

        // Order by display_order then name
        $query->orderBy('display_order')->orderBy('name');

        // Pagination
        $perPage = (int) $request->get('per_page', 20);
        $page = (int) $request->get('page', 1);
        
        $countries = $query->paginate($perPage, ['*'], 'page', $page);

        // Transform to combobox format: { value: code, label: name }
        // Store country code (2-letter ISO code) as value for consistency
        $data = $countries->map(function ($country) {
            return [
                'value' => $country->code,
                'label' => $country->name . ' (' . $country->code . ')',
            ];
        });

        return response()->json([
            'data' => $data->toArray(),
            'has_more' => $countries->hasMorePages(),
            'current_page' => $countries->currentPage(),
            'total' => $countries->total(),
        ]);
    }
}

