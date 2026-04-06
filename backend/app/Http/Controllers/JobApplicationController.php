<?php

namespace App\Http\Controllers;

use App\Models\JobApplication;
use Illuminate\Http\Request;
use Inertia\Inertia;

class JobApplicationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $perPage = (int) $request->get('per_page', 10);
        $page = (int) $request->get('page', 1);
        $search = $request->get('search', '');
        $status = $request->get('status', '');

        $query = JobApplication::with(['jobPost', 'user']);

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

        if (!empty($status) && in_array($status, ['pending', 'reviewed', 'accepted', 'rejected'])) {
            $query->where('status', $status);
        }

        $jobApplications = $query->orderByDesc('created_at')->paginate($perPage, ['*'], 'page', $page)
            ->withQueryString();

        return Inertia::render('job-applications/index', [
            'jobApplications' => $jobApplications,
            'filters' => [
                'per_page' => $perPage,
                'page' => $page,
                'search' => $search,
                'status' => $status,
            ],
            'statusOptions' => [
                'pending' => 'Pending',
                'reviewed' => 'Reviewed',
                'accepted' => 'Accepted',
                'rejected' => 'Rejected',
            ],
            'allowedPerPage' => [5, 10, 25, 50, 100],
        ]);
    }

    /**
     * Update the status of a job application.
     */
    public function updateStatus(Request $request, JobApplication $jobApplication)
    {
        $request->validate([
            'status' => 'required|in:pending,reviewed,accepted,rejected',
        ]);

        $jobApplication->update([
            'status' => $request->status,
        ]);

        return redirect()->back();
    }
}
