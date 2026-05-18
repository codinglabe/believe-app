<?php

namespace App\Http\Controllers\Livestock;

use App\Http\Controllers\BaseController;
use App\Models\LivestockAnimal;
use App\Models\FractionalListing;
use App\Models\FractionalAsset;
use App\Models\Country;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class FractionalListingController extends BaseController
{
    /**
     * Show the form for creating a new fractional listing.
     */
    public function create(Request $request, $animalId): Response|RedirectResponse
    {
        $user = $request->user('livestock');
        
        // Only allow buyers
        if (!$user->buyerProfile) {
            return redirect('/');
        }

        $animal = LivestockAnimal::where('current_owner_livestock_user_id', $user->id)
            ->with(['primaryPhoto', 'photos'])
            ->findOrFail($animalId);

        // Check if already listed and active
        if ($animal->fractionalListing && in_array($animal->fractionalListing->status, ['active', 'pending'])) {
            return redirect('/buyer/animals')
                ->with('error', 'This animal is already listed for fractional ownership.');
        }

        // If there's a cancelled listing, use its data for editing
        $existingListing = $animal->fractionalListing && $animal->fractionalListing->status === 'cancelled' 
            ? $animal->fractionalListing 
            : null;

        $countries = Country::active()->ordered()->get();

        return Inertia::render('Livestock/Buyer/CreateFractionalListing', [
            'animal' => $animal,
            'countries' => $countries,
            'existingListing' => $existingListing,
        ]);
    }

    /**
     * Store a newly created fractional listing.
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user('livestock');
        
        // Only allow buyers
        if (!$user->buyerProfile) {
            return redirect('/');
        }

        $validated = $request->validate([
            'livestock_animal_id' => 'required|exists:livestock_animals,id',
            'country_code' => 'required|string|size:2',
            'tag_number' => 'required|string|max:50|unique:fractional_listings,tag_number',
            'notes' => 'nullable|string|max:1000',
        ]);

        $animal = LivestockAnimal::where('current_owner_livestock_user_id', $user->id)
            ->findOrFail($validated['livestock_animal_id']);

        // Check if already listed and active/pending
        if ($animal->fractionalListing && in_array($animal->fractionalListing->status, ['active', 'pending'])) {
            return back()->withErrors(['error' => 'This animal is already listed for fractional ownership.']);
        }

        // Generate full tag number with country code prefix
        $fullTagNumber = strtoupper($validated['country_code']) . '-' . $validated['tag_number'];

        // Check if full tag number is unique (excluding current animal's listing)
        $existingListing = $animal->fractionalListing;
        $excludeId = $existingListing ? $existingListing->id : null;
        
        if (FractionalListing::where('tag_number', $fullTagNumber)
            ->where('id', '!=', $excludeId)
            ->exists()) {
            return back()->withErrors(['tag_number' => 'This tag number already exists.']);
        }

        // Check if ear_tag is unique in animals table
        if (LivestockAnimal::where('ear_tag', $fullTagNumber)->where('id', '!=', $animal->id)->exists()) {
            return back()->withErrors(['tag_number' => 'This tag number is already used for another animal.']);
        }

        // Always set status to 'active' - no admin approval needed
        $status = 'active';

        // Get the buyer's linked asset if available
        $fractionalAssetId = null;
        if ($user->buyerProfile && $user->buyerProfile->fractional_asset_id) {
            $fractionalAssetId = $user->buyerProfile->fractional_asset_id;
        }

        // Create or update fractional listing
        $listing = FractionalListing::updateOrCreate(
            [
                'livestock_animal_id' => $animal->id,
                'livestock_user_id' => $user->id,
            ],
            [
                'country_code' => strtoupper($validated['country_code']),
                'tag_number' => $fullTagNumber,
                'status' => $status,
                'notes' => $validated['notes'] ?? null,
                'fractional_asset_id' => $fractionalAssetId, // Automatically use buyer's linked asset
            ]
        );

        // Update animal's ear_tag with the new tag number
        $animal->update([
            'ear_tag' => $fullTagNumber,
        ]);
            
        return redirect('/buyer/animals')
            ->with('success', 'Animal listed for fractional ownership successfully. It is now active and available.');
    }

    /**
     * Unlist (cancel) a fractional listing.
     */
    public function destroy(Request $request, $id): RedirectResponse
    {
        $user = $request->user('livestock');
        
        // Only allow buyers
        if (!$user->buyerProfile) {
            return redirect('/');
        }

        $listing = FractionalListing::where('livestock_user_id', $user->id)
            ->findOrFail($id);

        // Set status to cancelled instead of deleting
        $listing->update([
            'status' => 'cancelled',
        ]);

        return redirect('/buyer/animals')
            ->with('success', 'Fractional listing unlisted successfully. You can relist it anytime.');
    }
}
