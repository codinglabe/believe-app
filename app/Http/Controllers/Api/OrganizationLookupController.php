<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExcelData;
use App\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrganizationLookupController extends Controller
{
    /**
     * Look up an organization by name, EIN, city, and/or state.
     * Returns the profile identifier (ExcelData id or user slug) for /organizations/{slug}.
     */
    public function lookup(Request $request): JsonResponse
    {
        $name = $request->query('name');
        $ein = $request->query('ein');
        $city = $request->query('city');
        $state = $request->query('state');

        if (! $name && ! $ein && ! $city && ! $state) {
            return response()->json([
                'error' => 'Provide at least one of: name, ein, city, state',
            ], 400);
        }

        $query = ExcelData::where('status', 'complete')
            ->where('ein', '!=', 'EIN')
            ->whereNotNull('ein');

        if ($name && trim($name) !== '') {
            $search = trim($name);
            $query->where(function ($q) use ($search) {
                $q->where('name_virtual', 'LIKE', '%' . $search . '%')
                    ->orWhere('sort_name_virtual', 'LIKE', '%' . $search . '%');
            });
        }

        if ($ein && trim($ein) !== '') {
            $cleanEin = preg_replace('/\D/', '', trim($ein));
            if ($cleanEin !== '') {
                $query->where('ein', $cleanEin);
            }
        }

        if ($state && trim($state) !== '' && trim($state) !== 'All States') {
            $query->where('state_virtual', trim($state));
        }

        if ($city && trim($city) !== '' && trim($city) !== 'All Cities') {
            $query->where('city_virtual', 'LIKE', '%' . trim($city) . '%');
        }

        $query->select(['id', 'ein', 'name_virtual']);
        $first = $query->first();

        if (! $first) {
            return response()->json([
                'error' => 'No organization found matching those criteria.',
            ], 404);
        }

        // Prefer user slug for registered orgs so URL is human-friendly
        $registeredOrg = Organization::where('ein', $first->ein)
            ->where('registration_status', 'approved')
            ->with('user:id,slug')
            ->first();

        $slug = $registeredOrg && $registeredOrg->user && $registeredOrg->user->slug
            ? $registeredOrg->user->slug
            : (string) $first->id;

        return response()->json([
            'slug' => $slug,
            'name' => $first->name_virtual ?? null,
        ]);
    }
}
