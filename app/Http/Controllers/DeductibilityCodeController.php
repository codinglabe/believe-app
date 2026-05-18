<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;
use App\Models\DeductibilityCode;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;

class DeductibilityCodeController extends BaseController
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $this->authorizePermission($request, 'deductibility.code.read');
        $perPage = $request->get('per_page', 10);
        $page = $request->get('page', 1);
        $search = $request->get('search', '');

        $query = DeductibilityCode::query();

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('deductibility_code', 'LIKE', "%{$search}%")
                    ->orWhere('description', 'LIKE', "%{$search}%");
            });
        }

        $deductibilityCodes = $query->orderBy('id', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        return Inertia::render('deductibility-codes/index', [
            'deductibilityCodes' => $deductibilityCodes,
            'filters' => [
                'per_page' => (int) $perPage,
                'page' => (int) $page,
                'search' => $search,
            ],
            'allowedPerPage' => [5, 10, 25, 50, 100],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(Request $request): Response
    {
        $this->authorizePermission($request, 'deductibility.code.create');
        return Inertia::render('deductibility-codes/create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $this->authorizePermission($request, 'deductibility.code.create');
        $request->validate([
            'deductibility_code' => 'required|integer|unique:deductibility_codes,deductibility_code',
            'description' => 'required|string|max:1000',
        ]);

        DeductibilityCode::create([
            'deductibility_code' => $request->deductibility_code,
            'description' => $request->description,
        ]);

        return redirect()->route('deductibility-codes.index')
            ->with('success', 'Deductibility code created successfully');
    }



    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Request $request, DeductibilityCode $deductibilityCode): Response
    {
        $this->authorizePermission($request, 'deductibility.code.edit');
        return Inertia::render('deductibility-codes/edit', [
            'deductibilityCode' => $deductibilityCode
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, DeductibilityCode $deductibilityCode)
    {
        $this->authorizePermission($request, 'deductibility.code.update');
        $request->validate([
            'deductibility_code' => 'required|integer|unique:deductibility_codes,deductibility_code,' . $deductibilityCode->id,
            'description' => 'required|string|max:1000',
        ]);

        $deductibilityCode->update([
            'deductibility_code' => $request->deductibility_code,
            'description' => $request->description,
        ]);

        return redirect()->route('deductibility-codes.index')
            ->with('success', 'Deductibility code updated successfully');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, DeductibilityCode $deductibilityCode)
    {
        $this->authorizePermission($request, 'deductibility.code.delete');
        $deductibilityCode->delete();

        return redirect()->route('deductibility-codes.index')
            ->with('success', 'Deductibility code deleted successfully');
    }
}
