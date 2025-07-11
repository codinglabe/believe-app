<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;
use App\Models\DeductibilityCode;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;

class DeductibilityCodeController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function __construct()
    {
        //$this->middleware('permission:deductibily.code.read', ['only' => ['index', 'show']]);
        // $this->middleware('permission:product-create', ['only' => ['create', 'store']]);
        // $this->middleware('permission:product-edit', ['only' => ['edit', 'update']]);
        // $this->middleware('permission:product-delete', ['only' => ['destroy']]);
    }
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
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
    public function create(): Response
    {
        return Inertia::render('deductibility-codes/create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
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
    public function edit(DeductibilityCode $deductibilityCode): Response
    {
        return Inertia::render('deductibility-codes/edit', [
            'deductibilityCode' => $deductibilityCode
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, DeductibilityCode $deductibilityCode)
    {
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
    public function destroy(DeductibilityCode $deductibilityCode)
    {
        $deductibilityCode->delete();

        return redirect()->route('deductibility-codes.index')
            ->with('success', 'Deductibility code deleted successfully');
    }
}
