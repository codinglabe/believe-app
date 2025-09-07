<?php

namespace App\Http\Controllers;

use App\Http\Requests\EventRequest;
use App\Models\Event;
use App\Models\EventType;
use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class EventController extends BaseController
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        // Check if user has permission to read events
        $this->authorizePermission($request, 'event.read');
        
        $user = Auth::user();
        $events = [];
        $eventTypes = EventType::where('is_active', true)->orderBy('category')->orderBy('name')->get();

        if ($this->isAdmin($request)) {
            // Admin can see all events
            $events = Event::with(['organization', 'user', 'eventType'])->latest()->paginate(12);
        } elseif ($this->isOrganization($request)) {
            // Organization can only see their own events
            $organization = Organization::where('user_id', $user->id)->first();
            if ($organization) {
                $events = Event::where('organization_id', $organization->id)->with(['organization', 'user', 'eventType'])->latest()->paginate(12);
            }
        } else {
            // Regular users can see their own events and public events
            $events = Event::where(function($query) use ($user) {
                $query->where('user_id', $user->id)
                      ->orWhere('visibility', 'public');
            })->with(['organization', 'user', 'eventType'])->latest()->paginate(12);
        }

        return Inertia::render('events/index', [
            'events' => $events,
            'eventTypes' => $eventTypes,
            'userRole' => $user->role,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(Request $request)
    {
        // Check if user has permission to create events
        $this->authorizePermission($request, 'event.create');
        
        $user = Auth::user();
        $eventTypes = EventType::where('is_active', true)->orderBy('category')->orderBy('name')->get();

        return Inertia::render('events/create', [
            'eventTypes' => $eventTypes,
            'userRole' => $user->role,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(EventRequest $request)
    {
        $user = Auth::user();
        
        // Allow both organizations and regular users to create events
        if (!in_array($user->role, ['organization', 'user'])) {
            abort(403, 'Only organizations and users can create events.');
        }

        $data = $request->validated();

        // Handle organization_id and user_id based on user role
        if ($user->role === 'organization') {
            $organization = Organization::where('user_id', $user->id)->first();
            if (!$organization) {
                abort(404, 'Organization not found.');
            }
            $data['organization_id'] = $organization->id;
            $data['user_id'] = null;
        } else {
            // For regular users, set user_id and null organization_id
            $data['organization_id'] = null;
            $data['user_id'] = $user->id;
        }

        // Handle poster image upload
        if ($request->hasFile('poster_image')) {
            $path = $request->file('poster_image')->store('events/posters', 'public');
            $data['poster_image'] = $path;
        }

        Event::create($data);

        return redirect()->route('events.index')->with('success', 'Event created successfully!');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $event = Event::with(['organization', 'eventType'])->findOrFail($id);
        
        return Inertia::render('events/show', [
            'event' => $event,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        $user = Auth::user();
        $event = Event::findOrFail($id);

        // Check if user can edit this event
        if ($user->role === 'organization') {
            $organization = Organization::where('user_id', $user->id)->first();
            if (!$organization || $event->organization_id !== $organization->id) {
                abort(403, 'You can only edit your own events.');
            }
        } elseif ($user->role !== 'admin') {
            abort(403, 'Unauthorized.');
        }

        $eventTypes = EventType::where('is_active', true)->orderBy('category')->orderBy('name')->get();

        return Inertia::render('events/edit', [
            'event' => $event,
            'eventTypes' => $eventTypes,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(EventRequest $request, string $id)
    {

        // dd($request->all());
        $user = Auth::user();
        $event = Event::findOrFail($id);

        // Check if user can update this event
        if ($user->role === 'organization') {
            $organization = Organization::where('user_id', $user->id)->first();
            if (!$organization || $event->organization_id !== $organization->id) {
                abort(403, 'You can only update your own events.');
            }
        } elseif ($user->role !== 'admin') {
            abort(403, 'Unauthorized.');
        }

        $data = $request->validated();

        // Handle poster image upload
        if ($request->hasFile('poster_image')) {
            // Delete old image if exists
            if ($event->poster_image) {
                Storage::disk('public')->delete($event->poster_image);
            }
            
            $path = $request->file('poster_image')->store('events/posters', 'public');
            $data['poster_image'] = $path;
        }

        $event->update($data);

        return redirect()->route('events.index')->with('success', 'Event updated successfully!');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $user = Auth::user();
        $event = Event::findOrFail($id);

        // Check if user can delete this event
        if ($user->role === 'organization') {
            $organization = Organization::where('user_id', $user->id)->first();
            if (!$organization || $event->organization_id !== $organization->id) {
                abort(403, 'You can only delete your own events.');
            }
        } elseif ($user->role !== 'admin') {
            abort(403, 'Unauthorized.');
        }

        // Delete poster image if exists
        if ($event->poster_image) {
            Storage::disk('public')->delete($event->poster_image);
        }

        $event->delete();

        return redirect()->route('events.index')->with('success', 'Event deleted successfully!');
    }

    /**
     * Get events for dashboard
     */
    public function dashboard()
    {
        $user = Auth::user();
        $events = [];

        if ($user->role === 'admin') {
            $events = Event::with('organization')
                ->where('status', 'upcoming')
                ->latest()
                ->take(6)
                ->get();
        } else {
            $organization = Organization::where('user_id', $user->id)->first();
            if ($organization) {
                $events = Event::where('organization_id', $organization->id)
                    ->where('status', 'upcoming')
                    ->latest()
                    ->take(6)
                    ->get();
            }
        }

        return response()->json($events);
    }

    /**
     * Update event status
     */
    public function updateStatus(Request $request, string $id)
    {
        $user = Auth::user();
        $event = Event::findOrFail($id);

        // Check if user can update this event
        if ($user->role === 'organization') {
            $organization = Organization::where('user_id', $user->id)->first();
            if (!$organization || $event->organization_id !== $organization->id) {
                abort(403, 'You can only update your own events.');
            }
        } elseif ($user->role !== 'admin') {
            abort(403, 'Unauthorized.');
        }

        $request->validate([
            'status' => 'required|in:upcoming,ongoing,completed,cancelled'
        ]);

        $event->update(['status' => $request->status]);

        return response()->json(['message' => 'Event status updated successfully!']);
    }




    
    public function alleventsPage(Request $request): Response
    {
        $search = $request->input('search');
        $status = $request->input('status');
        $eventTypeId = $request->input('event_type_id');
        $organizationId = $request->input('organization_id');
        $locationFilter = $request->input('location_filter');
        
        $user = Auth::user();
        $eventTypes = EventType::where('is_active', true)->orderBy('category')->orderBy('name')->get();
        $organizations = Organization::orderBy('name')->get();

        // Get unique locations for the dropdown (combining location, city, state, zip)
        $locations = Event::query()
            ->selectRaw('DISTINCT CONCAT_WS(", ", 
                NULLIF(location, ""), 
                NULLIF(city, ""), 
                NULLIF(state, ""), 
                NULLIF(zip, "")
            ) as full_location')
            ->whereNotNull('location')
            ->where('location', '!=', '')
            ->orderBy('full_location')
            ->pluck('full_location')
            ->filter()
            ->unique()
            ->values();

        $events = Event::query()
            ->with(['organization', 'eventType'])
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', '%' . $search . '%')
                      ->orWhere('location', 'like', '%' . $search . '%')
                      ->orWhere('city', 'like', '%' . $search . '%')
                      ->orWhere('state', 'like', '%' . $search . '%');
                });
            })->when($status && $status !== 'all', function ($query, $status) {
                $query->where('status', $status);
            })->when($eventTypeId && $eventTypeId !== 'all', function ($query) use ($eventTypeId) {
                $query->where('event_type_id', $eventTypeId);
            })->when($organizationId && $organizationId !== 'all', function ($query) use ($organizationId) {
                $query->where('organization_id', $organizationId);
            })->when($locationFilter && $locationFilter !== 'all', function ($query) use ($locationFilter) {
                $query->whereRaw('CONCAT_WS(", ", 
                    NULLIF(location, ""), 
                    NULLIF(city, ""), 
                    NULLIF(state, ""), 
                    NULLIF(zip, "")
                ) = ?', [$locationFilter]);
            });

        // Only show public events to non-authenticated users or non-admin users
        if (!$user || $user->role !== 'admin') {
            $events->where('visibility', 'public');
        }

        $events = $events->get();

        return Inertia::render('frontend/events', [
            'events' => $events,
            'eventTypes' => $eventTypes,
            'organizations' => $organizations,
            'locations' => $locations,
            'search' => $search,
            'status' => $status,
            'eventTypeId' => $eventTypeId,
            'organizationId' => $organizationId,
            'locationFilter' => $locationFilter,
        ]);

    }

    public function viewEvent(string $id): Response
    {
        $event = Event::with('organization')->findOrFail($id);
        $user = Auth::user();

        // Check if user can view this event
        if ($event->visibility === 'private') {
            if (!$user) {
                abort(403, 'This event is private and requires authentication.');
            }
            
            if ($user->role === 'organization') {
                $organization = Organization::where('user_id', $user->id)->first();
                if (!$organization || $event->organization_id !== $organization->id) {
                    abort(403, 'You can only view your own private events.');
                }
            } elseif ($user->role !== 'admin') {
                abort(403, 'You do not have permission to view this private event.');
            }
        }

        return Inertia::render('frontend/view-event', [
            'event' => $event,
        ]);
    }

    /**
     * Frontend User Event Methods
     */

    /**
     * Display user's events
     */
    public function userEvents(Request $request)
    {
        $user = Auth::user();
        $eventTypes = EventType::where('is_active', true)->orderBy('category')->orderBy('name')->get();

        // Get search query and status filter from request
        $searchQuery = $request->get('search', '');
        $statusFilter = $request->get('status', 'all');

        // Build the base query
        $query = Event::with(['organization', 'user', 'eventType'])
            ->where(function($query) use ($user) {
                $query->where('user_id', $user->id);
                
                // If user is organization, also include organization events
                if ($user->role === 'organization') {
                    $organization = Organization::where('user_id', $user->id)->first();
                    if ($organization) {
                        $query->orWhere('organization_id', $organization->id);
                    }
                }
            });

        // Apply search filter
        if ($searchQuery) {
            $query->where(function($q) use ($searchQuery) {
                $q->where('name', 'like', '%' . $searchQuery . '%')
                  ->orWhere('description', 'like', '%' . $searchQuery . '%')
                  ->orWhere('location', 'like', '%' . $searchQuery . '%');
            });
        }

        // Apply status filter
        if ($statusFilter && $statusFilter !== 'all') {
            $query->where('status', $statusFilter);
        }

        // Get paginated results with 9 events per page
        $events = $query->latest()->paginate(9);

        // Add search and filter parameters to pagination links
        $events->appends([
            'search' => $searchQuery,
            'status' => $statusFilter
        ]);

        return Inertia::render('frontend/user-profile/events/index', [
            'events' => $events,
            'eventTypes' => $eventTypes,
            'filters' => [
                'search' => $searchQuery,
                'status' => $statusFilter
            ]
        ]);
    }

    /**
     * Show the form for creating a new user event
     */
    public function userCreate()
    {
        $user = Auth::user();
        
        // Allow both organizations and regular users to create events
        if (!in_array($user->role, ['organization', 'user'])) {
            abort(403, 'Only organizations and users can create events.');
        }

        $eventTypes = EventType::where('is_active', true)->orderBy('category')->orderBy('name')->get();

        return Inertia::render('frontend/user-profile/events/create', [
            'eventTypes' => $eventTypes,
        ]);
    }

    /**
     * Store a newly created user event
     */
    public function userStore(EventRequest $request)
    {
        $user = Auth::user();
        
        // Allow both organizations and regular users to create events
        if (!in_array($user->role, ['organization', 'user'])) {
            abort(403, 'Only organizations and users can create events.');
        }

        $data = $request->validated();

        // Handle organization_id and user_id based on user role
        if ($user->role === 'organization') {
            $organization = Organization::where('user_id', $user->id)->first();
            if (!$organization) {
                abort(404, 'Organization not found.');
            }
            $data['organization_id'] = $organization->id;
            $data['user_id'] = null;
        } else {
            // For regular users, set user_id and null organization_id
            $data['organization_id'] = null;
            $data['user_id'] = $user->id;
        }

        // Handle poster image upload
        if ($request->hasFile('poster_image')) {
            $path = $request->file('poster_image')->store('events/posters', 'public');
            $data['poster_image'] = $path;
        }

        Event::create($data);

        return redirect()->route('profile.events.index')->with('success', 'Event created successfully!');
    }

    /**
     * Display the specified user event
     */
    public function userShow(string $id)
    {
        $user = Auth::user();
        $event = Event::with(['organization', 'user', 'eventType'])->findOrFail($id);

        // Check if user can view this event
        if ($user->role === 'organization') {
            $organization = Organization::where('user_id', $user->id)->first();
            if (!$organization || ($event->organization_id !== $organization->id && $event->user_id !== $user->id)) {
                abort(403, 'You can only view your own events.');
            }
        } elseif ($event->user_id !== $user->id) {
            abort(403, 'You can only view your own events.');
        }

        return Inertia::render('frontend/user-profile/events/show', [
            'event' => $event,
        ]);
    }

    /**
     * Show the form for editing the specified user event
     */
    public function userEdit(string $id)
    {
        $user = Auth::user();
        $event = Event::findOrFail($id);

        // Check if user can edit this event
        if ($user->role === 'organization') {
            $organization = Organization::where('user_id', $user->id)->first();
            if (!$organization || ($event->organization_id !== $organization->id && $event->user_id !== $user->id)) {
                abort(403, 'You can only edit your own events.');
            }
        } elseif ($event->user_id !== $user->id) {
            abort(403, 'You can only edit your own events.');
        }

        $eventTypes = EventType::where('is_active', true)->orderBy('category')->orderBy('name')->get();

        return Inertia::render('frontend/user-profile/events/edit', [
            'event' => $event,
            'eventTypes' => $eventTypes,
        ]);
    }

    /**
     * Update the specified user event
     */
    public function userUpdate(EventRequest $request, string $id)
    {
        $user = Auth::user();
        $event = Event::findOrFail($id);

        // Check if user can update this event
        if ($user->role === 'organization') {
            $organization = Organization::where('user_id', $user->id)->first();
            if (!$organization || ($event->organization_id !== $organization->id && $event->user_id !== $user->id)) {
                abort(403, 'You can only update your own events.');
            }
        } elseif ($event->user_id !== $user->id) {
            abort(403, 'You can only update your own events.');
        }

        $data = $request->validated();

        // Handle poster image upload
        if ($request->hasFile('poster_image')) {
            // Delete old image if exists
            if ($event->poster_image) {
                Storage::disk('public')->delete($event->poster_image);
            }
            
            $path = $request->file('poster_image')->store('events/posters', 'public');
            $data['poster_image'] = $path;
        }

        $event->update($data);

        return redirect()->route('profile.events.index')->with('success', 'Event updated successfully!');
    }

    /**
     * Remove the specified user event
     */
    public function userDestroy(string $id)
    {
        $user = Auth::user();
        $event = Event::findOrFail($id);

        // Check if user can delete this event
        if ($user->role === 'organization') {
            $organization = Organization::where('user_id', $user->id)->first();
            if (!$organization || ($event->organization_id !== $organization->id && $event->user_id !== $user->id)) {
                abort(403, 'You can only delete your own events.');
            }
        } elseif ($event->user_id !== $user->id) {
            abort(403, 'You can only delete your own events.');
        }

        // Delete poster image if exists
        if ($event->poster_image) {
            Storage::disk('public')->delete($event->poster_image);
        }

        $event->delete();

        return redirect()->route('profile.events.index')->with('success', 'Event deleted successfully!');
    }
}
