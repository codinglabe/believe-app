<?php

namespace App\Http\Controllers;

use App\Models\PositionCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class PositionCategoryController extends BaseController
{

    public function index(Request $request): Response
    {
        $this->authorizePermission($request, 'job.position.categories.read');
        $perPage = $request->get('per_page', 10);
        $page = $request->get('page', 1);
        $search = $request->get('search', '');

        $query = PositionCategory::query();
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%");
            });
        }

        $positionCategories = $query->orderBy('id', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        return Inertia::render('position-categories/index', [
            'categories' => $positionCategories,
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
        $this->authorizePermission($request, 'job.position.categories.create');
        return inertia('position-categories/create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $this->authorizePermission($request, 'job.position.categories.create');
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:position_categories,name',
            'description' => 'nullable',
        ]);
        PositionCategory::create($validated);
        return redirect()->route('position-categories.index')->with('success', 'Job Position Category created successfully.');
    }

    /**
     * Display the specified resource.
     */
    public function show(PositionCategory $positionCategory)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Request $request, PositionCategory $positionCategory): Response
    {
        $this->authorizePermission($request, 'job.position.categories.edit');
        return inertia('position-categories/edit', [
            'category' => $positionCategory
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, PositionCategory $positionCategory)
    {
        $this->authorizePermission($request, 'job.position.categories.update');
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:position_categories,name,' . $positionCategory->id,
            'description' => 'nullable',
        ]);
        $positionCategory->update($validated);
        return redirect()->route('position-categories.index')->with('success', 'Job Position Category updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, PositionCategory $positionCategory)
    {
        $this->authorizePermission($request, 'job.position.categories.delete');

        $auth = Auth::user();

        if ($auth->role !== 'admin') {
            return redirect()->route('position-categories.index')->with('error', 'You do not have permission to delete this Job Position Category.');
        }

        $positionCategory->delete();
        return redirect()->route('position-categories.index')->with('success', 'Job Position Category deleted successfully.');
    }
}
