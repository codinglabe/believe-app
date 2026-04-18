<?php

namespace App\Http\Controllers;

use App\Jobs\SendCourseNotification;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Organization;
use App\Models\Topic;
use App\Services\CourseTaxClassificationService;
use App\Support\ConnectionHubType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class FrontendCourseController extends BaseController
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
                    $q->where('name', 'like', '%'.$search.'%')
                        ->orWhere('target_audience', 'like', '%'.$search.'%')
                        ->orWhere('description', 'like', '%'.$search.'%');
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
            'courses_event_type',
            'courses_hub_type',
        ]);

        $query = Course::query()
            ->with(['topic', 'eventType', 'organization', 'creator'])
            // Only show courses for the current user's organization
            ->where('organization_id', Auth::id());

        // Search functionality
        if (! empty($filters['courses_search'])) {
            $search = $filters['courses_search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%'.$search.'%')
                    ->orWhere('description', 'like', '%'.$search.'%')
                    ->orWhere('target_audience', 'like', '%'.$search.'%')
                    ->orWhere('community_impact', 'like', '%'.$search.'%')
                    ->orWhereHas('organization', function ($orgQuery) use ($search) {
                        $orgQuery->where('name', 'like', '%'.$search.'%');
                    });
            });
        }

        // Topic (event type catalog) filter — same as admin Connection Hub
        if (! empty($filters['courses_event_type'])) {
            $query->where('event_type_id', $filters['courses_event_type']);
        }

        // Connection Hub type (companion, learning, events, earning)
        if (! empty($filters['courses_hub_type']) && in_array($filters['courses_hub_type'], ConnectionHubType::VALUES, true)) {
            $query->where('type', $filters['courses_hub_type']);
        }

        // Pricing type filter
        if (! empty($filters['courses_type'])) {
            $query->where('pricing_type', $filters['courses_type']);
        }

        // Format filter
        if (! empty($filters['courses_format'])) {
            $query->where('format', $filters['courses_format']);
        }

        // Status filter (based on enrollment and start date)
        if (! empty($filters['courses_status'])) {
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

        $eventTypes = \App\Models\EventType::where('is_active', true)
            ->orderBy('category')
            ->orderBy('name')
            ->get(['id', 'name', 'category']);

        // Calculate statistics for the current user's organization
        $statistics = $this->calculateCourseStatistics(Auth::id());

        return Inertia::render('frontend/user/course/Index', [
            'courses' => $courses,
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
    public function create(Request $request)
    {
        $eventTypes = \App\Models\EventType::where('is_active', true)
            ->orderBy('category')
            ->orderBy('name')
            ->get(['id', 'name', 'category']);

        $seller = Organization::biuSellerDisplayForUser($request->user());

        return Inertia::render('frontend/user/course/Create', array_merge([
            'eventTypes' => $eventTypes,
            'organizationName' => $seller['name'],
            'sellerNameLabel' => $seller['label'],
        ], $this->connectionHubProfilePrimaryCategoriesPageProps($request)));
    }

    /**
     * Store a newly created course in storage.
     */
    public function store(Request $request)
    {
        $type = $request->input('type', ConnectionHubType::COMPANION);
        $typeLabelCapital = ConnectionHubType::label($type);
        $typeLabel = strtolower($typeLabelCapital);
        $outcomesNoun = ConnectionHubType::usesEventSemantics($type) ? 'event' : 'learning';

        $validated = $request->validate(array_merge([
            'name' => 'required|string|max:255|unique:courses,name',
            'description' => 'required|string',
            'type' => ['required', Rule::in(ConnectionHubType::VALUES)],
            'topic_id' => ['nullable', 'exists:topics,id'],
            'event_type_id' => [
                'required',
                'exists:event_types,id',
            ],
            'meeting_link' => 'nullable|url|max:500',

            'pricing_type' => ['required', Rule::in(['free', 'paid'])],
            'course_fee' => 'nullable|numeric|min:0|required_if:pricing_type,paid',

            'start_date' => 'required|date|after_or_equal:today',
            'start_time' => 'required|date_format:H:i',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'duration' => ['required', Rule::in(['1_session', '1_week', '2_weeks', '1_month', '6_weeks', '3_months'])],
            'format' => ['required', Rule::in(['online', 'in_person', 'hybrid'])],

            'max_participants' => 'required|integer|min:1|max:100',
            'language' => ['required', Rule::in(['English', 'Spanish', 'French', 'Other'])],

            'target_audience' => 'required|string|max:255',
            'community_impact' => 'nullable|string',

            'learning_outcomes' => ['nullable', 'array'],
            'learning_outcomes.*' => 'string|max:255',
            'prerequisites' => 'nullable|array',
            'prerequisites.*' => 'string|max:255',
            'materials_needed' => 'nullable|array',
            'materials_needed.*' => 'string|max:255',
            'accessibility_features' => 'nullable|array',
            'accessibility_features.*' => 'string|max:255',

            'certificate_provided' => 'boolean',
            'volunteer_opportunities' => 'boolean',

            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
        ], CourseTaxClassificationService::validationRules(), $this->connectionHubProfilePrimaryActionCategoryValidation($request)), [
            'name.required' => "The {$typeLabelCapital} name is required.",
            'name.unique' => "A {$typeLabel} with this name already exists.",
            'name.max' => "The {$typeLabelCapital} name may not be greater than 255 characters.",
            'description.required' => "The {$typeLabelCapital} description is required.",
            'type.required' => 'Please select a Connection Hub type.',
            'type.in' => 'Type must be Companion, Learning, Events, or Earning.',
            'topic_id.exists' => 'The selected topic is invalid.',
            'event_type_id.required' => 'Please select a topic.',
            'event_type_id.exists' => 'The selected topic is invalid.',
            'meeting_link.url' => 'The meeting link must be a valid URL.',
            'meeting_link.max' => 'The meeting link may not be greater than 500 characters.',
            'pricing_type.required' => 'Please select a pricing type.',
            'pricing_type.in' => 'Pricing type must be either Free or Paid.',
            'course_fee.required_if' => 'A fee is required when pricing type is Paid.',
            'course_fee.numeric' => 'The fee must be a number.',
            'course_fee.min' => 'The fee must be at least 0.',
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
            'learning_outcomes.required' => $outcomesNoun === 'learning' ? 'Learning outcomes are required.' : 'Event outcomes are required.',
            'learning_outcomes.array' => $outcomesNoun === 'learning' ? 'Learning outcomes must be an array.' : 'Event outcomes must be an array.',
            'learning_outcomes.min' => $outcomesNoun === 'learning' ? 'At least one learning outcome is required.' : 'At least one event outcome is required.',
            'learning_outcomes.*.max' => $outcomesNoun === 'learning' ? 'Each learning outcome may not be greater than 255 characters.' : 'Each event outcome may not be greater than 255 characters.',
            'prerequisites.*.max' => 'Each prerequisite may not be greater than 255 characters.',
            'materials_needed.*.max' => 'Each material needed may not be greater than 255 characters.',
            'accessibility_features.*.max' => 'Each accessibility feature may not be greater than 255 characters.',
            'image.image' => 'The image must be an image file.',
            'image.mimes' => 'The image must be a file of type: jpeg, png, jpg, gif, svg.',
            'image.max' => 'The image must be an image file no greater than 2MB.',
        ]);

        CourseTaxClassificationService::validateFeeBreakdown($request);

        $imagePath = null;
        if ($request->hasFile('image')) {
            try {
                $imagePath = $request->file('image')->store('course_images', 'public');
                Log::info('Course image uploaded (Frontend)', [
                    'path' => $imagePath,
                    'exists' => Storage::disk('public')->exists($imagePath),
                ]);
            } catch (\Exception $e) {
                Log::error('Failed to upload course image (Frontend): '.$e->getMessage());

                return redirect()->back()
                    ->withInput()
                    ->withErrors(['image' => 'Failed to upload image. Please try again.']);
            }
        }

        $slug = Str::slug($validated['name']);
        $originalSlug = $slug;
        $counter = 1;

        while (Course::where('slug', $slug)->exists()) {
            $slug = $originalSlug.'-'.$counter;
            $counter++;
        }

        try {
            DB::beginTransaction();

            $course = Course::create(array_merge([
                'organization_id' => Auth::id(),
                'user_id' => Auth::id(),

                'type' => $validated['type'],
                'topic_id' => null,
                'event_type_id' => $validated['event_type_id'] ?? null,
                'name' => $validated['name'],
                'slug' => $slug,
                'description' => $validated['description'],
                'meeting_link' => $validated['meeting_link'],

                'pricing_type' => $validated['pricing_type'],
                'course_fee' => $validated['pricing_type'] === 'paid' ? $validated['course_fee'] : null,

                'start_date' => $validated['start_date'],
                'start_time' => $validated['start_time'],
                'end_date' => $validated['end_date'] ?? null,
                'duration' => $validated['duration'],
                'format' => $validated['format'],

                'max_participants' => $validated['max_participants'],
                'language' => $validated['language'],

                'target_audience' => $validated['target_audience'],
                'community_impact' => $validated['community_impact'],

                'learning_outcomes' => $validated['learning_outcomes'] ?? [],
                'prerequisites' => $validated['prerequisites'] ?? [],
                'materials_needed' => $validated['materials_needed'] ?? [],
                'accessibility_features' => $validated['accessibility_features'] ?? [],

                'certificate_provided' => $validated['certificate_provided'] ?? false,
                'volunteer_opportunities' => $validated['volunteer_opportunities'] ?? false,

                'image' => $imagePath,

                'enrolled' => 0,
                'rating' => 0.0,
                'total_reviews' => 0,
                'last_updated' => now(),
            ], CourseTaxClassificationService::persistenceFromRequest($request)));

            $this->syncConnectionHubListingPrimaryActionCategories($request, $course);

            DB::commit();

            SendCourseNotification::dispatch($course);

            return redirect()->route('profile.course.index')->with('success', 'Connection Hub listing created successfully!');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to create course: '.$e->getMessage());

            return redirect()->back()
                ->withInput()
                ->withErrors(['error' => 'Failed to create listing. Please try again.']);
        }
    }

    /**
     * Display the specified course.
     */
    public function publicShow(Course $course)
    {
        $course->load(['topic', 'organization.organization', 'creator']);

        $course->organization_name = optional($course->organization?->organization)->name
            ?? Organization::where('user_id', $course->organization_id)->value('name');

        // Only treat active / pending / completed as “enrolled” so cancelled users can enroll again
        $userEnrollment = null;
        if (Auth::check()) {
            $userEnrollment = Enrollment::where('user_id', Auth::id())
                ->where('course_id', $course->id)
                ->whereIn('status', ['active', 'completed', 'pending'])
                ->orderByDesc('id')
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
            'canEnroll' => $userEnrollment === null && $status !== 'full' && $status !== 'started',
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

        $course->load(['topic', 'eventType', 'organization', 'creator']);

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
    public function edit(Request $request, Course $course)
    {
        // Ensure user can only edit their own organization's courses
        if ($course->organization_id !== Auth::id()) {
            abort(403, 'Unauthorized access to this course.');
        }

        $eventTypes = \App\Models\EventType::where('is_active', true)
            ->orderBy('category')
            ->orderBy('name')
            ->get(['id', 'name', 'category']);

        $courseData = $course->load(['topic', 'eventType', 'organization', 'creator', 'primaryActionCategories']);

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

        $courseData->primary_action_category_ids = $course->primaryActionCategories->pluck('id')->map(fn ($id) => (int) $id)->values()->all();

        $seller = Organization::biuSellerDisplayForUser($request->user());

        return Inertia::render('frontend/user/course/Edit', array_merge([
            'course' => $courseData,
            'eventTypes' => $eventTypes,
            'organizationName' => $seller['name'],
            'sellerNameLabel' => $seller['label'],
        ], $this->connectionHubProfilePrimaryCategoriesPageProps($request)));
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

        $type = $request->input('type', $course->type ?? ConnectionHubType::COMPANION);
        $typeLabelCapital = ConnectionHubType::label($type);
        $typeLabel = strtolower($typeLabelCapital);
        $outcomesNoun = ConnectionHubType::usesEventSemantics($type) ? 'event' : 'learning';

        $validated = $request->validate(array_merge([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('courses')->ignore($course->id),
            ],
            'description' => 'required|string',
            'type' => ['required', Rule::in(ConnectionHubType::VALUES)],
            'topic_id' => ['nullable', 'exists:topics,id'],
            'event_type_id' => [
                'required',
                'exists:event_types,id',
            ],
            'meeting_link' => 'nullable|url|max:500',

            'pricing_type' => ['required', Rule::in(['free', 'paid'])],
            'course_fee' => 'nullable|numeric|min:0|required_if:pricing_type,paid',

            'start_date' => 'required|date',
            'start_time' => 'required|date_format:H:i',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'duration' => ['required', Rule::in(['1_session', '1_week', '2_weeks', '1_month', '6_weeks', '3_months'])],
            'format' => ['required', Rule::in(['online', 'in_person', 'hybrid'])],

            'max_participants' => 'required|integer|min:1|max:100',
            'language' => ['required', Rule::in(['English', 'Spanish', 'French', 'Other'])],

            'target_audience' => 'required|string|max:255',
            'community_impact' => 'nullable|string',

            'learning_outcomes' => ['nullable', 'array'],
            'learning_outcomes.*' => 'string|max:255',
            'prerequisites' => 'nullable|array',
            'prerequisites.*' => 'string|max:255',
            'materials_needed' => 'nullable|array',
            'materials_needed.*' => 'string|max:255',
            'accessibility_features' => 'nullable|array',
            'accessibility_features.*' => 'string|max:255',

            'certificate_provided' => 'boolean',
            'volunteer_opportunities' => 'boolean',

            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
        ], CourseTaxClassificationService::validationRules(), $this->connectionHubProfilePrimaryActionCategoryValidation($request)), [
            'name.required' => "The {$typeLabelCapital} name is required.",
            'name.unique' => "A {$typeLabel} with this name already exists.",
            'name.max' => "The {$typeLabelCapital} name may not be greater than 255 characters.",
            'description.required' => "The {$typeLabelCapital} description is required.",
            'type.required' => 'Please select a Connection Hub type.',
            'type.in' => 'Type must be Companion, Learning, Events, or Earning.',
            'topic_id.exists' => 'The selected topic is invalid.',
            'event_type_id.required' => 'Please select a topic.',
            'event_type_id.exists' => 'The selected topic is invalid.',
            'meeting_link.url' => 'The meeting link must be a valid URL.',
            'meeting_link.max' => 'The meeting link may not be greater than 500 characters.',
            'pricing_type.required' => 'Please select a pricing type.',
            'pricing_type.in' => 'Pricing type must be either Free or Paid.',
            'course_fee.required_if' => 'A fee is required when pricing type is Paid.',
            'course_fee.numeric' => 'The fee must be a number.',
            'course_fee.min' => 'The fee must be at least 0.',
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
            'learning_outcomes.required' => $outcomesNoun === 'learning' ? 'Learning outcomes are required.' : 'Event outcomes are required.',
            'learning_outcomes.array' => $outcomesNoun === 'learning' ? 'Learning outcomes must be an array.' : 'Event outcomes must be an array.',
            'learning_outcomes.min' => $outcomesNoun === 'learning' ? 'At least one learning outcome is required.' : 'At least one event outcome is required.',
            'learning_outcomes.*.max' => $outcomesNoun === 'learning' ? 'Each learning outcome may not be greater than 255 characters.' : 'Each event outcome may not be greater than 255 characters.',
            'prerequisites.*.max' => 'Each prerequisite may not be greater than 255 characters.',
            'materials_needed.*.max' => 'Each material needed may not be greater than 255 characters.',
            'accessibility_features.*.max' => 'Each accessibility feature may not be greater than 255 characters.',
            'image.image' => 'The image must be an image file.',
            'image.mimes' => 'The image must be a file of type: jpeg, png, jpg, gif, svg.',
            'image.max' => 'The image may not be greater than 2MB.',
        ]);

        CourseTaxClassificationService::validateFeeBreakdown($request);

        $imagePath = $course->image;
        if ($request->hasFile('image')) {
            try {
                if ($course->image && Storage::disk('public')->exists($course->image)) {
                    Storage::disk('public')->delete($course->image);
                }
                $imagePath = $request->file('image')->store('course_images', 'public');
                Log::info('Course image updated (Frontend)', [
                    'course_id' => $course->id,
                    'path' => $imagePath,
                    'exists' => Storage::disk('public')->exists($imagePath),
                ]);
            } catch (\Exception $e) {
                Log::error('Failed to update course image (Frontend): '.$e->getMessage());

                return redirect()->back()
                    ->withInput()
                    ->withErrors(['image' => 'Failed to upload image. Please try again.']);
            }
        }

        $slug = $course->slug;
        if ($course->name !== $validated['name']) {
            $slug = Str::slug($validated['name']);
            $originalSlug = $slug;
            $counter = 1;

            while (Course::where('slug', $slug)->where('id', '!=', $course->id)->exists()) {
                $slug = $originalSlug.'-'.$counter;
                $counter++;
            }
        }

        try {
            DB::beginTransaction();

            $course->update(array_merge([
                'type' => $validated['type'],
                'topic_id' => null,
                'event_type_id' => ! empty($validated['event_type_id']) ? $validated['event_type_id'] : null,
                'name' => $validated['name'],
                'slug' => $slug,
                'description' => $validated['description'],
                'meeting_link' => $validated['meeting_link'],

                'pricing_type' => $validated['pricing_type'],
                'course_fee' => $validated['pricing_type'] === 'paid' ? $validated['course_fee'] : null,

                'start_date' => $validated['start_date'],
                'start_time' => $validated['start_time'],
                'end_date' => $validated['end_date'],
                'duration' => $validated['duration'],
                'format' => $validated['format'],

                'max_participants' => $validated['max_participants'],
                'language' => $validated['language'],

                'target_audience' => $validated['target_audience'],
                'community_impact' => $validated['community_impact'],

                'learning_outcomes' => $validated['learning_outcomes'] ?? [],
                'prerequisites' => $validated['prerequisites'] ?? [],
                'materials_needed' => $validated['materials_needed'] ?? [],
                'accessibility_features' => $validated['accessibility_features'] ?? [],

                'certificate_provided' => $validated['certificate_provided'] ?? false,
                'volunteer_opportunities' => $validated['volunteer_opportunities'] ?? false,

                'image' => $imagePath,

                'last_updated' => now(),
            ], CourseTaxClassificationService::persistenceFromRequest($request)));

            $this->syncConnectionHubListingPrimaryActionCategories($request, $course);

            DB::commit();

            return redirect()->route('profile.course.index')->with('success', 'Connection Hub listing updated successfully!');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update course: '.$e->getMessage());

            return redirect()->back()
                ->withInput()
                ->withErrors(['error' => 'Failed to update listing. Please try again.']);
        }
    }

    /**
     * Org Category Grid when the linked org has selections; otherwise the supporter's
     * profile interests (same primary_action_categories catalog via primary_action_category_user).
     *
     * @return array{organizationPrimaryActionCategories: list<array{id: int, name: string}>, causesCatalogSource: 'organization'|'supporter'}
     */
    private function connectionHubProfilePrimaryCategoriesPageProps(Request $request): array
    {
        $org = Organization::forAuthUser($request->user());
        if ($org !== null && $this->organizationHasPrimaryActionCategorySelections($org)) {
            $rows = $org->primaryActionCategories()
                ->where('primary_action_categories.is_active', true)
                ->orderBy('primary_action_categories.sort_order')
                ->orderBy('primary_action_categories.name')
                ->get(['primary_action_categories.id', 'primary_action_categories.name']);

            return [
                'organizationPrimaryActionCategories' => $rows->values()->all(),
                'causesCatalogSource' => 'organization',
            ];
        }

        $user = $request->user();
        $rows = $user->supporterInterestCategories()
            ->where('primary_action_categories.is_active', true)
            ->orderBy('primary_action_categories.sort_order')
            ->orderBy('primary_action_categories.name')
            ->get(['primary_action_categories.id', 'primary_action_categories.name']);

        return [
            'organizationPrimaryActionCategories' => $rows->values()->all(),
            'causesCatalogSource' => 'supporter',
        ];
    }

    private function organizationHasPrimaryActionCategorySelections(Organization $org): bool
    {
        return $org->primaryActionCategories()
            ->where('primary_action_categories.is_active', true)
            ->exists();
    }

    /**
     * PAC validation: org grid when org has categories; otherwise user's supporter-interest pivot.
     */
    private function connectionHubProfilePrimaryActionCategoryValidation(Request $request): array
    {
        $org = Organization::forAuthUser($request->user());
        if ($org !== null && $this->organizationHasPrimaryActionCategorySelections($org)) {
            return $this->primaryActionCategoryIdsValidation($request);
        }

        $userId = (int) $request->user()->id;

        return [
            'primary_action_category_ids' => ['nullable', 'array'],
            'primary_action_category_ids.*' => [
                'integer',
                Rule::exists('primary_action_categories', 'id')->where('is_active', true),
                Rule::exists('primary_action_category_user', 'primary_action_category_id')->where(
                    fn ($q) => $q->where('user_id', $userId)
                ),
            ],
        ];
    }

    private function syncConnectionHubListingPrimaryActionCategories(Request $request, Course $course): void
    {
        $ids = $request->input('primary_action_category_ids', []);
        if (! is_array($ids)) {
            return;
        }

        $course->primaryActionCategories()->sync(
            array_values(array_unique(array_filter(array_map('intval', $ids))))
        );
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

            return redirect()->route('profile.course.index')->with('success', 'Listing deleted successfully!');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting course: '.$e->getMessage());

            return redirect()->back()->with('error', 'Failed to delete listing. An unexpected error occurred.');
        }
    }
}
