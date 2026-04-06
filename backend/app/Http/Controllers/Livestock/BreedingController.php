<?php

namespace App\Http\Controllers\Livestock;

use App\Http\Controllers\BaseController;
use App\Models\BreedingEvent;
use App\Models\LivestockAnimal;
use App\Models\AnimalParentLink;
use App\Models\AnimalPhoto;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class BreedingController extends BaseController
{
    /**
     * Display a listing of breeding events.
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $user = $request->user('livestock');
        
        // Allow buyers to access breeding (they can breed purchased animals)
        if ($user->buyerProfile && !$user->sellerProfile) {
            // Buyer can access breeding
        } else if (!$user->sellerProfile || !$user->sellerProfile->isVerified()) {
            return redirect()->route('seller.create')
                ->with('error', 'Please complete and verify your seller profile first.');
        }

        $perPage = (int) $request->get('per_page', 12);
        $page = (int) $request->get('page', 1);

        $events = BreedingEvent::whereHas('male', function($q) use ($user) {
                $q->where('current_owner_livestock_user_id', $user->id);
            })
            ->orWhereHas('female', function($q) use ($user) {
                $q->where('current_owner_livestock_user_id', $user->id);
            })
            ->with(['male', 'female'])
            ->orderBy('breeding_date', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        return Inertia::render('Livestock/Breeding/Index', [
            'events' => $events,
        ]);
    }

    /**
     * Show the form for creating a new breeding event.
     */
    public function create(Request $request): Response|RedirectResponse
    {
        $user = $request->user('livestock');
        
        // Allow buyers to access breeding (they can breed purchased animals)
        if ($user->buyerProfile && !$user->sellerProfile) {
            // Buyer can access breeding
        } else if (!$user->sellerProfile || !$user->sellerProfile->isVerified()) {
            return redirect()->route('seller.create')
                ->with('error', 'Please complete and verify your seller profile first.');
        }

        // Get user's animals (include both available and sold - current owner can use purchased animals)
        $males = $user->animals()
            ->where('sex', 'male')
            ->whereIn('status', ['available', 'sold'])
            ->get();
        
        $females = $user->animals()
            ->where('sex', 'female')
            ->whereIn('status', ['available', 'sold'])
            ->get();

        return Inertia::render('Livestock/Breeding/Create', [
            'males' => $males,
            'females' => $females,
        ]);
    }

    /**
     * Store a newly created breeding event.
     */
    public function store(Request $request)
    {
        $user = $request->user('livestock');
        
        if (!$user->sellerProfile || !$user->sellerProfile->isVerified()) {
            return back()->withErrors(['error' => 'Please verify your seller profile first.']);
        }

        $validated = $request->validate([
            'male_id' => 'required|exists:livestock_animals,id',
            'female_id' => 'required|exists:livestock_animals,id|different:male_id',
            'breeding_method' => 'required|in:natural,artificial,ai',
            'stud_fee' => 'nullable|numeric|min:0',
            'breeding_date' => 'required|date',
            'expected_kidding_date' => 'nullable|date|after:breeding_date',
            'notes' => 'nullable|string',
        ]);

        // Verify ownership
        $male = LivestockAnimal::findOrFail($validated['male_id']);
        $female = LivestockAnimal::findOrFail($validated['female_id']);

        if ($male->current_owner_livestock_user_id !== $user->id && $female->current_owner_livestock_user_id !== $user->id) {
            return back()->withErrors(['error' => 'You must own at least one of the animals.']);
        }

        $event = BreedingEvent::create($validated);

        return redirect()->route('breeding.index')
            ->with('success', 'Breeding event recorded successfully.');
    }

    /**
     * Display the specified breeding event.
     */
    public function show(Request $request, $id): Response
    {
        $user = $request->user('livestock');
        $event = BreedingEvent::with([
            'male',
            'female',
            'offspring.child' => function($query) {
                $query->with('photos');
            }
        ])->findOrFail($id);

        // Check ownership
        if ($event->male->current_owner_livestock_user_id !== $user->id && $event->female->current_owner_livestock_user_id !== $user->id) {
            abort(403);
        }

        return Inertia::render('Livestock/Breeding/Show', [
            'event' => $event,
        ]);
    }

    /**
     * Show the form for editing the specified breeding event.
     */
    public function edit(Request $request, $id): Response|RedirectResponse
    {
        $user = $request->user('livestock');
        
        // Allow buyers to access breeding (they can breed purchased animals)
        if ($user->buyerProfile && !$user->sellerProfile) {
            // Buyer can access breeding
        } else if (!$user->sellerProfile || !$user->sellerProfile->isVerified()) {
            return redirect()->route('seller.create')
                ->with('error', 'Please complete and verify your seller profile first.');
        }

        $event = BreedingEvent::with(['male', 'female'])->findOrFail($id);

        // Check ownership
        if ($event->male->current_owner_livestock_user_id !== $user->id && $event->female->current_owner_livestock_user_id !== $user->id) {
            abort(403);
        }

        // Get user's animals (include both available and sold - current owner can use purchased animals)
        $males = $user->animals()
            ->where('sex', 'male')
            ->whereIn('status', ['available', 'sold'])
            ->get();
        
        $females = $user->animals()
            ->where('sex', 'female')
            ->whereIn('status', ['available', 'sold'])
            ->get();

        return Inertia::render('Livestock/Breeding/Edit', [
            'event' => $event,
            'males' => $males,
            'females' => $females,
        ]);
    }

    /**
     * Update the specified breeding event.
     */
    public function update(Request $request, $id): RedirectResponse
    {
        $user = $request->user('livestock');
        $event = BreedingEvent::with(['male', 'female'])->findOrFail($id);

        // Check ownership
        if ($event->male->current_owner_livestock_user_id !== $user->id && $event->female->current_owner_livestock_user_id !== $user->id) {
            abort(403);
        }

        $validated = $request->validate([
            'male_id' => 'required|exists:livestock_animals,id',
            'female_id' => 'required|exists:livestock_animals,id|different:male_id',
            'breeding_method' => 'required|in:natural,artificial,ai',
            'stud_fee' => 'nullable|numeric|min:0',
            'breeding_date' => 'required|date',
            'expected_kidding_date' => 'nullable|date|after:breeding_date',
            'actual_kidding_date' => 'nullable|date|after:breeding_date',
            'number_of_kids' => 'nullable|integer|min:0',
            'notes' => 'nullable|string',
        ]);

        // Verify ownership
        $male = LivestockAnimal::findOrFail($validated['male_id']);
        $female = LivestockAnimal::findOrFail($validated['female_id']);

        if ($male->current_owner_livestock_user_id !== $user->id && $female->current_owner_livestock_user_id !== $user->id) {
            return back()->withErrors(['error' => 'You must own at least one of the animals.']);
        }

        $event->update($validated);

        return redirect()->route('breeding.show', $event->id)
            ->with('success', 'Breeding event updated successfully.');
    }

    /**
     * Create a single offspring from breeding event.
     */
    public function createSingleOffspring(Request $request, $id)
    {
        $user = $request->user('livestock');
        $event = BreedingEvent::with(['male', 'female'])->findOrFail($id);

        // Check ownership
        if ($event->male->current_owner_livestock_user_id !== $user->id && $event->female->current_owner_livestock_user_id !== $user->id) {
            abort(403);
        }

        $validated = $request->validate([
            'species' => 'required|in:goat,sheep,cow,chicken,pig',
            'breed' => 'required|string|max:255',
            'sex' => 'required|in:male,female',
            'ear_tag' => 'nullable|string|max:50|unique:livestock_animals,ear_tag',
            'date_of_birth' => 'nullable|date',
            'weight_kg' => 'nullable|numeric|min:0',
            'color_markings' => 'nullable|string|max:255',
            'photos' => 'nullable|array',
            'photos.*' => 'image|max:5120',
        ]);

        DB::beginTransaction();
        try {
            // Create animal - ownership goes to the current owner who created the breeding event
            // Since the user must own at least one animal to access this breeding event, offspring goes to them
            $animal = LivestockAnimal::create([
                'livestock_user_id' => $user->id,
                'current_owner_livestock_user_id' => $user->id,
                ...$validated,
                'status' => 'available',
            ]);

            // Create parent link
            AnimalParentLink::create([
                'child_id' => $animal->id,
                'father_id' => $event->male_id,
                'mother_id' => $event->female_id,
                'breeding_event_id' => $event->id,
            ]);

            // Handle photo uploads
            if ($request->hasFile('photos')) {
                $isFirst = true;
                foreach ($request->file('photos') as $index => $photo) {
                    $path = $photo->store('livestock/animals', 'public');
                    AnimalPhoto::create([
                        'animal_id' => $animal->id,
                        'url' => Storage::url($path),
                        'is_primary' => $isFirst,
                        'display_order' => $index,
                    ]);
                    $isFirst = false;
                }
            }

            // Update breeding event
            if (!$event->actual_kidding_date) {
                $event->update([
                    'actual_kidding_date' => now(),
                ]);
            }
            $event->increment('number_of_kids');

            DB::commit();

            return redirect()->route('breeding.show', $event->id)
                ->with('success', 'Offspring created successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Failed to create offspring: ' . $e->getMessage()]);
        }
    }

    /**
     * Create offspring from breeding event.
     */
    public function createOffspring(Request $request, $id)
    {
        $user = $request->user('livestock');
        $event = BreedingEvent::with(['male', 'female'])->findOrFail($id);

        // Check ownership
        if ($event->male->current_owner_livestock_user_id !== $user->id && $event->female->current_owner_livestock_user_id !== $user->id) {
            abort(403);
        }

        $validated = $request->validate([
            'offspring' => 'required|array|min:1',
            'offspring.*.species' => 'required|in:goat,sheep,cow,chicken,pig',
            'offspring.*.breed' => 'required|string|max:255',
            'offspring.*.sex' => 'required|in:male,female',
            'offspring.*.ear_tag' => 'nullable|string|max:50|unique:livestock_animals,ear_tag',
            'offspring.*.date_of_birth' => 'nullable|date',
            'offspring.*.weight_kg' => 'nullable|numeric|min:0',
            'offspring.*.color_markings' => 'nullable|string|max:255',
        ]);

        DB::beginTransaction();
        try {
            $offspringIds = [];
            foreach ($validated['offspring'] as $offspringData) {
                // Create animal - ownership goes to the current owner who created the breeding event
                // Since the user must own at least one animal to access this breeding event, offspring goes to them
                $animal = LivestockAnimal::create([
                    'livestock_user_id' => $user->id,
                    'current_owner_livestock_user_id' => $user->id,
                    ...$offspringData,
                    'status' => 'available',
                ]);

                // Create parent link
                AnimalParentLink::create([
                    'child_id' => $animal->id,
                    'father_id' => $event->male_id,
                    'mother_id' => $event->female_id,
                    'breeding_event_id' => $event->id,
                ]);

                $offspringIds[] = $animal->id;
            }

            // Update breeding event
            $event->update([
                'actual_kidding_date' => now(),
                'number_of_kids' => count($validated['offspring']),
            ]);

            DB::commit();

            return redirect()->route('breeding.show', $event->id)
                ->with('success', count($validated['offspring']) . ' offspring created successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Failed to create offspring: ' . $e->getMessage()]);
        }
    }

    /**
     * Delete the specified breeding event.
     */
    public function destroy(Request $request, $id): RedirectResponse
    {
        $user = $request->user('livestock');
        $event = BreedingEvent::with(['male', 'female'])->findOrFail($id);

        // Check ownership
        if ($event->male->current_owner_livestock_user_id !== $user->id && $event->female->current_owner_livestock_user_id !== $user->id) {
            abort(403);
        }

        // Check if event has offspring - warn but allow deletion
        $offspringCount = $event->offspring()->count();
        
        try {
            $event->delete();

            return redirect()->route('breeding.index')
                ->with('success', 'Breeding event deleted successfully.');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to delete breeding event: ' . $e->getMessage()]);
        }
    }

    /**
     * Update a specific offspring animal.
     */
    public function updateOffspring(Request $request, $breedingId, $offspringId)
    {
        $user = $request->user('livestock');
        $event = BreedingEvent::with(['male', 'female'])->findOrFail($breedingId);
        
        // Check ownership
        if ($event->male->current_owner_livestock_user_id !== $user->id && $event->female->current_owner_livestock_user_id !== $user->id) {
            abort(403);
        }

        $animal = LivestockAnimal::findOrFail($offspringId);
        
        // Verify this animal is actually an offspring of this breeding event
        $parentLink = AnimalParentLink::where('child_id', $animal->id)
            ->where('breeding_event_id', $event->id)
            ->firstOrFail();

        $validated = $request->validate([
            'species' => 'required|in:goat,sheep,cow,chicken,pig',
            'breed' => 'required|string|max:255',
            'sex' => 'required|in:male,female',
            'ear_tag' => 'nullable|string|max:50|unique:livestock_animals,ear_tag,' . $animal->id,
            'date_of_birth' => 'nullable|date',
            'weight_kg' => 'nullable|numeric|min:0',
            'color_markings' => 'nullable|string|max:255',
            'photos' => 'nullable|array',
            'photos.*' => 'image|max:5120',
        ], [
            'species.required' => 'The species field is required.',
            'breed.required' => 'The breed field is required.',
            'sex.required' => 'The sex field is required.',
        ]);

        DB::beginTransaction();
        try {
            $animal->update($validated);

            // Handle new photo uploads
            if ($request->hasFile('photos')) {
                $existingPhotosCount = $animal->photos()->count();
                $isFirst = $existingPhotosCount === 0;
                
                foreach ($request->file('photos') as $index => $photo) {
                    $path = $photo->store('livestock/animals', 'public');
                    AnimalPhoto::create([
                        'animal_id' => $animal->id,
                        'url' => Storage::url($path),
                        'is_primary' => $isFirst,
                        'display_order' => $existingPhotosCount + $index,
                    ]);
                    $isFirst = false;
                }
            }

            DB::commit();

            return redirect()->route('breeding.show', $event->id)
                ->with('success', 'Offspring updated successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Failed to update offspring: ' . $e->getMessage()]);
        }
    }
}
