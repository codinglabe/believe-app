<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Topic;
use App\Models\Enrollment;
use App\Models\Organization;
use App\Models\Meeting;
use App\Models\MeetingLink;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Crypt;

class CourseController extends Controller
{
    /**
     * Display a listing of courses for the public view.
     */
    public function publicIndex(Request $request)
    {
        $filters = $request->only(['search', 'topic_id', 'format', 'pricing_type', 'organization']);

        $courses = Course::query()
            ->with(['topic', 'organization.organization', 'creator'])
            ->when($filters['search'] ?? null, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', '%' . $search . '%')
                        ->orWhere('target_audience', 'like', '%' . $search . '%')
                        ->orWhere('description', 'like', '%' . $search . '%');
                });
            })
            ->when($filters['topic_id'] ?? null, function ($query, $topicId) {
                if ($topicId !== 'all') {
                    $query->where('topic_id', $topicId);
                }
            })
            ->when($filters['organization'] ?? null, function ($query, $organization) {
                if ($organization !== 'all') {
                    $query->whereHas('organization', function ($query) use ($organization) {
                        $query->where('slug', $organization);
                    });
                }
            })
            ->when($filters['format'] ?? null, function ($query, $format) {
                if ($format !== 'all') {
                    $query->where('format', $format);
                }
            })
            ->when($filters['pricing_type'] ?? null, function ($query, $pricingType) {
                if ($pricingType !== 'all') {
                    $query->where('pricing_type', $pricingType);
                }
            })
            ->orderBy('start_date', 'desc')
            ->paginate(9)
            ->withQueryString();

        // Add 'organization_name' attribute to each course for frontend
        $courses->getCollection()->transform(function ($course) {
            $course->organization_name = optional($course->organization->organization)->name;
            return $course;
        });

        $topics = Topic::orderBy('name')->get(['id', 'name']);

        $organizations = Organization::with('user:id,slug')
            ->orderBy('name')
            ->get()
            ->map(function ($org) {
                return [
                    'id' => $org->id,
                    'name' => $org->name,
                    'slug' => $org->user->slug ?? null,
                ];
            });

        return Inertia::render('frontend/course/Index', [
            'courses' => $courses,
            'topics' => $topics,
            'organizations' => $organizations,
            'filters' => $filters,
        ]);
    }

    /**
     * Display a listing of courses for the admin view.
     */
    public function adminIndex(Request $request)
    {
        $filters = $request->only([
            'courses_search',
            'courses_status',
            'courses_type',
            'courses_format',
            'courses_topic'
        ]);

        $query = Course::query()
            ->with(['topic', 'organization', 'creator'])
            // Only show courses for the current user's organization
            ->where('organization_id', Auth::id());

        // Search functionality
        if (!empty($filters['courses_search'])) {
            $search = $filters['courses_search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                    ->orWhere('description', 'like', '%' . $search . '%')
                    ->orWhere('target_audience', 'like', '%' . $search . '%')
                    ->orWhere('community_impact', 'like', '%' . $search . '%')
                    ->orWhereHas('organization', function ($orgQuery) use ($search) {
                        $orgQuery->where('name', 'like', '%' . $search . '%');
                    });
            });
        }

        // Topic filter
        if (!empty($filters['courses_topic'])) {
            $query->where('topic_id', $filters['courses_topic']);
        }

        // Pricing type filter
        if (!empty($filters['courses_type'])) {
            $query->where('pricing_type', $filters['courses_type']);
        }

        // Format filter
        if (!empty($filters['courses_format'])) {
            $query->where('format', $filters['courses_format']);
        }

        // Status filter (based on enrollment and start date)
        if (!empty($filters['courses_status'])) {
            $status = $filters['courses_status'];
            $now = now();

            switch ($status) {
                case 'available':
                    $query->where('start_date', '>=', $now->toDateString())
                        ->whereRaw('enrolled < max_participants')
                        ->whereRaw('(enrolled / max_participants) < 0.8');
                    break;
                case 'almost_full':
                    $query->where('start_date', '>=', $now->toDateString())
                        ->whereRaw('enrolled < max_participants')
                        ->whereRaw('(enrolled / max_participants) >= 0.8');
                    break;
                case 'full':
                    $query->where('start_date', '>=', $now->toDateString())
                        ->whereRaw('enrolled >= max_participants');
                    break;
                case 'started':
                    $query->where('start_date', '<', $now->toDateString());
                    break;
            }
        }

        $courses = $query->orderBy('start_date', 'desc')
            ->paginate(15)
            ->withQueryString();

        $topics = Topic::orderBy('name')->get(['id', 'name']);

        // Calculate statistics for the current user's organization
        $statistics = $this->calculateCourseStatistics(Auth::id());

        return Inertia::render('admin/course/Index', [
            'courses' => $courses,
            'topics' => $topics,
            'filters' => $filters,
            'statistics' => $statistics,
        ]);
    }

    /**
     * Calculate course statistics for the admin dashboard
     */
    private function calculateCourseStatistics($organizationId)
    {
        $baseQuery = Course::where('organization_id', $organizationId);
        $now = now();

        $courses = $baseQuery->withCount('activeEnrollments')->get();

        return [
            'total_courses' => $courses->count(),
            'free_courses' => $courses->where('pricing_type', 'free')->count(),
            'paid_courses' => $courses->where('pricing_type', 'paid')->count(),
            'active_courses' => $courses->where('start_date', '>=', $now->toDateString())->count(),
            'total_enrolled' => $courses->sum('active_enrollments_count'),
            'total_revenue' => $courses->where('pricing_type', 'paid')
                ->whereNotNull('course_fee')
                ->sum(function ($course) {
                    return $course->active_enrollments_count * $course->course_fee;
                }),
            'average_rating' => $courses->where('total_reviews', '>', 0)->avg('rating') ?: 0,
        ];
    }

    /**
     * Show the form for creating a new course.
     */
    public function create()
    {
        $topics = Topic::orderBy('name')->get(['id', 'name']);

        return Inertia::render('admin/course/Create', [
            'topics' => $topics,
        ]);
    }

    /**
     * Store a newly created course in storage.
     */
    public function store(Request $request)
    {

        $validated = $request->validate([
            // Basic Information
            'name' => 'required|string|max:255|unique:courses,name',
            'description' => 'required|string',
            'topic_id' => ['required', 'exists:topics,id'],

            // Pricing
            'pricing_type' => ['required', Rule::in(['free', 'paid'])],
            'course_fee' => 'nullable|numeric|min:0|required_if:pricing_type,paid',

            // Schedule & Format
            'start_date' => 'required|date|after_or_equal:today',
            'start_time' => 'required|date_format:H:i',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'duration' => ['required', Rule::in(['1_session', '1_week', '2_weeks', '1_month', '6_weeks', '3_months'])],
            'format' => ['required', Rule::in(['online', 'in_person', 'hybrid'])],

            // Configuration
            'max_participants' => 'required|integer|min:1|max:100',
            'language' => ['required', Rule::in(['English', 'Spanish', 'French', 'Other'])],

            // Target Audience & Impact
            'target_audience' => 'required|string|max:255',
            'community_impact' => 'nullable|string',

            // Course Content
            'learning_outcomes' => 'required|array|min:1',
            'learning_outcomes.*' => 'string|max:255',
            'prerequisites' => 'nullable|array',
            'prerequisites.*' => 'string|max:255',
            'materials_needed' => 'nullable|array',
            'materials_needed.*' => 'string|max:255',
            'accessibility_features' => 'nullable|array',
            'accessibility_features.*' => 'string|max:255',

            // Settings
            'certificate_provided' => 'boolean',
            'volunteer_opportunities' => 'boolean',

            // Media
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
        ]);

        // Handle image upload
        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('course_images', 'public');
        }

        // Generate slug from name
        $slug = Str::slug($validated['name']);
        $originalSlug = $slug;
        $counter = 1;

        // Ensure unique slug
        while (Course::where('slug', $slug)->exists()) {
            $slug = $originalSlug . '-' . $counter;
            $counter++;
        }

        try {
            DB::beginTransaction();

            $course = Course::create([
                // Auto-populated fields
                'organization_id' => Auth::id(), // Current user's ID as organization
                'user_id' => Auth::id(), // Current user's ID as creator

                // Form data
                'topic_id' => $validated['topic_id'],
                'name' => $validated['name'],
                'slug' => $slug,
                'description' => $validated['description'],

                // Pricing
                'pricing_type' => $validated['pricing_type'],
                'course_fee' => $validated['pricing_type'] === 'paid' ? $validated['course_fee'] : null,

                // Schedule & Format
                'start_date' => $validated['start_date'],
                'start_time' => $validated['start_time'],
                'end_date' => $validated['end_date'],
                'duration' => $validated['duration'],
                'format' => $validated['format'],

                // Configuration
                'max_participants' => $validated['max_participants'],
                'language' => $validated['language'],

                // Target Audience & Impact
                'target_audience' => $validated['target_audience'],
                'community_impact' => $validated['community_impact'],

                // Course Content
                'learning_outcomes' => $validated['learning_outcomes'],
                'prerequisites' => $validated['prerequisites'] ?? [],
                'materials_needed' => $validated['materials_needed'] ?? [],
                'accessibility_features' => $validated['accessibility_features'] ?? [],

                // Settings
                'certificate_provided' => $validated['certificate_provided'] ?? false,
                'volunteer_opportunities' => $validated['volunteer_opportunities'] ?? false,

                // Media
                'image' => $imagePath,

                // Defaults
                'enrolled' => 0,
                'rating' => 0.0,
                'total_reviews' => 0,
                'last_updated' => now(),
            ]);

            // Create default meeting for the course
            $course->createDefaultMeeting();

            DB::commit();

            return redirect()->route('admin.courses.index')->with('success', 'Community course created successfully with meeting links!');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to create course: ' . $e->getMessage());
            
            return redirect()->back()
                ->withInput()
                ->withErrors(['error' => 'Failed to create course. Please try again.']);
        }
    }

    /**
     * Auto-create meeting with unique hashed links when course is created
     */
    private function createMeetingWithLinks(Course $course)
    {
        // Calculate meeting start time (course start date + start time)
        $meetingDateTime = \Carbon\Carbon::parse($course->start_date . ' ' . $course->start_time);
        
        // Create meeting
        $meeting = Meeting::create([
            'course_id' => $course->id,
            'instructor_id' => $course->user_id,
            'title' => $course->name . ' - Live Session',
            'description' => 'Live meeting for ' . $course->name,
            'scheduled_at' => $meetingDateTime,
            'duration_minutes' => $this->calculateMeetingDuration($course->duration),
            'status' => 'scheduled',
            'max_participants' => $course->max_participants,
            'is_recording_enabled' => true,
            'is_chat_enabled' => true,
            'is_screen_share_enabled' => true,
        ]);

        // Generate unique host link for course creator
        $this->generateHostLink($meeting, $course->user_id);

        // Generate unique links for existing enrolled students (if any)
        $enrolledStudents = $course->activeEnrollments()->with('user')->get();
        foreach ($enrolledStudents as $enrollment) {
            $this->generateStudentLink($meeting, $enrollment->user_id);
        }

        Log::info('Auto-created meeting with links for course', [
            'course_id' => $course->id,
            'meeting_id' => $meeting->meeting_id,
            'instructor_id' => $course->user_id,
            'enrolled_students' => $enrolledStudents->count(),
        ]);

        return $meeting;
    }

    /**
     * Generate unique hashed host link
     */
    private function generateHostLink(Meeting $meeting, $userId)
    {
        // Create unique payload for host
        $payload = [
            'meeting_id' => $meeting->id,
            'user_id' => $userId,
            'role' => 'host',
            'course_id' => $meeting->course_id,
            'timestamp' => now()->timestamp,
            'expires_at' => $meeting->scheduled_at->addHours(6)->timestamp, // Link expires 6 hours after meeting
        ];

        // Generate hashed token
        $hashedToken = $this->generateHashedToken($payload);

        // Store in database
        MeetingLink::create([
            'meeting_id' => $meeting->id,
            'user_id' => $userId,
            'role' => 'host',
            'hashed_token' => $hashedToken,
            'expires_at' => $meeting->scheduled_at->addHours(6),
            'is_active' => true,
        ]);

        return $hashedToken;
    }

    /**
     * Generate unique hashed student link
     */
    private function generateStudentLink(Meeting $meeting, $userId)
    {
        // Create unique payload for student
        $payload = [
            'meeting_id' => $meeting->id,
            'user_id' => $userId,
            'role' => 'student',
            'course_id' => $meeting->course_id,
            'timestamp' => now()->timestamp,
            'expires_at' => $meeting->scheduled_at->addHours(4)->timestamp, // Link expires 4 hours after meeting
        ];

        // Generate hashed token
        $hashedToken = $this->generateHashedToken($payload);

        // Store in database
        MeetingLink::create([
            'meeting_id' => $meeting->id,
            'user_id' => $userId,
            'role' => 'student',
            'hashed_token' => $hashedToken,
            'expires_at' => $meeting->scheduled_at->addHours(4),
            'is_active' => true,
        ]);

        return $hashedToken;
    }

    /**
     * Generate secure hashed token
     */
    private function generateHashedToken(array $payload)
    {
        // Add random salt for extra security
        $payload['salt'] = Str::random(32);
        
        // Encrypt the payload
        $encryptedPayload = Crypt::encrypt($payload);
        
        // Create a URL-safe hash
        $hashedToken = base64_encode(hash('sha256', $encryptedPayload . config('app.key'), true));
        
        // Make it URL-safe
        return str_replace(['+', '/', '='], ['-', '_', ''], $hashedToken);
    }

    /**
     * Decode and validate hashed token
     */
    public function decodeHashedToken($hashedToken)
    {
        try {
            // Convert back from URL-safe format
            $hashedToken = str_replace(['-', '_'], ['+', '/'], $hashedToken);
            
            // Find the meeting link in database
            $meetingLink = MeetingLink::where('hashed_token', $hashedToken)
                ->where('is_active', true)
                ->where('expires_at', '>', now())
                ->first();

            if (!$meetingLink) {
                return null;
            }

            // Additional validation can be added here
            return [
                'meeting_id' => $meetingLink->meeting_id,
                'user_id' => $meetingLink->user_id,
                'role' => $meetingLink->role,
                'meeting_link' => $meetingLink,
            ];

        } catch (\Exception $e) {
            Log::error('Failed to decode meeting token', [
                'token' => $hashedToken,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Generate student link when user enrolls in course
     */
    public function generateLinkForNewEnrollment($courseId, $userId)
    {
        $course = Course::with('meeting')->find($courseId);
        
        if ($course && $course->meeting) {
            $this->generateStudentLink($course->meeting, $userId);
            
            Log::info('Generated meeting link for new enrollment', [
                'course_id' => $courseId,
                'user_id' => $userId,
                'meeting_id' => $course->meeting->id,
            ]);
        }
    }

    /**
     * Calculate meeting duration based on course duration
     */
    private function calculateMeetingDuration($courseDuration)
    {
        return match($courseDuration) {
            '1_session' => 180, // 3 hours
            '1_week' => 120,    // 2 hours
            '2_weeks' => 120,   // 2 hours
            '1_month' => 90,    // 1.5 hours
            '6_weeks' => 90,    // 1.5 hours
            '3_months' => 60,   // 1 hour
            default => 120,     // 2 hours default
        };
    }

    /**
     * Display the specified course.
     */
    public function publicShow(Course $course)
    {
        $course->load(['topic', 'organization', 'creator']);

        // Check if current user is enrolled (if authenticated)
        $userEnrollment = null;
        if (Auth::check()) {
            $userEnrollment = Enrollment::where('user_id', Auth::id())
                ->where('course_id', $course->id)
                ->first();
        }

        // Get enrollment statistics
        $enrollmentStats = [
            'total_enrolled' => $course->enrolled,
            'max_participants' => $course->max_participants,
            'available_spots' => max(0, $course->max_participants - $course->enrolled),
            'enrollment_percentage' => $course->max_participants > 0
                ? round(($course->enrolled / $course->max_participants) * 100, 1)
                : 0,
        ];

        // Determine course status
        $now = now();
        $courseStart = \Carbon\Carbon::parse($course->start_date);

        if ($courseStart->isPast()) {
            $status = 'started';
        } elseif ($course->enrolled >= $course->max_participants) {
            $status = 'full';
        } elseif (($course->enrolled / $course->max_participants) >= 0.8) {
            $status = 'almost_full';
        } else {
            $status = 'available';
        }

        // Get meeting information if user is enrolled
        $meetingInfo = null;
        if ($userEnrollment && $userEnrollment->status === 'active') {
            $activeMeeting = $course->getActiveMeeting();
            $upcomingMeetings = $course->getUpcomingMeetings();
            
            if ($activeMeeting || $upcomingMeetings->count() > 0) {
                $meetingInfo = [
                    'active_meeting' => $activeMeeting,
                    'upcoming_meetings' => $upcomingMeetings,
                ];

                // Add join links for the user
                if ($activeMeeting) {
                    $studentLink = $activeMeeting->getStudentLink(Auth::user());
                    $meetingInfo['active_meeting']->join_url = $studentLink ? $studentLink->getJoinUrl() : null;
                }

                foreach ($upcomingMeetings as $meeting) {
                    $studentLink = $meeting->getStudentLink(Auth::user());
                    $meeting->join_url = $studentLink ? $studentLink->getJoinUrl() : null;
                }
            }
        }

        return Inertia::render('frontend/course/Show', [
            'course' => $course,
            'userEnrollment' => $userEnrollment,
            'enrollmentStats' => $enrollmentStats,
            'status' => $status,
            'canEnroll' => !$userEnrollment && $status !== 'full' && $status !== 'started',
            'meetingInfo' => $meetingInfo,
        ]);
    }

    /**
     * Display the specified course in admin view.
     */
    public function adminShow(Course $course)
    {
        // Ensure user can only view their own organization's courses
        if ($course->organization_id !== Auth::id()) {
            abort(403, 'Unauthorized access to this course.');
        }

        $course->load(['topic', 'organization', 'creator', 'meetings']);

        // Get enrollment statistics
        $enrollmentStats = [
            'total_enrolled' => $course->enrolled,
            'max_participants' => $course->max_participants,
            'enrollment_percentage' => $course->max_participants > 0
                ? round(($course->enrolled / $course->max_participants) * 100, 1)
                : 0,
            'available_spots' => max(0, $course->max_participants - $course->enrolled),
        ];

        // Get course status
        $now = now();
        $courseStart = \Carbon\Carbon::parse($course->start_date);

        if ($courseStart->isPast()) {
            $status = 'started';
        } elseif ($course->enrolled >= $course->max_participants) {
            $status = 'full';
        } elseif (($course->enrolled / $course->max_participants) >= 0.8) {
            $status = 'almost_full';
        } else {
            $status = 'available';
        }

        // Get recent enrollments
        $recentEnrollments = Enrollment::where('course_id', $course->id)
            ->with('user')
            ->orderBy('enrolled_at', 'desc')
            ->limit(10)
            ->get();

        // Get meeting statistics
        $meetingStats = [
            'total_meetings' => $course->meetings()->count(),
            'scheduled_meetings' => $course->meetings()->where('status', 'scheduled')->count(),
            'active_meetings' => $course->meetings()->where('status', 'active')->count(),
            'completed_meetings' => $course->meetings()->where('status', 'ended')->count(),
        ];

        // Get host links for meetings
        $meetings = $course->meetings()->with('meetingLinks')->get();
        foreach ($meetings as $meeting) {
            $hostLink = $meeting->getHostLink();
            $meeting->host_join_url = $hostLink ? $hostLink->getJoinUrl() : null;
        }

        return Inertia::render('admin/course/Show', [
            'course' => $course,
            'enrollmentStats' => $enrollmentStats,
            'status' => $status,
            'recentEnrollments' => $recentEnrollments,
            'meetingStats' => $meetingStats,
            'meetings' => $meetings,
        ]);
    }

    /**
     * Show the form for editing the specified course.
     */
    public function edit(Course $course)
    {
        // Ensure user can only edit their own organization's courses
        if ($course->organization_id !== Auth::id()) {
            abort(403, 'Unauthorized access to this course.');
        }

        $topics = Topic::orderBy('name')->get(['id', 'name']);

        // Format the course data properly for the form
        $courseData = $course->load(['topic', 'organization', 'creator']);

        // Ensure dates are in proper format
        $courseData->start_date = $course->start_date instanceof \Carbon\Carbon
            ? $course->start_date->format('Y-m-d')
            : $course->start_date;

        $courseData->end_date = $course->end_date
            ? ($course->end_date instanceof \Carbon\Carbon
                ? $course->end_date->format('Y-m-d')
                : $course->end_date)
            : null;

        $courseData->start_time = $course->start_time instanceof \Carbon\Carbon
            ? $course->start_time->format('H:i')
            : (is_string($course->start_time) ? substr($course->start_time, 0, 5) : $course->start_time);

        return Inertia::render('admin/course/Edit', [
            'course' => $courseData,
            'topics' => $topics,
        ]);
    }

    /**
     * Update the specified course in storage.
     */
    public function update(Request $request, Course $course)
    {
        // Ensure user can only update their own organization's courses
        if ($course->organization_id !== Auth::id()) {
            abort(403, 'Unauthorized access to this course.');
        }

        $validated = $request->validate([
            // Basic Information
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('courses')->ignore($course->id),
            ],
            'description' => 'required|string',
            'topic_id' => ['required', 'exists:topics,id'],

            // Pricing
            'pricing_type' => ['required', Rule::in(['free', 'paid'])],
            'course_fee' => 'nullable|numeric|min:0|required_if:pricing_type,paid',

            // Schedule & Format
            'start_date' => 'required|date',
            'start_time' => 'required|date_format:H:i',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'duration' => ['required', Rule::in(['1_session', '1_week', '2_weeks', '1_month', '6_weeks', '3_months'])],
            'format' => ['required', Rule::in(['online', 'in_person', 'hybrid'])],

            // Configuration
            'max_participants' => 'required|integer|min:1|max:100',
            'language' => ['required', Rule::in(['English', 'Spanish', 'French', 'Other'])],

            // Target Audience & Impact
            'target_audience' => 'required|string|max:255',
            'community_impact' => 'nullable|string',

            // Course Content
            'learning_outcomes' => 'required|array|min:1',
            'learning_outcomes.*' => 'string|max:255',
            'prerequisites' => 'nullable|array',
            'prerequisites.*' => 'string|max:255',
            'materials_needed' => 'nullable|array',
            'materials_needed.*' => 'string|max:255',
            'accessibility_features' => 'nullable|array',
            'accessibility_features.*' => 'string|max:255',

            // Settings
            'certificate_provided' => 'boolean',
            'volunteer_opportunities' => 'boolean',

            // Media
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
        ]);

        // Handle image upload
        $imagePath = $course->image;
        if ($request->hasFile('image')) {
            // Delete old image if exists
            if ($course->image && Storage::disk('public')->exists($course->image)) {
                Storage::disk('public')->delete($course->image);
            }
            $imagePath = $request->file('image')->store('course_images', 'public');
        }

        // Update slug if name changed
        $slug = $course->slug;
        if ($course->name !== $validated['name']) {
            $slug = Str::slug($validated['name']);
            $originalSlug = $slug;
            $counter = 1;

            while (Course::where('slug', $slug)->where('id', '!=', $course->id)->exists()) {
                $slug = $originalSlug . '-' . $counter;
                $counter++;
            }
        }

        try {
            DB::beginTransaction();

            // Check if schedule changed and update meetings accordingly
            $scheduleChanged = $course->start_date !== $validated['start_date'] || 
                             $course->start_time !== $validated['start_time'];

            $course->update([
                // Note: organization_id and user_id are NOT updated - they remain as originally set
                'topic_id' => $validated['topic_id'],
                'name' => $validated['name'],
                'slug' => $slug,
                'description' => $validated['description'],

                // Pricing
                'pricing_type' => $validated['pricing_type'],
                'course_fee' => $validated['pricing_type'] === 'paid' ? $validated['course_fee'] : null,

                // Schedule & Format
                'start_date' => $validated['start_date'],
                'start_time' => $validated['start_time'],
                'end_date' => $validated['end_date'],
                'duration' => $validated['duration'],
                'format' => $validated['format'],

                // Configuration
                'max_participants' => $validated['max_participants'],
                'language' => $validated['language'],

                // Target Audience & Impact
                'target_audience' => $validated['target_audience'],
                'community_impact' => $validated['community_impact'],

                // Course Content
                'learning_outcomes' => $validated['learning_outcomes'],
                'prerequisites' => $validated['prerequisites'] ?? [],
                'materials_needed' => $validated['materials_needed'] ?? [],
                'accessibility_features' => $validated['accessibility_features'] ?? [],

                // Settings
                'certificate_provided' => $validated['certificate_provided'] ?? false,
                'volunteer_opportunities' => $validated['volunteer_opportunities'] ?? false,

                // Media
                'image' => $imagePath,

                // Update timestamp
                'last_updated' => now(),
            ]);

            // Update meeting schedules if course schedule changed
            if ($scheduleChanged) {
                $scheduledAt = \Carbon\Carbon::parse($validated['start_date'] . ' ' . $validated['start_time']);
                
                $course->meetings()
                    ->where('status', 'scheduled')
                    ->update(['scheduled_at' => $scheduledAt]);
            }

            DB::commit();

            return redirect()->route('admin.courses.index')->with('success', 'Community course updated successfully!');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update course: ' . $e->getMessage());
            
            return redirect()->back()
                ->withInput()
                ->withErrors(['error' => 'Failed to update course. Please try again.']);
        }
    }

    /**
     * Remove the specified course from storage.
     */
    public function destroy(Course $course)
    {
        // Ensure user can only delete their own organization's courses
        if ($course->organization_id !== Auth::id()) {
            abort(403, 'Unauthorized access to this course.');
        }

        try {
            DB::beginTransaction();

            // Delete image if exists
            if ($course->image && Storage::disk('public')->exists($course->image)) {
                Storage::disk('public')->delete($course->image);
            }

            // Note: Meetings, meeting links, and related data will be cascade deleted
            // due to foreign key constraints
            $course->delete();

            DB::commit();

            return redirect()->route('admin.courses.index')->with('success', 'Course deleted successfully!');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error deleting course: " . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to delete course. An unexpected error occurred.');
        }
    }
}
