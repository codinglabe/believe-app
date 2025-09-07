<?php

namespace App\Http\Controllers;

use App\Models\JobPosition;
use App\Models\PositionCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class JobPositionController extends BaseController
{

    public function index(Request $request): Response
    {
        $this->authorizePermission($request, 'job.positions.read');
        $perPage = (int) $request->get('per_page', 10);
        $page = (int) $request->get('page', 1);
        $search = $request->get('search', '');

        $query = JobPosition::with('category');

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'LIKE', '%' . $search . '%');
            });
        }

        $jobPositions = $query->orderByDesc('id')
            ->paginate($perPage, ['*'], 'page', $page)
            ->withQueryString(); // keeps filters during pagination links

        return Inertia::render('job-positions/index', [
            'jobPositions' => $jobPositions,
            'filters' => [
                'per_page' => $perPage,
                'page' => $page,
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
        $this->authorizePermission($request, 'job.positions.create');
        return inertia('job-positions/create', [
            'positionCategories' => PositionCategory::select('id', 'name')->get(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $this->authorizePermission($request, 'job.positions.create');
        $validated = $request->validate([
            'category_id'  => 'required|exists:position_categories,id',
            'title' => 'required|string|max:255|unique:job_positions,title',
            'default_description' => 'required|string',
            'default_requirements' => 'nullable|string',
        ]);

        JobPosition::create($validated);
        return redirect()->route('job-positions.index')->with('success', 'Job Position created successfully.');
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
    public function edit(Request $request, JobPosition $jobPosition): Response
    {
        $this->authorizePermission($request, 'job.positions.edit');
        return inertia('job-positions/edit', [
            'jobPosition' => $jobPosition,
            'positionCategories' => PositionCategory::select('id', 'name')->get(),
        ]);
    }

    public function update(Request $request, JobPosition $jobPosition)
    {
        $this->authorizePermission($request, 'job.positions.update');
        $validated = $request->validate([
            'category_id' => 'required|exists:position_categories,id',
            'title' => 'required|string|max:255|unique:job_positions,title,' . $jobPosition->id,
            'default_description' => 'required|string',
            'default_requirements' => 'nullable|string',
        ]);

        $jobPosition->update($validated);
        return redirect()->route('job-positions.index')->with('success', 'Job Position updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, JobPosition $jobPosition)
    {
        $this->authorizePermission($request, 'job.positions.delete');
        $auth =  Auth::user();

        if($auth->role !== 'admin'){
            return redirect()->route('job-positions.index')->with('error', 'You do not have permission to delete this Job Position.');
        };

        $jobPosition->delete();
        return redirect()->route('job-positions.index')->with('success', 'Job Position deleted successfully.');
    }
}
