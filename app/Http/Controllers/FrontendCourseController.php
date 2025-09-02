<?php

namespace App\Http\Controllers;

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

class FrontendCourseController extends Controller
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

        return Inertia::render('frontend/user/course/Index', [
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

        return Inertia::render('frontend/user/course/Create', [
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
                'topic_id' => $validated['topic_id'],
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

            return redirect()->route('profile.course.index')->with('success', 'Community course created successfully!');

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

        return Inertia::render('frontend/user/course/Show', [
            'course' => $course,
            'userEnrollment' => $userEnrollment,
            'enrollmentStats' => $enrollmentStats,
            'status' => $status,
            'canEnroll' => !$userEnrollment && $status !== 'full' && $status !== 'started',
            'meetingLink' => $course->meeting_link, // Added meeting_link field
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

        $course->load(['topic', 'organization', 'creator']);

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

        return Inertia::render('frontend/user/course/Show', [
            'course' => $course,
            'enrollmentStats' => $enrollmentStats,
            'status' => $status,
            'recentEnrollments' => $recentEnrollments,
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

        return Inertia::render('frontend/user/course/Edit', [
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
                'topic_id' => $validated['topic_id'],
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

            return redirect()->route('profile.course.index')->with('success', 'Community course updated successfully!');

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

            $course->delete();

            DB::commit();

            return redirect()->route('profile.course.index')->with('success', 'Course deleted successfully!');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error deleting course: " . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to delete course. An unexpected error occurred.');
        }
    }
}
 