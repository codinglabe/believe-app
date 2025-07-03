<?php

namespace App\Http\Controllers;

use App\Models\StatusCode;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StatusCodeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $perPage = $request->get('per_page', 10);
        $page = $request->get('page', 1);
        $search = $request->get('search', '');

        $query = StatusCode::query();
        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('status_code', 'LIKE', "%{$search}%")
                  ->orWhere('status', 'LIKE', "%{$search}%")
                  ->orWhere('description', 'LIKE', "%{$search}%");
            });
        }

        $statusCodes = $query->orderBy('id', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        return Inertia::render('status-codes/index', [
            'statusCodes' => $statusCodes,
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
        return Inertia::render('status-codes/create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'status_code' => 'required|integer|unique:status_codes,status_code',
            'status' => 'required|string|max:255',
            'description' => 'required|string|max:1000',
        ]);

        StatusCode::create([
            'status_code' => $request->status_code,
            'status' => $request->status,
            'description' => $request->description,
        ]);

        return redirect()->route('status-codes.index')
            ->with('success', 'Status code created successfully');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(StatusCode $statusCode): Response
    {
        return Inertia::render('status-codes/edit', [
            'statusCode' => $statusCode
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, StatusCode $statusCode)
    {
        $request->validate([
            'status_code' => 'required|integer|unique:status_codes,status_code,' . $statusCode->id,
            'status' => 'required|string|max:255',
            'description' => 'required|string|max:1000',
        ]);

        $statusCode->update([
            'status_code' => $request->status_code,
            'status' => $request->status,
            'description' => $request->description,
        ]);

        return redirect()->route('status-codes.index')
            ->with('success', 'Status code updated successfully');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(StatusCode $statusCode)
    {
        $statusCode->delete();

        return redirect()->route('status-codes.index')
            ->with('success', 'Status code deleted successfully');
    }
}
