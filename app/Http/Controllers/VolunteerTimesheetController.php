<?php

namespace App\Http\Controllers;

use App\Models\VolunteerTimesheet;
use App\Models\JobApplication;
use App\Models\AdminSetting;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class VolunteerTimesheetController extends BaseController
{
    /**
     * Display a listing of time sheets.
     */
    public function index(Request $request)
    {
        $this->authorizePermission($request, 'volunteer.timesheet.read');
        
        $perPage = (int) $request->get('per_page', 10);
        $page = (int) $request->get('page', 1);
        $search = $request->get('search', '');
        $volunteerId = $request->get('volunteer_id', '');
        $workDate = $request->get('work_date', '');

        $organizationId = $request->user()->organization?->id;

        if (!$organizationId) {
            return Inertia::render('volunteers/timesheet/index', [
                'timesheets' => [
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
                    'volunteer_id' => $volunteerId,
                    'work_date' => $workDate,
                ],
                'allowedPerPage' => [5, 10, 25, 50, 100],
            ]);
        }

        $query = VolunteerTimesheet::with(['jobApplication.user', 'jobApplication.jobPost', 'createdBy'])
            ->where('organization_id', $organizationId);

        if (!empty($volunteerId)) {
            $query->where('job_application_id', $volunteerId);
        }

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->whereHas('jobApplication.user', function ($q) use ($search) {
                    $q->where('name', 'LIKE', '%' . $search . '%');
                })
                    ->orWhere('description', 'LIKE', '%' . $search . '%');
            });
        }

        if (!empty($workDate)) {
            $query->where('work_date', $workDate);
        }

        $timesheets = $query->orderByDesc('work_date')
            ->orderByDesc('created_at')
            ->paginate($perPage, ['*'], 'page', $page)
            ->withQueryString();

        // Get initial list of approved volunteers for filter (first 20)
        $volunteers = JobApplication::with(['user', 'jobPost'])
            ->where('status', 'accepted')
            ->whereHas('jobPost', function ($q) use ($organizationId) {
                $q->where('type', 'volunteer')
                  ->where('organization_id', $organizationId);
            })
            ->limit(20)
            ->get()
            ->map(function ($app) {
                return [
                    'id' => $app->id,
                    'name' => $app->user->name,
                    'position' => $app->jobPost->title,
                ];
            });

        return Inertia::render('volunteers/timesheet/index', [
            'timesheets' => $timesheets,
            'volunteers' => $volunteers,
            'filters' => [
                'per_page' => $perPage,
                'page' => $page,
                'search' => $search,
                'volunteer_id' => $volunteerId,
                'work_date' => $workDate,
            ],
            'allowedPerPage' => [5, 10, 25, 50, 100],
        ]);
    }

    /**
     * Show the form for creating a new time sheet.
     */
    public function create(Request $request)
    {
        $this->authorizePermission($request, 'volunteer.timesheet.create');
        
        $organizationId = $request->user()->organization?->id;

        if (!$organizationId) {
            return redirect()->route('volunteers.timesheet.index');
        }

        // Get initial list of approved volunteers (first 20)
        $volunteers = JobApplication::with(['user', 'jobPost'])
            ->where('status', 'accepted')
            ->whereHas('jobPost', function ($q) use ($organizationId) {
                $q->where('type', 'volunteer')
                  ->where('organization_id', $organizationId);
            })
            ->limit(20)
            ->get()
            ->map(function ($app) {
                return [
                    'id' => $app->id,
                    'name' => $app->user->name,
                    'position' => $app->jobPost->title,
                ];
            });

        return Inertia::render('volunteers/timesheet/create', [
            'volunteers' => $volunteers,
        ]);
    }

    /**
     * Store a newly created time sheet.
     */
    public function store(Request $request)
    {
        $this->authorizePermission($request, 'volunteer.timesheet.create');
        
        $organizationId = $request->user()->organization?->id;

        if (!$organizationId) {
            abort(403, 'You must be part of an organization.');
        }

        $validated = $request->validate([
            'job_application_id' => 'required|exists:job_applications,id',
            'work_date' => 'required|date',
            'hours' => 'required|numeric|min:0.01|max:24',
            'description' => 'nullable|string|max:1000',
            'notes' => 'nullable|string|max:2000',
        ]);

        // Verify the job application belongs to a volunteer job post of this organization
        $jobApplication = JobApplication::with('jobPost')->findOrFail($validated['job_application_id']);
        
        if ($jobApplication->jobPost->organization_id !== $organizationId || 
            $jobApplication->jobPost->type !== 'volunteer' ||
            $jobApplication->status !== 'accepted') {
            abort(403, 'Unauthorized action.');
        }

        // Check if a timesheet entry already exists for this volunteer on this date
        $existingTimesheet = VolunteerTimesheet::where('job_application_id', $validated['job_application_id'])
            ->where('work_date', $validated['work_date'])
            ->where('organization_id', $organizationId)
            ->first();

        if ($existingTimesheet) {
            return redirect()->back()
                ->withErrors(['work_date' => 'A time sheet entry already exists for this volunteer on this date.'])
                ->withInput();
        }

        $validated['organization_id'] = $organizationId;
        $validated['created_by'] = $request->user()->id;

        DB::transaction(function () use ($validated, $jobApplication) {
            $timesheet = VolunteerTimesheet::create($validated);
            
            // Calculate and award reward points
            $this->awardRewardPoints($jobApplication->user, $validated['hours']);
        });

        return redirect()->route('volunteers.timesheet.index')
            ->with('success', 'Time sheet entry created successfully.');
    }

    /**
     * Display the specified time sheet.
     */
    public function show(Request $request, VolunteerTimesheet $timesheet)
    {
        $this->authorizePermission($request, 'volunteer.timesheet.read');
        
        $organizationId = $request->user()->organization?->id;

        if (!$organizationId || $timesheet->organization_id !== $organizationId) {
            abort(403, 'Unauthorized action.');
        }

        $timesheet->load([
            'jobApplication.user',
            'jobApplication.jobPost',
            'creator'
        ]);

        // Format work_date for display
        $timesheetData = $timesheet->toArray();
        $timesheetData['work_date'] = $timesheet->work_date->format('Y-m-d');

        return Inertia::render('volunteers/timesheet/show', [
            'timesheet' => $timesheetData,
        ]);
    }

    /**
     * Show the form for editing the specified time sheet.
     */
    public function edit(Request $request, VolunteerTimesheet $timesheet)
    {
        $this->authorizePermission($request, 'volunteer.timesheet.edit');
        
        $organizationId = $request->user()->organization?->id;

        if (!$organizationId || $timesheet->organization_id !== $organizationId) {
            abort(403, 'Unauthorized action.');
        }

        $timesheet->load(['jobApplication.user', 'jobApplication.jobPost']);

        // Get initial list of approved volunteers (first 20)
        $volunteers = JobApplication::with(['user', 'jobPost'])
            ->where('status', 'accepted')
            ->whereHas('jobPost', function ($q) use ($organizationId) {
                $q->where('type', 'volunteer')
                  ->where('organization_id', $organizationId);
            })
            ->limit(20)
            ->get()
            ->map(function ($app) {
                return [
                    'id' => $app->id,
                    'name' => $app->user->name,
                    'position' => $app->jobPost->title,
                ];
            });

        // Format work_date to YYYY-MM-DD for HTML date input
        $timesheetData = $timesheet->toArray();
        $timesheetData['work_date'] = $timesheet->work_date->format('Y-m-d');

        return Inertia::render('volunteers/timesheet/edit', [
            'timesheet' => $timesheetData,
            'volunteers' => $volunteers,
        ]);
    }

    /**
     * Update the specified time sheet.
     */
    public function update(Request $request, VolunteerTimesheet $timesheet)
    {
        $this->authorizePermission($request, 'volunteer.timesheet.update');
        
        $organizationId = $request->user()->organization?->id;

        if (!$organizationId || $timesheet->organization_id !== $organizationId) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'job_application_id' => 'required|exists:job_applications,id',
            'work_date' => 'required|date',
            'hours' => 'required|numeric|min:0.01|max:24',
            'description' => 'nullable|string|max:1000',
            'notes' => 'nullable|string|max:2000',
        ]);

        // Verify the job application belongs to a volunteer job post of this organization
        $jobApplication = JobApplication::with('jobPost')->findOrFail($validated['job_application_id']);
        
        if ($jobApplication->jobPost->organization_id !== $organizationId || 
            $jobApplication->jobPost->type !== 'volunteer' ||
            $jobApplication->status !== 'accepted') {
            abort(403, 'Unauthorized action.');
        }

        // Check if another timesheet entry already exists for this volunteer on this date
        // (excluding the current timesheet being updated)
        $existingTimesheet = VolunteerTimesheet::where('job_application_id', $validated['job_application_id'])
            ->where('work_date', $validated['work_date'])
            ->where('organization_id', $organizationId)
            ->where('id', '!=', $timesheet->id)
            ->first();

        if ($existingTimesheet) {
            return redirect()->back()
                ->withErrors(['work_date' => 'A time sheet entry already exists for this volunteer on this date.'])
                ->withInput();
        }

        // Get the volunteer user
        $volunteerUser = $jobApplication->user;
        $oldHours = $timesheet->hours;
        $newHours = $validated['hours'];

        DB::transaction(function () use ($timesheet, $validated, $volunteerUser, $oldHours, $newHours) {
            $timesheet->update($validated);
            
            // Recalculate reward points: subtract old points, add new points
            $hourlyRate = $this->getHourlyRewardRate();
            $oldPoints = $oldHours * $hourlyRate;
            $newPoints = $newHours * $hourlyRate;
            $pointsDifference = $newPoints - $oldPoints;
            
            if ($pointsDifference != 0) {
                $volunteerUser->increment('reward_points', $pointsDifference);
            }
        });

        return redirect()->route('volunteers.timesheet.index')
            ->with('success', 'Time sheet entry updated successfully.');
    }

    /**
     * Fetch volunteers with pagination and search (API endpoint for combobox).
     */
    public function fetchVolunteers(Request $request)
    {
        $this->authorizePermission($request, 'volunteer.timesheet.create');
        
        $organizationId = $request->user()->organization?->id;

        if (!$organizationId) {
            return response()->json([
                'data' => [],
                'has_more' => false,
            ]);
        }

        $page = (int) $request->get('page', 1);
        $perPage = (int) $request->get('per_page', 20);
        $search = $request->get('search', '');

        $query = JobApplication::with(['user', 'jobPost'])
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

        $volunteers = $query->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'data' => $volunteers->map(function ($app) {
                return [
                    'id' => $app->id,
                    'value' => (string) $app->id,
                    'label' => $app->user->name . ' - ' . $app->jobPost->title,
                    'name' => $app->user->name,
                    'position' => $app->jobPost->title,
                ];
            }),
            'has_more' => $volunteers->hasMorePages(),
            'current_page' => $volunteers->currentPage(),
            'last_page' => $volunteers->lastPage(),
        ]);
    }

    /**
     * Remove the specified time sheet.
     */
    public function destroy(Request $request, VolunteerTimesheet $timesheet)
    {
        $this->authorizePermission($request, 'volunteer.timesheet.delete');
        
        $organizationId = $request->user()->organization?->id;

        if (!$organizationId || $timesheet->organization_id !== $organizationId) {
            abort(403, 'Unauthorized action.');
        }

        // Load the relationship and get the volunteer user before deleting
        $timesheet->load('jobApplication.user');
        $volunteerUser = $timesheet->jobApplication->user;
        $hours = $timesheet->hours;

        DB::transaction(function () use ($timesheet, $volunteerUser, $hours) {
            $timesheet->delete();
            
            // Subtract reward points when timesheet is deleted
            $this->subtractRewardPoints($volunteerUser, $hours);
        });

        return redirect()->route('volunteers.timesheet.index')
            ->with('success', 'Time sheet entry deleted successfully.');
    }

    /**
     * Get the hourly reward point rate from admin settings.
     */
    private function getHourlyRewardRate(): float
    {
        return (float) AdminSetting::get('volunteer_hourly_reward_points', 10.00);
    }

    /**
     * Calculate and award reward points to a volunteer based on hours worked.
     */
    private function awardRewardPoints($user, float $hours): void
    {
        $hourlyRate = $this->getHourlyRewardRate();
        $rewardPoints = $hours * $hourlyRate;
        
        if ($rewardPoints > 0) {
            $user->increment('reward_points', $rewardPoints);
        }
    }

    /**
     * Subtract reward points from a volunteer when timesheet is deleted.
     */
    private function subtractRewardPoints($user, float $hours): void
    {
        $hourlyRate = $this->getHourlyRewardRate();
        $rewardPoints = $hours * $hourlyRate;
        
        if ($rewardPoints > 0) {
            // Ensure reward_points doesn't go below 0
            $currentPoints = $user->reward_points ?? 0;
            $newPoints = max(0, $currentPoints - $rewardPoints);
            $user->update(['reward_points' => $newPoints]);
        }
    }
}
