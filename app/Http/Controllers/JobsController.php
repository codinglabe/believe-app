<?php

namespace App\Http\Controllers;

use App\Models\JobApplication;
use App\Models\JobPost;
use Illuminate\Container\Attributes\Auth;
use Illuminate\Http\Request;
use Inertia\Inertia;

class JobsController extends Controller
{
    public function __construct()
    {
        $this->middleware(['auth', 'role:user'])->except(['index', 'show']);
    }

    public function index(Request $request)
    {
        $jobs = JobPost::query()
            ->with(['organization', 'position'])
            ->whereIn('status', ['open', 'filled', 'closed'])
            ->when($request->search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when($request->location_type, function ($query, $locationType) {
                $query->where('location_type', $locationType);
            })
            ->when($request->type, function ($query, $type) {
                $query->where('type', $type);
            })
            ->when(auth()->check(), function ($query) {
                $query->withExists([
                    'applications as has_applied' => function ($q) {
                        $q->where('user_id', auth()->id());
                    }
                ]);
            })
            ->orderBy('created_at', 'desc')
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('frontend/jobs/index', [
            'jobs' => $jobs,
            'filters' => $request->only(['search', 'location_type', 'type']),
        ]);
    }

    public function show($id)
    {
        $job = JobPost::with(['organization', 'organization.user' , 'position', 'position.category'])
                        ->when(auth()->check(), function ($query) {
                            $query->withExists([
                                'applications as has_applied' => function ($q) {
                                    $q->where('user_id', auth()->id());
                                }
                            ]);
                        })->findOrFail($id);

        return Inertia::render('frontend/jobs/show', [
            'job' => $job,
        ]);
    }

    public function applyShow(int $id)
    {
        $job = JobPost::with(['organization'])->findOrFail($id);

        // Check if job is still open for applications
        if ($job->status !== 'open') {
            return redirect()
                ->route('jobs.show', $id)
                ->with('error', 'This job is no longer accepting applications.');
        }

        // Check application deadline
        if ($job->application_deadline && now()->gt($job->application_deadline)) {
            return redirect()
                ->route('jobs.show', $id)
                ->with('error', 'The application deadline for this job has passed.');
        }

        // Check if user already applied
        if (auth()->check() && auth()->user()->hasAppliedToJob($id)) {
            return redirect()
                ->route('jobs.show', $id)
                ->with('error', 'You have already applied for this position.');
        }

        return Inertia::render('frontend/jobs/apply', [
            'job' => [
                'id' => $job->id,
                'title' => $job->title,
                'organization' => [
                    'name' => $job->organization->name ?? 'Unknown Organization',
                ],
            ],
        ]);
    }

    public function applyStore(Request $request, int $id)
    {
        $job = JobPost::with(['organization'])->findOrFail($id);

        // Check if job is still open for applications
        if ($job->status !== 'open') {
            return redirect()
                ->route('jobs.show', $id)
                ->with('error', 'This job is no longer accepting applications.');
        }

        // Check application deadline
        if ($job->application_deadline && now()->gt($job->application_deadline)) {
            return redirect()
                ->route('jobs.show', $id)
                ->with('error', 'The application deadline for this job has passed.');
        }

        // Check if user already applied
        if (auth()->check() && auth()->user()->hasAppliedToJob($id)) {
            return redirect()
                ->route('jobs.show', $id)
                ->with('info', 'You have already applied for this position.');
        }

        $validated = $request->validate([
            'address' => 'required|string|max:255',
            'city' => 'required|string|max:255',
            'state' => 'required|string|max:255',
            'country' => 'required|string|max:255',
            'date_of_birth' => 'required|date',
            'postal_code' => 'required|string|max:255',
            'emergency_contact_name' => 'required|string|max:255',
            'emergency_contact_relationship' => 'required|string|max:255',
            'emergency_contact_phone' => 'required|string|max:255',
            'volunteer_experience' => 'nullable|string',
            'work_or_education_background' => 'nullable|string',
            'languages_spoken' => 'nullable|array',
            'certifications' => 'nullable|array',
            'medical_conditions' => 'nullable|string',
            'physical_limitations' => 'nullable|string',
            'consent_background_check' => 'required|boolean',
            'drivers_license_number' => 'nullable|string|max:255',
            'willing_background_check' => 'required|boolean',
            'ever_convicted' => 'required|boolean',
            'conviction_explanation' => 'nullable|string|required_if:ever_convicted,true',
            'reference_name' => 'nullable|string|max:255',
            'reference_relationship' => 'nullable|string|max:255',
            'reference_contact' => 'nullable|string|max:255',
            'agreed_to_terms' => 'required|accepted',
            'digital_signature' => 'required|string|starts_with:data:image/',
            'signed_date' => 'required|date',
            'tshirt_size' => 'nullable|string|max:255',
            'heard_about_us' => 'nullable|string|max:255',
            'social_media_handle' => 'nullable|string|max:255',
        ]);

        $application = new JobApplication($validated);
        $application->job_post_id = $id;
        $application->user_id = $request->user()->id;
        $application->status = 'pending';
        $application->save();

        return redirect()->route('jobs.show', $id)->with('success', 'Your application has been submitted successfully.');
    }
}
