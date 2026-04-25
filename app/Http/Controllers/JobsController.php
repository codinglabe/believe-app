<?php

namespace App\Http\Controllers;

use App\Models\JobApplication;
use App\Models\JobPosition;
use App\Models\JobPost;
use App\Models\Organization;
use App\Models\PositionCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;

class JobsController extends Controller
{
    public function __construct()
    {
        $this->middleware(['auth', 'role:user'])->except(['index', 'volunteerOpportunities', 'getJobPositions', 'show']);
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
            ->when($request->city, function ($query, $city) {
                $query->where('city', 'like', "%{$city}%");
            })
            ->when($request->state, function ($query, $state) {
                $query->where('state', 'like', "%{$state}%");
            })
            ->when($request->position_category_id, function ($query, $categoryId) {
                $query->whereHas('position', function ($q) use ($categoryId) {
                    $q->where('category_id', $categoryId);
                });
            })
            ->when($request->position_id, function ($query, $positionId) {
                $query->where('position_id', $positionId);
            })
            ->when($request->organization_id, function ($query, $organizationId) {
                $query->where('organization_id', $organizationId);
            })
            ->when(auth()->check(), function ($query) {
                $query->withExists([
                    'applications as has_applied' => function ($q) {
                        $q->where('user_id', auth()->id());
                    },
                ]);
            })
            ->orderBy('created_at', 'desc')
            ->paginate(12)
            ->withQueryString();

        $positionCategories = PositionCategory::pluck('name', 'id')->toArray();

        // Load positions if category filter is applied
        $positions = [];
        if ($request->position_category_id) {
            $positions = JobPosition::where('category_id', $request->position_category_id)
                ->pluck('title', 'id')
                ->toArray();
        }

        $organizations = Organization::orderBy('name')
            ->pluck('name', 'id')
            ->toArray();

        return Inertia::render('frontend/jobs/index', [
            'jobs' => $jobs,
            'organizations' => $organizations,
            'positionCategories' => $positionCategories,
            'positions' => $positions,
            'filters' => $request->only([
                'search',
                'location_type',
                'type',
                'city',
                'state',
                'organization_id',
                'position_category_id',
                'position_id',
            ]),
        ]);
    }

