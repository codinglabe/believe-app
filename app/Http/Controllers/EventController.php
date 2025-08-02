<?php

namespace App\Http\Controllers;

use App\Http\Requests\EventRequest;
use App\Models\Event;
use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class EventController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $user = Auth::user();
        $events = [];

        if ($user->role === 'admin') {
            // Admin can see all events
            $events = Event::with('organization')->latest()->paginate(12);
        } else {
            // Organization can only see their own events
            $organization = Organization::where('user_id', $user->id)->first();
            if ($organization) {
                $events = Event::where('organization_id', $organization->id)->latest()->paginate(12);
            }
        }

        return Inertia::render('events/index', [
            'events' => $events,
            'userRole' => $user->role,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $user = Auth::user();
        
        if ($user->role !== 'organization') {
            abort(403, 'Only organizations can create events.');
        }

        return Inertia::render('events/create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(EventRequest $request)
    {
        $user = Auth::user();
        
        if ($user->role !== 'organization') {
            abort(403, 'Only organizations can create events.');
        }

        $organization = Organization::where('user_id', $user->id)->first();
        if (!$organization) {
            abort(404, 'Organization not found.');
        }

        $data = $request->validated();
        $data['organization_id'] = $organization->id;

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
        $event = Event::with('organization')->findOrFail($id);
        
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

        return Inertia::render('events/edit', [
            'event' => $event,
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

        $events = Event::query()
            ->when($search, function ($query, $search) {
                $query->where('name', 'like', '%' . $search . '%');
            })->when($status, function ($query, $status) {
                $query->where('status', $status);
            })->get();

        return Inertia::render('frontend/events', [
            'events'           => $events,
            'search'             => $search,
        ]);

    }

    public function viewEvent(string $id): Response
    {
        $event = Event::with('organization')->findOrFail($id);
        return Inertia::render('frontend/view-event', [
            'event' => $event,
        ]);
    }
}
