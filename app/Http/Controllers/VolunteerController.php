<?php

namespace App\Http\Controllers;

use App\Models\JobApplication;
use Illuminate\Http\Request;
use Inertia\Inertia;

class VolunteerController extends BaseController
{
    /**
     * Display a listing of approved volunteers only.
     */
    public function index(Request $request)
    {
        $this->authorizePermission($request, 'volunteer.read');
        
        $perPage = (int) $request->get('per_page', 10);
        $page = (int) $request->get('page', 1);
        $search = $request->get('search', '');

        $organizationId = $request->user()->organization?->id;

        if (!$organizationId) {
            // If user doesn't have an organization, return empty results
            return Inertia::render('volunteers/index', [
                'volunteers' => [
                    'data' => [],
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => $perPage,
                    'total' => 0,
                    'from' => null,
                    'to' => null,
                    'prev_page_url' => null,
                    'next_page_url' => null,
                ],
                'filters' => [
                    'per_page' => $perPage,
                    'page' => $page,
                    'search' => $search,
                ],
                'allowedPerPage' => [5, 10, 25, 50, 100],
            ]);
        }

        // Only show approved/accepted volunteers
        $query = JobApplication::with(['jobPost', 'user'])
            ->where('status', 'accepted')
            ->whereHas('jobPost', function ($q) use ($organizationId) {
                $q->where('type', 'volunteer')
                  ->where('organization_id', $organizationId);
            });

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->whereHas('user', function ($q) use ($search) {
                    $q->where('name', 'LIKE', '%' . $search . '%');
                })
                    ->orWhereHas('jobPost', function ($q) use ($search) {
                        $q->where('title', 'LIKE', '%' . $search . '%');
                    });
            });
        }

        $volunteers = $query->orderByDesc('created_at')->paginate($perPage, ['*'], 'page', $page)
            ->withQueryString();

        return Inertia::render('volunteers/index', [
            'volunteers' => $volunteers,
            'filters' => [
                'per_page' => $perPage,
                'page' => $page,
                'search' => $search,
            ],
            'allowedPerPage' => [5, 10, 25, 50, 100],
        ]);
    }

    /**
     * Display the specified volunteer.
     */
    public function show(Request $request, JobApplication $volunteer)
    {
        $this->authorizePermission($request, 'volunteer.read');
        
        $organizationId = $request->user()->organization?->id;

        if (!$organizationId || 
            $volunteer->jobPost->organization_id !== $organizationId || 
            $volunteer->jobPost->type !== 'volunteer' ||
            $volunteer->status !== 'accepted') {
            abort(403, 'Unauthorized action.');
        }

        $volunteer->load(['user', 'jobPost', 'timesheets' => function ($query) {
            $query->orderByDesc('work_date')->orderByDesc('created_at');
        }]);

        // Calculate total hours
        $totalHours = $volunteer->timesheets->sum('hours');

        return Inertia::render('volunteers/show', [
            'volunteer' => $volunteer,
            'totalHours' => $totalHours,
        ]);
    }
}