    public function volunteerOpportunities(Request $request)
    {
        $positionIdsRaw = $request->input('position_ids');
        $positionIds = [];
        if (is_array($positionIdsRaw)) {
            $positionIds = array_values(array_unique(array_filter(array_map('intval', $positionIdsRaw))));
        } elseif (is_string($positionIdsRaw) && trim($positionIdsRaw) !== '') {
            $positionIds = array_values(array_unique(array_filter(array_map('intval', explode(',', $positionIdsRaw)))));
        }

        $jobs = JobPost::query()
            ->with(['organization', 'position'])
            ->where('type', 'volunteer')
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
            ->when($request->city, function ($query, $city) {
                $query->where('city', 'like', "%{$city}%");
            })
            ->when($request->state, function ($query, $state) {
                $query->where('state', 'like', "%{$state}%");
            })
            ->when($request->position_category_id, function ($query, $categoryId) {
                $query->whereHas('position', function ($q) use ($categoryId) {
                    $q->where('category_id', $categoryId);
                });
            })
            ->when($request->position_id, function ($query, $positionId) {
                $query->where('position_id', $positionId);
            })
            ->when(count($positionIds) > 0, function ($query) use ($positionIds) {
                $query->whereIn('position_id', $positionIds);
            })
            ->when($request->organization_id, function ($query, $organizationId) {
                $query->where('organization_id', $organizationId);
            })
            ->when(auth()->check(), function ($query) {
                $query->withExists([
                    'applications as has_applied' => function ($q) {
                        $q->where('user_id', auth()->id());
                    },
                ]);
            })
            ->orderBy('created_at', 'desc')
            ->paginate(12)
            ->withQueryString();

        $positionCategories = PositionCategory::pluck('name', 'id')->toArray();

        // Load positions if category filter is applied
        $positions = [];
        if ($request->position_category_id) {
            $positions = JobPosition::where('category_id', $request->position_category_id)
                ->pluck('title', 'id')
                ->toArray();
        }

        $labelIds = array_values(array_unique(array_filter(array_merge(
            $positionIds,
            $request->position_id ? [(int) $request->position_id] : [],
        ))));

        $positionLabels = [];
        if (count($labelIds) > 0) {
            $positionLabels = JobPosition::query()
                ->whereIn('id', $labelIds)
                ->get(['id', 'title'])
                ->mapWithKeys(static fn (JobPosition $p) => [(string) $p->id => $p->title])
                ->all();
        }

        // Resolve label for active organization filter (picker loads options via Inertia `organizationPicker`)
        $organizations = [];
        if ($request->filled('organization_id')) {
            $oid = (int) $request->organization_id;
            if ($oid > 0) {
                $n = Organization::query()->where('id', $oid)->value('name');
                if (is_string($n) && $n !== '') {
                    $organizations[$oid] = $n;
                }
            }
        }

        $positionPicker = null;
        if ($request->filled('position_picker_page')) {
            $pp = $request->validate([
                'position_picker_page' => ['required', 'integer', 'min:1'],
                'position_picker_q' => ['nullable', 'string', 'max:100'],
                'position_picker_category_id' => ['nullable', 'exists:position_categories,id'],
                'position_picker_per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            ]);
            $positionPicker = $this->paginateJobPositionsForPicker(
                isset($pp['position_picker_category_id']) ? (int) $pp['position_picker_category_id'] : null,
                trim((string) ($pp['position_picker_q'] ?? '')),
                (int) $pp['position_picker_page'],
                (int) ($pp['position_picker_per_page'] ?? 30),
            );
        }

        $organizationPicker = null;
        if ($request->filled('organization_picker_page')) {
            $op = $request->validate([
                'organization_picker_page' => ['required', 'integer', 'min:1'],
                'organization_picker_q' => ['nullable', 'string', 'max:100'],
                'organization_picker_per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            ]);
            $organizationPicker = $this->paginateVolunteerOrganizationsForPicker(
                trim((string) ($op['organization_picker_q'] ?? '')),
                (int) $op['organization_picker_page'],
                (int) ($op['organization_picker_per_page'] ?? 30),
            );
        }

        return Inertia::render('frontend/jobs/volunteer-opportunities', [
            'jobs' => $jobs,
            'organizations' => $organizations,
            'positionCategories' => $positionCategories,
            'positions' => $positions,
            'positionLabels' => $positionLabels,
            'positionPicker' => $positionPicker,
            'organizationPicker' => $organizationPicker,
            'filters' => $request->only([
                'search',
                'location_type',
                'city',
                'state',
                'organization_id',
                'position_category_id',
                'position_id',
                'position_ids',
            ]),
        ]);
    }

    /**
     * Paginated job positions for volunteer-opportunities picker (also used by getJobPositions JSON).
     *
     * @return array{data: list<array{id: int, title: string}>, current_page: int, last_page: int, per_page: int, total: int, has_more: bool}
     */
    private function paginateJobPositionsForPicker(?int $categoryId, string $search, int $page, int $perPage): array
    {
        $perPage = min(100, max(5, $perPage));
        $page = max(1, $page);
        $search = trim($search);

        $query = JobPosition::query()
            ->when($categoryId !== null, fn ($q) => $q->where('category_id', $categoryId))
            ->when($search !== '', function ($q) use ($search) {
                $escaped = addcslashes($search, '%_\\');
                $q->where('title', 'like', '%'.$escaped.'%');
            })
            ->orderBy('title');

        $paginator = $query->paginate($perPage, ['id', 'title'], 'page', $page);

        $data = collect($paginator->items())
            ->map(fn (JobPosition $p) => ['id' => (int) $p->id, 'title' => (string) $p->title])
            ->values()
            ->all();

        return [
            'data' => $data,
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'has_more' => $paginator->hasMorePages(),
        ];
    }

    /**
     * @return array{data: list<array{id: int, name: string}>, current_page: int, last_page: int, per_page: int, total: int, has_more: bool}
     */
    private function paginateVolunteerOrganizationsForPicker(string $search, int $page, int $perPage): array
    {
        $perPage = min(100, max(5, $perPage));
        $page = max(1, $page);
        $search = trim($search);

        $query = Organization::query()
            ->whereHas('jobPosts', function ($q) {
                $q->where('type', 'volunteer')
                    ->whereIn('status', ['open', 'filled', 'closed']);
            })
            ->when($search !== '', function ($q) use ($search) {
                $escaped = addcslashes($search, '%_\\');
                $q->where('name', 'like', '%'.$escaped.'%');
            })
            ->orderBy('name');

        $paginator = $query->paginate($perPage, ['id', 'name'], 'page', $page);

        $data = collect($paginator->items())
            ->map(fn (Organization $o) => ['id' => (int) $o->id, 'name' => (string) $o->name])
            ->values()
            ->all();

        return [
            'data' => $data,
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'has_more' => $paginator->hasMorePages(),
        ];
    }

    public function saveVolunteerInterestStatement(Request $request)
    {
        $validated = $request->validate([
            'volunteer_interest_statement' => ['nullable', 'string', 'max:2000'],
        ]);

        $request->user()->update([
            'volunteer_interest_statement' => $validated['volunteer_interest_statement'] !== ''
                ? $validated['volunteer_interest_statement']
                : null,
        ]);

        return back();
    }

    public function getJobPositions(Request $request)
    {
        $validated = $request->validate([
            'category_id' => ['nullable', 'exists:position_categories,id'],
            'q' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $perPage = (int) ($validated['per_page'] ?? 30);
        $page = (int) ($validated['page'] ?? 1);
        $search = trim((string) ($validated['q'] ?? ''));
        $categoryId = isset($validated['category_id']) ? (int) $validated['category_id'] : null;

        $payload = $this->paginateJobPositionsForPicker($categoryId, $search, $page, $perPage);

        return response()->json($payload);
    }

    public function show($id)
    {
        $job = JobPost::with(['organization', 'organization.user', 'position', 'position.category'])
            ->when(auth()->check(), function ($query) {
                $query->withExists([
                    'applications as has_applied' => function ($q) {
                        $q->where('user_id', auth()->id());
                    },
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
