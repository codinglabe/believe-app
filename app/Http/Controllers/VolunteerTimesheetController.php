<?php

namespace App\Http\Controllers;

use App\Models\VolunteerTimesheet;
use App\Models\JobApplication;
use App\Models\AdminSetting;
use App\Models\VolunteerAssessment;
use App\Services\ImpactScoreService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class VolunteerTimesheetController extends BaseController
{
    protected $impactScoreService;

    public function __construct(ImpactScoreService $impactScoreService)
    {
        $this->impactScoreService = $impactScoreService;
    }
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
            ->whereHas('user') // Ensure user exists
            ->whereHas('jobPost') // Ensure jobPost exists
            ->limit(20)
            ->get()
            ->map(function ($app) {
                return [
                    'id' => $app->id,
                    'name' => $app->user?->name ?? 'Unknown User',
                    'position' => $app->jobPost?->title ?? 'Unknown Position',
                    'base_points' => $app->jobPost?->points ?? 100,
                ];
            })
            ->filter(function ($volunteer) {
                // Filter out entries with missing critical data
                return $volunteer['name'] !== 'Unknown User';
            })
            ->values();

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
            'work_date' => 'nullable|date|required_without_all:start_date,end_date',
            'start_date' => 'nullable|date|required_without:work_date',
            'end_date' => 'nullable|date',
            'hours' => 'required|numeric|min:0.01|max:10000',
            'description' => 'nullable|string|max:1000',
            'notes' => 'nullable|string|max:2000',
            'grade' => 'nullable|in:excellent,good,acceptable,needs_improvement,rejected',
            'review_notes' => 'nullable|string|max:5000',
            'job_status' => 'nullable|in:completed,in_progress',
        ]);

        // Ensure work_date is set if start_date/end_date not provided
        if (!$validated['work_date'] && !$validated['start_date']) {
            $validated['work_date'] = $validated['end_date'] ?? now()->toDateString();
        }

        // Verify the job application belongs to a volunteer job post of this organization
        $jobApplication = JobApplication::with('jobPost')->findOrFail($validated['job_application_id']);
        
        if ($jobApplication->jobPost->organization_id !== $organizationId || 
            $jobApplication->jobPost->type !== 'volunteer' ||
            $jobApplication->status !== 'accepted') {
            abort(403, 'Unauthorized action.');
        }

        // Check if a timesheet entry already exists for this volunteer on this date
        $dateField = $validated['start_date'] ? 'start_date' : 'work_date';
        $dateValue = $validated['start_date'] ?? $validated['work_date'];
        
        $existingTimesheet = VolunteerTimesheet::where('job_application_id', $validated['job_application_id'])
            ->where($dateField, $dateValue)
            ->where('organization_id', $organizationId)
            ->first();

        if ($existingTimesheet) {
            return redirect()->back()
                ->withErrors(['work_date' => 'A time sheet entry already exists for this volunteer on this date.'])
                ->withInput();
        }

        $validated['organization_id'] = $organizationId;
        $validated['created_by'] = $request->user()->id;

        // Extract assessment data before creating timesheet
        $grade = $validated['grade'] ?? null;
        $reviewNotes = $validated['review_notes'] ?? null;
        $jobStatus = $validated['job_status'] ?? null;
        
        // Remove assessment fields from validated (not in fillable)
        unset($validated['grade'], $validated['review_notes'], $validated['job_status']);

        DB::transaction(function () use ($validated, $jobApplication, $grade, $reviewNotes, $jobStatus, $organizationId, $request) {
            $timesheet = VolunteerTimesheet::create($validated);
            
            // Handle assessment if grade is provided
            if ($grade) {
                $jobPost = $jobApplication->jobPost;
                $basePoints = $jobPost->points ?? 100;
                
                // Calculate final points
                $multiplier = VolunteerAssessment::getMultiplierForGrade($grade);
                $finalPoints = VolunteerAssessment::calculateFinalPoints($basePoints, $grade);
                
                // Create assessment
                $assessment = VolunteerAssessment::create([
                    'timesheet_id' => $timesheet->id,
                    'nonprofit_id' => $organizationId,
                    'grade' => $grade,
                    'multiplier' => $multiplier,
                    'final_points' => $finalPoints,
                    'review_notes' => $reviewNotes,
                    'reviewed_by' => $request->user()->id,
                    'reviewed_at' => now(),
                ]);
                
                // Credit points to volunteer's ledger
                if ($finalPoints > 0) {
                    $jobApplication->user->addRewardPoints(
                        $finalPoints,
                        'nonprofit_assessment',
                        $assessment->id,
                        "Volunteer assessment: {$grade} (Base: {$basePoints} × " . ($multiplier * 100) . "%)",
                        [
                            'timesheet_id' => $timesheet->id,
                            'job_post_id' => $jobPost->id,
                            'base_points' => $basePoints,
                            'grade' => $grade,
                            'multiplier' => $multiplier,
                        ]
                    );
                }
                
                // Update job application metadata if job status provided
                if ($jobStatus) {
                    $metadata = $jobApplication->metadata ?? [];
                    $metadata['job_status'] = $jobStatus;
                    $jobApplication->metadata = $metadata;
                    $jobApplication->save();
                }
            } else {
                // Only award regular reward points if no assessment
                $this->awardRewardPoints($jobApplication->user, $validated['hours']);
            }
            
            // Award impact points
            $this->impactScoreService->awardVolunteerPoints($timesheet);
            
            // Check for consistency bonus
            $this->impactScoreService->checkAndAwardConsistencyBonus($jobApplication->user);
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

        // Format dates for display
        $timesheetData = $timesheet->toArray();
        $timesheetData['work_date'] = $timesheet->work_date->format('Y-m-d');
        $timesheetData['start_date'] = $timesheet->start_date ? $timesheet->start_date->format('Y-m-d') : null;
        $timesheetData['end_date'] = $timesheet->end_date ? $timesheet->end_date->format('Y-m-d') : null;
        $timesheetData['status'] = $timesheet->status ?? 'pending';
        $timesheetData['is_completion_request'] = $timesheet->is_completion_request ?? false;
        
        // Get base points from job post for assessment calculation
        $timesheetData['base_points'] = $timesheet->jobApplication->jobPost->points ?? 100;

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

        $timesheet->load(['jobApplication.user', 'jobApplication.jobPost', 'assessment']);

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
                    'base_points' => $app->jobPost->points ?? 100,
                ];
            });

        // Format dates to YYYY-MM-DD for HTML date input
        $timesheetData = $timesheet->toArray();
        $timesheetData['work_date'] = $timesheet->work_date->format('Y-m-d');
        $timesheetData['start_date'] = $timesheet->start_date ? $timesheet->start_date->format('Y-m-d') : null;
        $timesheetData['end_date'] = $timesheet->end_date ? $timesheet->end_date->format('Y-m-d') : null;
        $timesheetData['status'] = $timesheet->status ?? 'pending';
        $timesheetData['is_completion_request'] = $timesheet->is_completion_request ?? false;
        
        // Add assessment data if exists
        if ($timesheet->assessment) {
            $timesheetData['assessment'] = [
                'grade' => $timesheet->assessment->grade,
                'review_notes' => $timesheet->assessment->review_notes,
            ];
            
            // Get job status from job application metadata if exists
            $jobApplication = $timesheet->jobApplication;
            if ($jobApplication && $jobApplication->metadata) {
                $metadata = $jobApplication->metadata;
                if (isset($metadata['job_status'])) {
                    $timesheetData['assessment']['job_status'] = $metadata['job_status'];
                }
            }
        }

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
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'hours' => 'required|numeric|min:0.01|max:10000',
            'description' => 'nullable|string|max:1000',
            'notes' => 'nullable|string|max:2000',
            'grade' => 'nullable|in:excellent,good,acceptable,needs_improvement,rejected',
            'review_notes' => 'nullable|string|max:5000',
            'job_status' => 'nullable|in:completed,in_progress',
        ]);

        // Verify the job application belongs to a volunteer job post of this organization
        $jobApplication = JobApplication::with('jobPost')->findOrFail($validated['job_application_id']);
        
        if ($jobApplication->jobPost->organization_id !== $organizationId || 
            $jobApplication->jobPost->type !== 'volunteer' ||
            $jobApplication->status !== 'accepted') {
            abort(403, 'Unauthorized action.');
        }

        // Check if another timesheet entry already exists for this volunteer on this date
        // Only check for duplicates if start_date is provided and different from current
        if (!empty($validated['start_date'])) {
            $newStartDate = $validated['start_date'];
            $currentStartDate = $timesheet->start_date ? $timesheet->start_date->format('Y-m-d') : null;
            
            // Only check for duplicates if the date is actually different
            if ($newStartDate !== $currentStartDate) {
                $existingTimesheet = VolunteerTimesheet::where('job_application_id', $validated['job_application_id'])
                    ->where('organization_id', $organizationId)
                    ->where('id', '!=', $timesheet->id)
                    ->where('start_date', $newStartDate)
                    ->first();

                if ($existingTimesheet) {
                    return redirect()->back()
                        ->withErrors(['start_date' => 'A time sheet entry already exists for this volunteer on this date.'])
                        ->withInput();
                }
            }
        }

        // Get the volunteer user
        $volunteerUser = $jobApplication->user;
        $oldHours = $timesheet->hours;
        $newHours = $validated['hours'];
        
        // Extract assessment data
        $grade = $validated['grade'] ?? null;
        $reviewNotes = $validated['review_notes'] ?? null;
        $jobStatus = $validated['job_status'] ?? null;
        
        // Preserve work_date if start_date not provided (timesheet might have work_date from before)
        if (!$validated['start_date'] && !$validated['end_date'] && $timesheet->work_date) {
            $validated['work_date'] = $timesheet->work_date;
        }
        
        // Remove assessment fields from validated (not in fillable)
        unset($validated['grade'], $validated['review_notes'], $validated['job_status']);

        DB::transaction(function () use ($timesheet, $validated, $volunteerUser, $oldHours, $newHours, $grade, $reviewNotes, $jobStatus, $organizationId, $jobApplication, $request) {
            // Remove old impact points
            $this->impactScoreService->removeVolunteerPoints($timesheet);
            
            $timesheet->update($validated);
            
            // Handle assessment if grade is provided
            if ($grade) {
                $jobPost = $jobApplication->jobPost;
                $basePoints = $jobPost->points ?? 100;
                
                // Calculate final points
                $multiplier = VolunteerAssessment::getMultiplierForGrade($grade);
                $finalPoints = VolunteerAssessment::calculateFinalPoints($basePoints, $grade);
                
                // Update or create assessment
                $assessment = VolunteerAssessment::updateOrCreate(
                    ['timesheet_id' => $timesheet->id],
                    [
                        'nonprofit_id' => $organizationId,
                        'grade' => $grade,
                        'multiplier' => $multiplier,
                        'final_points' => $finalPoints,
                        'review_notes' => $reviewNotes,
                        'reviewed_by' => $request->user()->id,
                        'reviewed_at' => now(),
                    ]
                );
                
                // Note: Points are already awarded if assessment existed, so we only adjust if needed
                // In a real scenario, you might want to recalculate and adjust points
            }
            
            // Only recalculate reward points if no assessment (regular timesheet)
            if (!$grade) {
                $hourlyRate = $this->getHourlyRewardRate();
                $oldPoints = $oldHours * $hourlyRate;
                $newPoints = $newHours * $hourlyRate;
                $pointsDifference = $newPoints - $oldPoints;
                
                if ($pointsDifference != 0) {
                    $volunteerUser->increment('reward_points', $pointsDifference);
                }
            }
            
            // Update job application metadata if job status provided
            if ($jobStatus) {
                $metadata = $jobApplication->metadata ?? [];
                $metadata['job_status'] = $jobStatus;
                $jobApplication->metadata = $metadata;
                $jobApplication->save();
            }
            
            // Reload timesheet with relationships and award new impact points
            $timesheet->refresh();
            $timesheet->load(['jobApplication', 'jobApplication.user', 'jobApplication.jobPost']);
            $this->impactScoreService->awardVolunteerPoints($timesheet);
        });

        return redirect()->route('volunteers.timesheet.index')
            ->with('success', 'Time sheet entry updated successfully.');
    }

    /**
     * Update timesheet status (for completion requests) with assessment
     */
    public function updateStatus(Request $request, VolunteerTimesheet $timesheet)
    {
        $this->authorizePermission($request, 'volunteer.timesheet.update');
        
        $organizationId = $request->user()->organization?->id;

        if (!$organizationId || $timesheet->organization_id !== $organizationId) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'status' => 'required|in:pending,approved,rejected',
            'grade' => 'nullable|in:excellent,good,acceptable,needs_improvement,rejected',
            'review_notes' => 'nullable|string|max:5000',
            'job_status' => 'nullable|in:completed,in_progress',
        ]);

        // If approving, require assessment for completion requests
        if ($validated['status'] === 'approved' && $timesheet->is_completion_request) {
            if (empty($validated['grade'])) {
                return redirect()->back()
                    ->withErrors(['grade' => 'Please select a grade for the assessment.'])
                    ->withInput();
            }
        }

        $timesheet->load(['jobApplication.jobPost', 'jobApplication.user']);

        DB::transaction(function () use ($timesheet, $validated, $organizationId, $request) {
            // Update timesheet status
            $timesheet->update([
                'status' => $validated['status']
            ]);

            // Create assessment for approved completion requests
            if ($validated['status'] === 'approved' && $timesheet->is_completion_request && !empty($validated['grade'])) {
                $jobPost = $timesheet->jobApplication->jobPost;
                $volunteerUser = $timesheet->jobApplication->user;

                // Get base points from job post (points field for volunteer jobs)
                $basePoints = $jobPost->points ?? 100; // Default to 100 if not set

                // Calculate final points using grade multiplier
                $multiplier = VolunteerAssessment::getMultiplierForGrade($validated['grade']);
                $finalPoints = VolunteerAssessment::calculateFinalPoints($basePoints, $validated['grade']);

                // Create assessment
                $assessment = VolunteerAssessment::create([
                    'timesheet_id' => $timesheet->id,
                    'nonprofit_id' => $organizationId,
                    'grade' => $validated['grade'],
                    'multiplier' => $multiplier,
                    'final_points' => $finalPoints,
                    'review_notes' => $validated['review_notes'] ?? null,
                    'reviewed_by' => $request->user()->id,
                    'reviewed_at' => now(),
                ]);

                // Credit points to volunteer's ledger (only if approved and points > 0)
                if ($validated['status'] === 'approved' && $finalPoints > 0) {
                    $volunteerUser->addRewardPoints(
                        $finalPoints,
                        'nonprofit_assessment',
                        $assessment->id,
                        "Volunteer assessment: {$validated['grade']} (Base: {$basePoints} × " . ($multiplier * 100) . "%)",
                        [
                            'timesheet_id' => $timesheet->id,
                            'job_post_id' => $jobPost->id,
                            'base_points' => $basePoints,
                            'grade' => $validated['grade'],
                            'multiplier' => $multiplier,
                        ]
                    );
                }

                // Update job application metadata if approved
                if ($validated['status'] === 'approved') {
                    $jobApplication = $timesheet->jobApplication;
                    $metadata = $jobApplication->metadata ?? [];
                    $metadata['assessment_completed'] = true;
                    $metadata['assessment_grade'] = $validated['grade'];
                    $metadata['points_awarded'] = $finalPoints;
                    $metadata['assessment_date'] = now()->toISOString();
                    // Optionally update job status in metadata if provided
                    if (!empty($validated['job_status']) && in_array($validated['job_status'], ['completed', 'in_progress'])) {
                        $metadata['job_status'] = $validated['job_status'];
                    }
                    
                    $jobApplication->metadata = $metadata;
                    $jobApplication->save();
                }
            }
        });

        $statusMessage = match($validated['status']) {
            'approved' => 'Time sheet approved and assessment completed successfully.',
            'rejected' => 'Time sheet rejected.',
            default => 'Time sheet status updated successfully.',
        };

        return redirect()->back()
            ->with('success', $statusMessage);
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
            })
            ->whereHas('user') // Ensure user exists
            ->whereHas('jobPost'); // Ensure jobPost exists

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
                // Handle null relationships gracefully
                $userName = $app->user?->name ?? 'Unknown User';
                $jobPostTitle = $app->jobPost?->title ?? 'Unknown Position';
                
                return [
                    'id' => $app->id,
                    'value' => (string) $app->id,
                    'label' => $userName . ' - ' . $jobPostTitle,
                    'name' => $userName,
                    'position' => $jobPostTitle,
                ];
            })->filter(function ($volunteer) {
                // Filter out entries with missing critical data
                return $volunteer['name'] !== 'Unknown User';
            })->values(),
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
            // Remove impact points
            $this->impactScoreService->removeVolunteerPoints($timesheet);
            
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
