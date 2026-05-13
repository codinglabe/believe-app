<?php

namespace App\Http\Controllers;

use App\Models\UnityLoavesLocation;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

class DashboardUnityLoavesController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        
        $query = UnityLoavesLocation::query();

        if ($user->organization) {
            $query->where('organization_id', $user->organization->id)
                  ->orWhere('user_id', $user->id);
        } else {
            $query->where('user_id', $user->id);
        }

        $locations = $query->latest()->paginate(10);

        return Inertia::render('dashboard/unity-loaves/Index', [
            'locations' => $locations
        ]);
    }

    public function create()
    {
        return Inertia::render('dashboard/unity-loaves/CreateEdit', [
            'location' => null
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:50',
            'zip' => 'nullable|string|max:20',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'phone' => 'nullable|string|max:30',
            'website' => 'nullable|url|max:255',
            'meal_type' => 'required|string|in:food_pantry,hot_meals,community_meal',
            'accepts_food_donations' => 'boolean',
            'dropoff_instructions' => 'nullable|string',
            'is_active' => 'boolean'
        ]);

        $user = Auth::user();
        if ($user->organization) {
            $data['organization_id'] = $user->organization->id;
        }
        $data['user_id'] = $user->id;

        UnityLoavesLocation::create($data);

        return redirect()->route('dashboard.unity-loaves.index')->with('success', 'Location created successfully.');
    }

    public function edit(UnityLoavesLocation $unityLoaf)
    {
        $this->authorizeAccess($unityLoaf);

        return Inertia::render('dashboard/unity-loaves/CreateEdit', [
            'location' => $unityLoaf
        ]);
    }

    public function update(Request $request, UnityLoavesLocation $unityLoaf)
    {
        $this->authorizeAccess($unityLoaf);

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:50',
            'zip' => 'nullable|string|max:20',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'phone' => 'nullable|string|max:30',
            'website' => 'nullable|url|max:255',
            'meal_type' => 'required|string|in:food_pantry,hot_meals,community_meal',
            'accepts_food_donations' => 'boolean',
            'dropoff_instructions' => 'nullable|string',
            'is_active' => 'boolean'
        ]);

        $unityLoaf->update($data);

        return redirect()->route('dashboard.unity-loaves.index')->with('success', 'Location updated successfully.');
    }

    public function destroy(UnityLoavesLocation $unityLoaf)
    {
        $this->authorizeAccess($unityLoaf);
        
        $unityLoaf->delete();

        return redirect()->route('dashboard.unity-loaves.index')->with('success', 'Location deleted successfully.');
    }

    private function authorizeAccess(UnityLoavesLocation $location)
    {
        $user = Auth::user();
        
        if ($location->user_id === $user->id) {
            return true;
        }

        if ($user->organization && $location->organization_id === $user->organization->id) {
            return true;
        }

        abort(403, 'Unauthorized access to this location.');
    }
}
