<?php

namespace App\Http\Controllers;

use App\Models\ClassificationCode;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

class ClassificationCodeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $perPage = $request->get('per_page', 10);
        $page = $request->get('page', 1);
        $search = $request->get('search', '');

        $query = ClassificationCode::query();

        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('classification_code', 'LIKE', "%{$search}%")
                  ->orWhere('description', 'LIKE', "%{$search}%");
            });
        }

        $classificationCodes = $query->orderBy('id', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        return Inertia::render('classification-codes/index', [
            'classificationCodes' => $classificationCodes,
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
        return Inertia::render('classification-codes/create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'classification_code' => 'required|integer|unique:classification_codes,classification_code',
            'description' => 'required|string|max:1000',
        ]);

        ClassificationCode::create([
            'classification_code' => $request->classification_code,
            'description' => $request->description,
        ]);

        return redirect()->route('classification-codes.index')
            ->with('success', 'Classification code created successfully');
    }



    /**
     * Show the form for editing the specified resource.
     */
    public function edit(ClassificationCode $classificationCode): Response
    {
        return Inertia::render('classification-codes/edit', [
            'classificationCode' => $classificationCode
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, ClassificationCode $classificationCode)
    {
        $request->validate([
            'classification_code' => 'required|integer|unique:classification_codes,classification_code,' . $classificationCode->id,
            'description' => 'required|string|max:1000',
        ]);

        $classificationCode->update([
            'classification_code' => $request->classification_code,
            'description' => $request->description,
        ]);

        return redirect()->route('classification-codes.index')
            ->with('success', 'Classification code updated successfully');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(ClassificationCode $classificationCode)
    {
        $classificationCode->delete();

        return redirect()->route('classification-codes.index')
            ->with('success', 'Classification code deleted successfully');
    }
}
