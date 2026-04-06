<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\BaseController;
use App\Models\Country;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CountryController extends BaseController
{
    /**
     * Display a listing of countries.
     */
    public function index(Request $request): Response
    {
        $this->authorizePermission($request, 'admin.countries.read');

        $query = Country::query();

        // Search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
            });
        }

        // Filter by active status
        if ($request->has('status') && $request->status !== '') {
            $query->where('is_active', $request->status === 'active');
        }

        $countries = $query->ordered()->paginate(20);

        return Inertia::render('admin/countries/Index', [
            'countries' => $countries,
            'filters' => [
                'search' => $request->search ?? '',
                'status' => $request->status ?? '',
            ],
        ]);
    }

    /**
     * Show the form for creating a new country.
     */
    public function create(Request $request): Response
    {
        $this->authorizePermission($request, 'admin.countries.create');

        return Inertia::render('admin/countries/Create', []);
    }

    /**
     * Store a newly created country.
     */
    public function store(Request $request)
    {
        $this->authorizePermission($request, 'admin.countries.create');

        $validated = $request->validate([
            'code' => 'required|string|size:2|unique:countries,code|uppercase',
            'name' => 'required|string|max:255|unique:countries,name',
            'is_active' => 'boolean',
            'display_order' => 'nullable|integer|min:0',
        ]);

        Country::create($validated);

        return redirect()->route('admin.countries.index')
            ->with('success', 'Country created successfully.');
    }

    /**
     * Show the form for editing the specified country.
     */
    public function edit(Request $request, Country $country): Response
    {
        $this->authorizePermission($request, 'admin.countries.update');

        return Inertia::render('admin/countries/Edit', [
            'country' => $country,
        ]);
    }

    /**
     * Update the specified country.
     */
    public function update(Request $request, Country $country)
    {
        $this->authorizePermission($request, 'admin.countries.update');

        $validated = $request->validate([
            'code' => 'required|string|size:2|unique:countries,code,' . $country->id . '|uppercase',
            'name' => 'required|string|max:255|unique:countries,name,' . $country->id,
            'is_active' => 'boolean',
            'display_order' => 'nullable|integer|min:0',
        ]);

        $country->update($validated);

        return redirect()->route('admin.countries.index')
            ->with('success', 'Country updated successfully.');
    }

    /**
     * Remove the specified country.
     */
    public function destroy(Request $request, Country $country)
    {
        $this->authorizePermission($request, 'admin.countries.delete');

        $country->delete();

        return redirect()->route('admin.countries.index')
            ->with('success', 'Country deleted successfully.');
    }
}
