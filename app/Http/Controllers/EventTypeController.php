<?php

namespace App\Http\Controllers;

use App\Models\EventType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class EventTypeController extends BaseController
{
    protected function assertCanMutateEventTypes(Request $request): void
    {
        $user = $request->user();
        if (! $user?->hasRole('admin')) {
            abort(403, 'Only administrators can add, edit, or delete event types.');
        }
    }

    public function index(Request $request)
    {
        $user = $request->user();
        if ($user === null) {
            abort(403);
        }

        if (! $user->can('event_type.read') && ! $user->hasNonprofitDashboardRole() && ! $user->hasRole('admin')) {
            abort(403, 'You do not have permission to view event types.');
        }

        $filters = $request->only(['search']);

        $eventTypes = EventType::query()
            ->when($filters['search'] ?? null, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', '%'.$search.'%')
                        ->orWhere('category', 'like', '%'.$search.'%');
                });
            })
            ->orderBy('category')
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('admin/event-type/Index', [
            'eventTypes' => $eventTypes,
            'filters' => $filters,
            'canManageEventTypes' => $user->hasRole('admin'),
        ]);
    }

    public function store(Request $request)
    {
        $this->assertCanMutateEventTypes($request);
        $this->authorizePermission($request, 'event_type.create');

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('event_types')->where(fn ($q) => $q->where('category', $request->input('category'))),
            ],
            'category' => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'is_active' => 'boolean',
        ]);

        EventType::create([
            'name' => $validated['name'],
            'category' => $validated['category'],
            'description' => $validated['description'] ?? null,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->route('event-types.index')->with('success', 'Event type created successfully!');
    }

    public function update(Request $request, EventType $event_type)
    {
        $this->assertCanMutateEventTypes($request);
        $this->authorizePermission($request, 'event_type.update');

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('event_types')
                    ->where(fn ($q) => $q->where('category', $request->input('category')))
                    ->ignore($event_type->id),
            ],
            'category' => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'is_active' => 'boolean',
        ]);

        $event_type->update([
            'name' => $validated['name'],
            'category' => $validated['category'],
            'description' => $validated['description'] ?? null,
            'is_active' => $request->boolean('is_active'),
        ]);

        return redirect()->route('event-types.index')->with('success', 'Event type updated successfully!');
    }

    public function destroy(Request $request, EventType $event_type)
    {
        $this->assertCanMutateEventTypes($request);
        $this->authorizePermission($request, 'event_type.delete');

        try {
            if ($event_type->events()->exists() || $event_type->courses()->exists()) {
                return redirect()->back()->with('error', 'Cannot delete this event type: it is in use by events or courses.');
            }
            $event_type->delete();

            return redirect()->route('event-types.index')->with('success', 'Event type deleted successfully!');
        } catch (\Exception $e) {
            Log::error('Error deleting event type: '.$e->getMessage());

            return redirect()->back()->with('error', 'Failed to delete event type. An unexpected error occurred.');
        }
    }
}
