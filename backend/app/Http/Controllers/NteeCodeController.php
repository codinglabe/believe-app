<?php

namespace App\Http\Controllers;

use App\Models\NteeCode;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

class NteeCodeController extends BaseController
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $this->authorizePermission($request, 'ntee.code.read');
        $perPage = $request->get('per_page', 10);
        $page = $request->get('page', 1);
        $search = $request->get('search', '');

        $query = NteeCode::query();

        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('ntee_codes', 'LIKE', "%{$search}%")
                  ->orWhere('category', 'LIKE', "%{$search}%")
                  ->orWhere('description', 'LIKE', "%{$search}%");
            });
        }

        $nteeCodes = $query->orderBy('id', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        return Inertia::render('ntee-codes/index', [
            'nteeCodes' => $nteeCodes,
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
        $this->authorizePermission($request, 'ntee.code.create');
        return Inertia::render('ntee-codes/create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $this->authorizePermission($request, 'ntee.code.create');
        $request->validate([
            'ntee_codes' => 'required|string|max:10|unique:ntee_codes,ntee_codes',
            'category' => 'required|string|max:255',
            'description' => 'required|string|max:1000',
        ]);

        NteeCode::create([
            'ntee_codes' => $request->ntee_codes,
            'category' => $request->category,
            'description' => $request->description,
        ]);

        return redirect()->route('ntee-codes.index')
            ->with('success', 'NTEE code created successfully');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Request $request, NteeCode $nteeCode): Response
    {
        $this->authorizePermission($request, 'ntee.code.edit');
        return Inertia::render('ntee-codes/edit', [
            'nteeCode' => $nteeCode
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, NteeCode $nteeCode)
    {
        $this->authorizePermission($request, 'ntee.code.update');
        $request->validate([
            'ntee_codes' => 'required|string|max:10|unique:ntee_codes,ntee_codes,' . $nteeCode->id,
            'category' => 'required|string|max:255',
            'description' => 'required|string|max:1000',
        ]);

        $nteeCode->update([
            'ntee_codes' => $request->ntee_codes,
            'category' => $request->category,
            'description' => $request->description,
        ]);

        return redirect()->route('ntee-codes.index')
            ->with('success', 'NTEE code updated successfully');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, NteeCode $nteeCode)
    {
        $this->authorizePermission($request, 'ntee.code.delete');
        $nteeCode->delete();

        return redirect()->route('ntee-codes.index')
            ->with('success', 'NTEE code deleted successfully');
    }
}
