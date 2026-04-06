<?php

namespace App\Http\Controllers\Livestock;

use App\Http\Controllers\BaseController;
use App\Models\LivestockListing;
use App\Models\LivestockAnimal;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ListingController extends BaseController
{
    /**
     * Show the form for creating a new listing.
     */
    public function create(Request $request, $animalId): Response|RedirectResponse
    {
        $user = $request->user('livestock');
        $animal = $user->soldAnimals()
            ->with(['primaryPhoto', 'listing'])
            ->findOrFail($animalId);

        if ($animal->listing && $animal->listing->isActive()) {
            return redirect()->route('animals.show', $animal->id)
                ->with('error', 'This animal already has an active listing.');
        }

        return Inertia::render('Livestock/Listings/Create', [
            'animal' => $animal,
        ]);
    }

    /**
     * Store a newly created listing.
     */
    public function store(Request $request, $animalId)
    {
        $user = $request->user('livestock');
        $animal = $user->soldAnimals()->findOrFail($animalId);

        if ($animal->listing && $animal->listing->isActive()) {
            return back()->withErrors(['error' => 'This animal already has an active listing.']);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'currency' => 'required|string|max:3',
        ]);

        $listing = LivestockListing::create([
            'animal_id' => $animal->id,
            'livestock_user_id' => $user->id,
            ...$validated,
            'status' => 'active',
            'listed_at' => now(),
        ]);

        return redirect()->route('animals.show', $animal->id)
            ->with('success', 'Listing created successfully!');
    }

    /**
     * Remove a listing.
     */
    public function destroy(Request $request, $animalId, $id)
    {
        $user = $request->user('livestock');
        $animal = $user->soldAnimals()->findOrFail($animalId);
        $listing = $animal->listing;

        if (!$listing || $listing->id != $id) {
            return back()->withErrors(['error' => 'Listing not found.']);
        }

        $listing->update(['status' => 'removed']);

        return redirect()->route('animals.show', $animal->id)
            ->with('success', 'Listing removed successfully.');
    }
}
