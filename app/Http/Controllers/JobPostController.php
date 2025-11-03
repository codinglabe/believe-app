<?php

namespace App\Http\Controllers;

use App\Jobs\SendJobPostNotification;
use App\Models\JobPost;
use App\Models\JobPosition;
use App\Models\Organization;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class JobPostController extends BaseController
{

    /**
     * Display a listing of job posts.
     */
    public function index(Request $request): Response
    {
        $this->authorizePermission($request, 'job.posts.read');
        $perPage = (int) $request->get('per_page', 10);
        $page = (int) $request->get('page', 1);
        $search = $request->get('search', '');
        $status = $request->get('status', '');

        $query = JobPost::where("organization_id", $request->user()->organization?->id)->with(['position', 'position.category', 'organization'])
            ->orderByDesc('created_at');

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'LIKE', '%' . $search . '%')
                    ->orWhereHas('position', function ($q) use ($search) {
                        $q->where('title', 'LIKE', '%' . $search . '%');
                    });
            });
        }

        if (!empty($status) && in_array($status, ['draft', 'open', 'closed', 'filled'])) {
            $query->where('status', $status);
        }

        $jobPosts = $query->paginate($perPage, ['*'], 'page', $page)
            ->withQueryString();

        return Inertia::render('job-posts/index', [
            'jobPosts' => $jobPosts,
            'filters' => [
                'per_page' => $perPage,
                'page' => $page,
                'search' => $search,
                'status' => $status,
            ],
            'statusOptions' => [
                'draft' => 'Draft',
                'open' => 'Open',
                'closed' => 'Closed',
                'filled' => 'Filled',
            ],
            'allowedPerPage' => [5, 10, 25, 50, 100],
        ]);
    }

    /**
     * Show the form for creating a new job post.
     */
    public function create(Request $request): Response
    {
        $this->authorizePermission($request, 'job.posts.create');
        return Inertia::render('job-posts/create', [
            'positions' => JobPosition::select('id', 'title')->get(),
            'typeOptions' => [
                'volunteer' => 'Volunteer',
                'paid' => 'Paid',
                'internship' => 'Internship',
                // 'medicaid' => 'Medicaid',
            ],
            'locationTypeOptions' => [
                'onsite' => 'Onsite',
                'remote' => 'Remote',
                'hybrid' => 'Hybrid',
            ],
            'statusOptions' => [
                'draft' => 'Draft',
                'open' => 'Open',
                'closed' => 'Closed',
                'filled' => 'Filled',
            ],
            'currencyOptions' => [
                'USD' => 'USD',
                'EUR' => 'EUR',
                'GBP' => 'GBP',
            ],
        ]);
    }

    /**
     * Store a newly created job post in storage.
     */
    public function store(Request $request)
    {
        $this->authorizePermission($request, 'job.posts.create');
        $validated = $request->validate([
            'position_id' => 'required|exists:job_positions,id',
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'requirements' => 'nullable|string',
            'pay_rate' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|size:3',
            'type' => 'required|in:volunteer,paid,internship,medicaid',
            'location_type' => 'required|in:onsite,remote,hybrid',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255',
            'time_commitment_min_hours' => 'nullable|integer|min:0',
            'application_deadline' => 'nullable|date|after_or_equal:today',
            'status' => 'required|in:draft,open,closed,filled',
        ]);

        if ($request->user()) {
            $validated['organization_id'] = $request->user()->organization?->id;
        }

        $validated['date_posted'] = now()->toDateString();

        $jobPost = JobPost::create($validated);

        // Dispatch job to queue for sending notifications
        if ($jobPost->status === 'open') {
            SendJobPostNotification::dispatch($jobPost);
        }

        return redirect()->route('job-posts.index')
            ->with('success', 'Job post created successfully.');
    }

    /**
     * Show the form for editing the specified job post.
     */
    public function edit(Request $request, JobPost $jobPost): Response
    {
        $this->authorizePermission($request, 'job.posts.edit');
        // Check if the current user's organization owns this job post
        if ($jobPost->organization_id !== $request->user()->organization?->id) {
            abort(403, 'Unauthorized action.');
        }

        return Inertia::render('job-posts/edit', [
            'jobPost' => $jobPost,
            'positions' => JobPosition::select('id', 'title')->get(),
            'typeOptions' => [
                'volunteer' => 'Volunteer',
                'paid' => 'Paid',
                'internship' => 'Internship',
                'medicaid' => 'Medicaid',
            ],
            'locationTypeOptions' => [
                'onsite' => 'Onsite',
                'remote' => 'Remote',
                'hybrid' => 'Hybrid',
            ],
            'statusOptions' => [
                'draft' => 'Draft',
                'open' => 'Open',
                'closed' => 'Closed',
                'filled' => 'Filled',
            ],
            'currencyOptions' => [
                'USD' => 'USD',
                'EUR' => 'EUR',
                'GBP' => 'GBP',
            ],
        ]);
    }

    /**
     * Update the specified job post in storage.
     */
    public function update(Request $request, JobPost $jobPost)
    {
        $this->authorizePermission($request, 'job.posts.update');
        if ($jobPost->organization_id !== $request->user()->organization?->id) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'position_id' => 'required|exists:job_positions,id',
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'requirements' => 'nullable|string',
            'pay_rate' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|size:3',
            'type' => 'required|in:volunteer,paid,internship,medicaid',
            'location_type' => 'required|in:onsite,remote,hybrid',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255',
            'time_commitment_min_hours' => 'nullable|integer|min:0',
            'application_deadline' => 'nullable|date|after_or_equal:today',
            'status' => 'required|in:draft,open,closed,filled',
        ]);

        $jobPost->update($validated);

        return redirect()->route('job-posts.index')
            ->with('success', 'Job post updated successfully.');
    }

    /**
     * Remove the specified job post from storage.
     */
    public function destroy(Request $request, JobPost $jobPost)
    {
        $this->authorizePermission($request, 'job.posts.delete');
        if ($jobPost->organization_id !== $request->user()->organization?->id) {
            abort(403, 'Unauthorized action.');
        }

        $jobPost->delete();

        return redirect()->route('job-posts.index')
            ->with('success', 'Job post deleted successfully.');
    }
}
