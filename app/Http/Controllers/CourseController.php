<?php

namespace App\Http\Controllers;

use App\Jobs\SendCourseNotification;
use App\Models\Course;
use App\Models\Topic;
use App\Models\Enrollment;
use App\Models\Organization;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class CourseController extends BaseController
{

    /**
     * Display a listing of courses for the public view.
     */
    public function publicIndex(Request $request)
    {
        $filters = $request->only(['search', 'topic_id', 'format', 'pricing_type', 'organization', 'type', 'event_type_id']);

        $courses = Course::query()
            ->with(['topic', 'eventType', 'organization.organization', 'creator'])
            ->withCount(['enrollmentsCount as enrolled_count'])
            ->when($filters['search'] ?? null, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', '%' . $search . '%')
                        ->orWhere('target_audience', 'like', '%' . $search . '%')
                        ->orWhere('description', 'like', '%' . $search . '%');
                });
            })
            ->when($filters['type'] ?? null, function ($query, $type) {
                if ($type !== 'all') {
                    $query->where('type', $type);
                }
            })
            ->when($filters['topic_id'] ?? null, function ($query, $topicId) {
                if ($topicId !== 'all') {
                    $query->where('topic_id', $topicId);
                }
            })
            ->when($filters['event_type_id'] ?? null, function ($query, $eventTypeId) {
                if ($eventTypeId !== 'all') {
                    $query->where('event_type_id', $eventTypeId);
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
        // Replace enrolled count with actual count from enrollments table
        $courses->getCollection()->transform(function ($course) {
            $course->organization_name = optional($course->organization->organization)->name;
            $course->enrolled = $course->enrolled_count ?? 0;
            return $course;
        });

        $topics = Topic::orderBy('name')->get(['id', 'name']);
        $eventTypes = \App\Models\EventType::where('is_active', true)
            ->orderBy('category')
            ->orderBy('name')
            ->get(['id', 'name', 'category']);

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
            'eventTypes' => $eventTypes,
            'organizations' => $organizations,
            'filters' => $filters,
        ]);
    }

    /**
     * Display a listing of courses for the admin view.
     */
    public function adminIndex(Request $request)
    {
        $this->authorizePermission($request, 'course.read');
        $filters = $request->only([
            'courses_search',
            'courses_status',
            'courses_type',
            'courses_course_type',
            'courses_topic'
        ]);

        $user = Auth::user();

        $query = Course::query()
            ->with(['topic', 'eventType', 'organization', 'creator'])
            ->withCount(['enrollmentsCount as enrolled_count']);

        // ✅ If user is not admin → restrict by organization
        if ($user->role !== 'admin') {
            $query->where('organization_id', $user->id);
        }

        // 🔍 Search functionality
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

        // 🔎 Topic/Event Type filter - depends on course_course_type
        if (!empty($filters['courses_topic'])) {
            $courseType = $filters['courses_course_type'] ?? '';
            if ($courseType === 'event') {
                // Filter by event_type_id when type is event
                $query->where('event_type_id', $filters['courses_topic']);
            } else {
                // Filter by topic_id when type is course or not specified
                $query->where('topic_id', $filters['courses_topic']);
            }
        }

        // 🔎 Pricing type filter
        if (!empty($filters['courses_type'])) {
            $query->where('pricing_type', $filters['courses_type']);
        }

        // 🔎 Course/Event type filter
        if (!empty($filters['courses_course_type'])) {
            $query->where('type', $filters['courses_course_type']);
        }

        // 🔎 Status filter
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

        // Replace enrolled count with actual count from enrollments table
        $courses->getCollection()->transform(function ($course) {
            $course->enrolled = $course->enrolled_count ?? 0;
            return $course;
        });

        $topics = Topic::orderBy('name')->get(['id', 'name']);
        $eventTypes = \App\Models\EventType::where('is_active', true)
            ->orderBy('category')
            ->orderBy('name')
            ->get(['id', 'name', 'category']);

        // ✅ Calculate statistics only for authenticated organization
        // For organization users, use their user_id as organization_id
        // For admin users, they should also see their own organization's data if they have one
        $organizationId = $user->role === 'organization' ? $user->id : ($user->organization_id ?? $user->id);
        $statistics = $this->calculateCourseStatistics($organizationId);

        return Inertia::render('admin/course/Index', [
            'courses' => $courses,
            'topics' => $topics,
            'eventTypes' => $eventTypes,
            'filters' => $filters,
            'statistics' => $statistics,
        ]);
    }


    /**
     * Calculate course statistics for the admin dashboard
     */
    private function calculateCourseStatistics($organizationId)
    {
        $baseQuery = Course::query();
        if ($organizationId) {
            $baseQuery->where('organization_id', $organizationId);
        }
        $now = now();

        $courses = $baseQuery->withCount(['enrollmentsCount as enrolled_count'])->get();

        return [
            'total_courses' => $courses->count(),
            'free_courses' => $courses->where('pricing_type', 'free')->count(),
            'paid_courses' => $courses->where('pricing_type', 'paid')->count(),
            'active_courses' => $courses->where('start_date', '>=', $now->toDateString())->count(),
            'total_enrolled' => $courses->sum('enrolled_count'),
            'total_revenue' => $courses->where('pricing_type', 'paid')
                ->whereNotNull('course_fee')
                ->sum(function ($course) {
                    return ($course->enrolled_count ?? 0) * $course->course_fee;
                }),
            'average_rating' => $courses->where('total_reviews', '>', 0)->avg('rating') ?: 0,
        ];
    }

    /**
     * Show the form for creating a new course.
     */
    public function create(Request $request)
    {
        $this->authorizePermission($request, 'course.create');
        $topics = Topic::orderBy('name')->get(['id', 'name']);
        $eventTypes = \App\Models\EventType::where('is_active', true)
            ->orderBy('category')
            ->orderBy('name')
            ->get(['id', 'name', 'category']);

        return Inertia::render('admin/course/Create', [
            'topics' => $topics,
            'eventTypes' => $eventTypes,
        ]);
    }

    /**
     * Store a newly created course in storage.
     */
    public function store(Request $request)
    {
        $this->authorizePermission($request, 'course.create');
        
        $type = $request->input('type', 'course');
        $typeLabel = $type === 'course' ? 'course' : 'event';
        $typeLabelCapital = $type === 'course' ? 'Course' : 'Event';
        
        $validated = $request->validate([
            // Basic Information
            'name' => 'required|string|max:255|unique:courses,name',
            'description' => 'required|string',
            'type' => ['required', Rule::in(['course', 'event'])],
            'topic_id' => ['required_if:type,course', 'nullable', 'exists:topics,id'],
            'event_type_id' => ['required_if:type,event', 'nullable', 'exists:event_types,id'],
            'meeting_link' => 'nullable|url|max:500', // Added meeting_link validation

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
        ], [
            // Custom error messages
            'name.required' => "The {$typeLabelCapital} name is required.",
            'name.unique' => "A {$typeLabel} with this name already exists.",
            'name.max' => "The {$typeLabelCapital} name may not be greater than 255 characters.",
            'description.required' => "The {$typeLabelCapital} description is required.",
            'type.required' => 'Please select a type (Course or Event).',
            'type.in' => 'Type must be either Course or Event.',
            'topic_id.required_if' => 'Please select a course topic.',
            'topic_id.exists' => 'The selected topic is invalid.',
            'event_type_id.required_if' => 'Please select an event type.',
            'event_type_id.exists' => 'The selected event type is invalid.',
            'meeting_link.url' => 'The meeting link must be a valid URL.',
            'meeting_link.max' => 'The meeting link may not be greater than 500 characters.',
            'pricing_type.required' => 'Please select a pricing type.',
            'pricing_type.in' => 'Pricing type must be either Free or Paid.',
            'course_fee.required_if' => $type === 'course' ? 'Course fee is required when pricing type is Paid.' : 'Event fee is required when pricing type is Paid.',
            'course_fee.numeric' => $type === 'course' ? 'Course fee must be a number.' : 'Event fee must be a number.',
            'course_fee.min' => $type === 'course' ? 'Course fee must be at least 0.' : 'Event fee must be at least 0.',
            'start_date.required' => 'Start date is required.',
            'start_date.date' => 'Start date must be a valid date.',
            'start_date.after_or_equal' => 'Start date must be today or a future date.',
            'start_time.required' => 'Start time is required.',
            'start_time.date_format' => 'Start time must be in HH:MM format.',
            'end_date.date' => 'End date must be a valid date.',
            'end_date.after_or_equal' => 'End date must be on or after the start date.',
            'duration.required' => 'Duration is required.',
            'duration.in' => 'Please select a valid duration.',
            'format.required' => 'Format is required.',
            'format.in' => 'Format must be Online, In-Person, or Hybrid.',
            'max_participants.required' => 'Maximum participants is required.',
            'max_participants.integer' => 'Maximum participants must be a number.',
            'max_participants.min' => 'Maximum participants must be at least 1.',
            'max_participants.max' => 'Maximum participants may not be greater than 100.',
            'language.required' => 'Language is required.',
            'language.in' => 'Please select a valid language.',
            'target_audience.required' => 'Target audience is required.',
            'target_audience.max' => 'Target audience may not be greater than 255 characters.',
            'learning_outcomes.required' => $type === 'course' ? 'Learning outcomes are required.' : 'Event outcomes are required.',
            'learning_outcomes.array' => $type === 'course' ? 'Learning outcomes must be an array.' : 'Event outcomes must be an array.',
            'learning_outcomes.min' => $type === 'course' ? 'At least one learning outcome is required.' : 'At least one event outcome is required.',
            'learning_outcomes.*.max' => $type === 'course' ? 'Each learning outcome may not be greater than 255 characters.' : 'Each event outcome may not be greater than 255 characters.',
            'prerequisites.*.max' => 'Each prerequisite may not be greater than 255 characters.',
            'materials_needed.*.max' => 'Each material needed may not be greater than 255 characters.',
            'accessibility_features.*.max' => 'Each accessibility feature may not be greater than 255 characters.',
            'image.image' => 'The image must be an image file.',
            'image.mimes' => 'The image must be a file of type: jpeg, png, jpg, gif, svg.',
            'image.max' => 'The image may not be greater than 2MB.',
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
                'organization_id' => Auth::id(),
                'user_id' => Auth::id(),

                // Form data
                'type' => $validated['type'],
                'topic_id' => $validated['topic_id'] ?? null,
                'event_type_id' => $validated['event_type_id'] ?? null,
                'name' => $validated['name'],
                'slug' => $slug,
                'description' => $validated['description'],
                'meeting_link' => $validated['meeting_link'], // Added meeting_link field

                // Pricing
                'pricing_type' => $validated['pricing_type'],
                'course_fee' => $validated['pricing_type'] === 'paid' ? $validated['course_fee'] : null,

                // Schedule & Format
                'start_date' => $validated['start_date'],
                'start_time' => $validated['start_time'],
                'end_date' => $validated['end_date'] ?? null,
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


            DB::commit();

            SendCourseNotification::dispatch($course);

            return redirect()->route('admin.courses.index')->with('success', 'Community course created successfully!');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to create course: ' . $e->getMessage());

            return redirect()->back()
                ->withInput()
                ->withErrors(['error' => 'Failed to create course. Please try again.']);
        }
    }

    /**
     * Display the specified course.
     */
    public function publicShow(Course $course)
    {
        $course->load(['topic', 'eventType', 'organization', 'creator']);

        // Check if current user is enrolled (if authenticated)
        $userEnrollment = null;
        $user = Auth::user();
        if (Auth::check()) {
            $userEnrollment = Enrollment::where('user_id', Auth::id())
                ->where('course_id', $course->id)
                ->first();
        }

        // Get enrollment count from enrollments table
        $enrolledCount = Enrollment::where('course_id', $course->id)
            ->whereIn('status', ['active', 'completed', 'pending'])
            ->count();

        // Get enrollment statistics
        $enrollmentStats = [
            'total_enrolled' => $enrolledCount,
            'max_participants' => $course->max_participants,
            'available_spots' => max(0, $course->max_participants - $enrolledCount),
            'enrollment_percentage' => $course->max_participants > 0
                ? round(($enrolledCount / $course->max_participants) * 100, 1)
                : 0,
        ];

        // Determine course status
        // Combine start_date and start_time to check if course has actually started
        // Enrollment should be available until the actual start date/time
        try {
            // Extract just the date part from start_date (in case it's a datetime)
            $datePart = \Carbon\Carbon::parse($course->start_date)->format('Y-m-d');
            // Extract time part (handle both H:i and H:i:s formats)
            $timePart = $course->start_time ?? '00:00';
            // Remove seconds if present
            if (strlen($timePart) > 5) {
                $timePart = substr($timePart, 0, 5);
            }
            // Combine date and time
            $startDateTime = \Carbon\Carbon::createFromFormat('Y-m-d H:i', $datePart . ' ' . $timePart);
        } catch (\Exception $e) {
            // Fallback: try to parse start_date as date only
            try {
                $dateOnly = \Carbon\Carbon::parse($course->start_date)->format('Y-m-d');
                $timeOnly = substr($course->start_time ?? '00:00', 0, 5); // Get HH:mm format
                $startDateTime = \Carbon\Carbon::createFromFormat('Y-m-d H:i', $dateOnly . ' ' . $timeOnly);
            } catch (\Exception $e2) {
                // Final fallback: use current time + 1 hour as default (so it's not started)
                $startDateTime = \Carbon\Carbon::now()->addHour();
            }
        }

        // Get enrollment count from enrollments table
        $enrolledCount = Enrollment::where('course_id', $course->id)
            ->whereIn('status', ['active', 'completed', 'pending'])
            ->count();

        // Check status - enrollment should be available until the course/event actually starts
        // Only mark as 'started' if the start date/time has actually passed
        if ($startDateTime->isPast()) {
            $status = 'started';
        } elseif ($course->max_participants > 0 && $enrolledCount >= $course->max_participants) {
            $status = 'full';
        } elseif ($course->max_participants > 0 && ($enrolledCount / $course->max_participants) >= 0.8) {
            $status = 'almost_full';
        } elseif (Auth::check() && Auth::user()->id === $course->user_id) {
            $status = 'unavailable';
        } else {
            $status = 'available';
        }

        // Check if user has an active enrollment (not cancelled/refunded)
        $hasActiveEnrollment = $userEnrollment && in_array($userEnrollment->status ?? '', ['active', 'completed', 'pending']);

        // Allow enrollment/registration if available and not full/started, regardless of paid/free
        // Button should be visible and active until the actual start date/time
        // For paid courses, users can still enroll (they'll be redirected to payment)
        // For free courses, users can enroll directly
        // Allow enrollment for 'available' and 'almost_full' statuses
        // Only block if: user is enrolled, course is full, course has started, or user is creator
        $canEnroll = !$hasActiveEnrollment 
            && $status !== 'full' 
            && $status !== 'started' 
            && $status !== 'unavailable';
        
        // Log for debugging (remove in production)
        \Log::debug('Course Enrollment Check', [
            'course_id' => $course->id,
            'course_name' => $course->name,
            'start_date' => $course->start_date,
            'start_time' => $course->start_time,
            'startDateTime' => $startDateTime->toDateTimeString(),
            'isPast' => $startDateTime->isPast(),
            'status' => $status,
            'userEnrollment' => $userEnrollment ? $userEnrollment->status : null,
            'hasActiveEnrollment' => $hasActiveEnrollment,
            'canEnroll' => $canEnroll,
        ]);

        // Add enrolled count to course object for frontend display
        $course->enrolled = $enrolledCount;

        return Inertia::render('frontend/course/Show', [
            'course' => $course,
            'userEnrollment' => $userEnrollment,
            'enrollmentStats' => $enrollmentStats,
            'status' => $status,
            'canEnroll' => $canEnroll,
            'meetingLink' => $course->meeting_link, // Added meeting_link field
        ]);
    }

    /**
     * Display the specified course in admin view.
     */
    public function adminShow(Request $request, Course $course)
    {
        $this->authorizePermission($request, 'course.read');
        // Ensure user can only view their own organization's courses
        if ($course->organization_id !== Auth::id()) {
            abort(403, 'Unauthorized access to this course.');
        }

        $course->load(['topic', 'eventType', 'organization', 'creator']);

        // Get enrollment count from enrollments table
        $enrolledCount = Enrollment::where('course_id', $course->id)
            ->whereIn('status', ['active', 'completed', 'pending'])
            ->count();

        // Get enrollment statistics
        $enrollmentStats = [
            'total_enrolled' => $enrolledCount,
            'max_participants' => $course->max_participants,
            'enrollment_percentage' => $course->max_participants > 0
                ? round(($enrolledCount / $course->max_participants) * 100, 1)
                : 0,
            'available_spots' => max(0, $course->max_participants - $enrolledCount),
        ];

        // Get course status
        $now = now();
        $courseStart = \Carbon\Carbon::parse($course->start_date);

        if ($courseStart->isPast()) {
            $status = 'started';
        } elseif ($enrolledCount >= $course->max_participants) {
            $status = 'full';
        } elseif (($enrolledCount / $course->max_participants) >= 0.8) {
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

        return Inertia::render('admin/course/Show', [
            'course' => $course,
            'enrollmentStats' => $enrollmentStats,
            'status' => $status,
            'recentEnrollments' => $recentEnrollments,
        ]);
    }

    /**
     * Display enrollments for a specific course/event
     */
    public function adminEnrollments(Request $request, Course $course)
    {
        $this->authorizePermission($request, 'course.read');
        // Ensure user can only view their own organization's courses
        if ($course->organization_id !== Auth::id()) {
            abort(403, 'Unauthorized access to this course.');
        }

        $course->load(['topic', 'eventType', 'organization', 'creator']);

        // Get all enrollments for this course
        $enrollments = Enrollment::where('course_id', $course->id)
            ->whereIn('status', ['active', 'completed', 'pending'])
            ->with('user:id,name,email')
            ->orderBy('enrolled_at', 'desc')
            ->get();

        // Get enrollment statistics
        $enrolledCount = $enrollments->count();

        $enrollmentStats = [
            'total_enrolled' => $enrolledCount,
            'max_participants' => $course->max_participants,
            'enrollment_percentage' => $course->max_participants > 0
                ? round(($enrolledCount / $course->max_participants) * 100, 1)
                : 0,
            'available_spots' => max(0, $course->max_participants - $enrolledCount),
        ];

        return Inertia::render('admin/course/Enrollments', [
            'course' => $course,
            'enrollments' => $enrollments,
            'enrollmentStats' => $enrollmentStats,
        ]);
    }

    /**
     * Show the form for editing the specified course.
     */
    public function edit(Request $request, Course $course)
    {
        $this->authorizePermission($request, 'course.edit');
        // Ensure user can only edit their own organization's courses
        if ($course->organization_id !== Auth::id()) {
            abort(403, 'Unauthorized access to this course.');
        }

        $topics = Topic::orderBy('name')->get(['id', 'name']);
        $eventTypes = \App\Models\EventType::where('is_active', true)
            ->orderBy('category')
            ->orderBy('name')
            ->get(['id', 'name', 'category']);

        // Format the course data properly for the form
        $courseData = $course->load(['topic', 'eventType', 'organization', 'creator']);

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
            'eventTypes' => $eventTypes,
        ]);
    }

    /**
     * Update the specified course in storage.
     */
    public function update(Request $request, Course $course)
    {
        $this->authorizePermission($request, 'course.update');
        // Ensure user can only update their own organization's courses
        if ($course->organization_id !== Auth::id()) {
            abort(403, 'Unauthorized access to this course.');
        }

        $type = $request->input('type', $course->type ?? 'course');
        $typeLabel = $type === 'course' ? 'course' : 'event';
        $typeLabelCapital = $type === 'course' ? 'Course' : 'Event';
        
        $validated = $request->validate([
            // Basic Information
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('courses')->ignore($course->id),
            ],
            'description' => 'required|string',
            'type' => ['required', Rule::in(['course', 'event'])],
            'topic_id' => ['required_if:type,course', 'nullable', 'exists:topics,id'],
            'event_type_id' => ['required_if:type,event', 'nullable', 'exists:event_types,id'],
            'meeting_link' => 'nullable|url|max:500', // Added meeting_link validation

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
        ], [
            // Custom error messages
            'name.required' => "The {$typeLabelCapital} name is required.",
            'name.unique' => "A {$typeLabel} with this name already exists.",
            'name.max' => "The {$typeLabelCapital} name may not be greater than 255 characters.",
            'description.required' => "The {$typeLabelCapital} description is required.",
            'type.required' => 'Please select a type (Course or Event).',
            'type.in' => 'Type must be either Course or Event.',
            'topic_id.required_if' => 'Please select a course topic.',
            'topic_id.exists' => 'The selected topic is invalid.',
            'event_type_id.required_if' => 'Please select an event type.',
            'event_type_id.exists' => 'The selected event type is invalid.',
            'meeting_link.url' => 'The meeting link must be a valid URL.',
            'meeting_link.max' => 'The meeting link may not be greater than 500 characters.',
            'pricing_type.required' => 'Please select a pricing type.',
            'pricing_type.in' => 'Pricing type must be either Free or Paid.',
            'course_fee.required_if' => $type === 'course' ? 'Course fee is required when pricing type is Paid.' : 'Event fee is required when pricing type is Paid.',
            'course_fee.numeric' => $type === 'course' ? 'Course fee must be a number.' : 'Event fee must be a number.',
            'course_fee.min' => $type === 'course' ? 'Course fee must be at least 0.' : 'Event fee must be at least 0.',
            'start_date.required' => 'Start date is required.',
            'start_date.date' => 'Start date must be a valid date.',
            'start_time.required' => 'Start time is required.',
            'start_time.date_format' => 'Start time must be in HH:MM format.',
            'end_date.date' => 'End date must be a valid date.',
            'end_date.after_or_equal' => 'End date must be on or after the start date.',
            'duration.required' => 'Duration is required.',
            'duration.in' => 'Please select a valid duration.',
            'format.required' => 'Format is required.',
            'format.in' => 'Format must be Online, In-Person, or Hybrid.',
            'max_participants.required' => 'Maximum participants is required.',
            'max_participants.integer' => 'Maximum participants must be a number.',
            'max_participants.min' => 'Maximum participants must be at least 1.',
            'max_participants.max' => 'Maximum participants may not be greater than 100.',
            'language.required' => 'Language is required.',
            'language.in' => 'Please select a valid language.',
            'target_audience.required' => 'Target audience is required.',
            'target_audience.max' => 'Target audience may not be greater than 255 characters.',
            'learning_outcomes.required' => $type === 'course' ? 'Learning outcomes are required.' : 'Event outcomes are required.',
            'learning_outcomes.array' => $type === 'course' ? 'Learning outcomes must be an array.' : 'Event outcomes must be an array.',
            'learning_outcomes.min' => $type === 'course' ? 'At least one learning outcome is required.' : 'At least one event outcome is required.',
            'learning_outcomes.*.max' => $type === 'course' ? 'Each learning outcome may not be greater than 255 characters.' : 'Each event outcome may not be greater than 255 characters.',
            'prerequisites.*.max' => 'Each prerequisite may not be greater than 255 characters.',
            'materials_needed.*.max' => 'Each material needed may not be greater than 255 characters.',
            'accessibility_features.*.max' => 'Each accessibility feature may not be greater than 255 characters.',
            'image.image' => 'The image must be an image file.',
            'image.mimes' => 'The image must be a file of type: jpeg, png, jpg, gif, svg.',
            'image.max' => 'The image may not be greater than 2MB.',
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

            $course->update([
                'type' => $validated['type'],
                'topic_id' => !empty($validated['topic_id']) ? $validated['topic_id'] : null,
                'event_type_id' => !empty($validated['event_type_id']) ? $validated['event_type_id'] : null,
                'name' => $validated['name'],
                'slug' => $slug,
                'description' => $validated['description'],
                'meeting_link' => $validated['meeting_link'], // Added meeting_link field

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
    public function destroy(Request $request, Course $course)
    {
        $this->authorizePermission($request, 'course.delete');
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
