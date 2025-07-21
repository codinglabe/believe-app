<?php

namespace App\Http\Controllers;

use App\Models\JobPosition;
use App\Models\PositionCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class JobPositionController extends Controller
{
    public function index(Request $request): Response
    {
        $perPage = $request->get('per_page', 10);
        $page = $request->get('page', 1);
        $search = $request->get('search', '');

        $query = JobPosition::query();
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'LIKE', "%{$search}%");
            });
        }

        $positionCategories = $query->orderBy('id', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        return Inertia::render('job-positions/index', [
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
    public function create(): Response
    {
        return inertia('job-positions/create', [
            'positionCategories' => PositionCategory::select('id', 'name')->get(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255|unique:job_positions,title',
            'description' => 'nullable',
        ]);

        JobPosition::create($validated);
        return redirect()->route('position-categories.index')->with('success', 'Job Position Category created successfully.');
    }

    /**
     * Display the specified resource.
     */
    public function show(PositionCategory $jobPosition)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(JobPosition $jobPosition): Response
    {
        return inertia('job-positions/edit', [
            'category' => $jobPosition
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, JobPosition $jobPosition)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255|unique:position_categories,name,' . $jobPosition->id,
            'description' => 'nullable',
        ]);
        $jobPosition->update($validated);
        return redirect()->route('position-categories.index')->with('success', 'Job Position Category updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(JobPosition $jobPosition)
    {
        $jobPosition->delete();
        return redirect()->route('position-categories.index')->with('success', 'Job Position Category deleted successfully.');
    }
}
