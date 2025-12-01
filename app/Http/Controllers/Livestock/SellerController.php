<?php

namespace App\Http\Controllers\Livestock;

use App\Http\Controllers\BaseController;
use App\Models\SellerProfile;
use App\Models\LivestockAnimal;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class SellerController extends BaseController
{
    /**
     * Show seller profile form.
     */
    public function create(Request $request): Response|RedirectResponse
    {
        $user = $request->user('livestock');
        
        // If user is a buyer (has buyer profile but no seller profile), redirect to home
        if ($user->buyerProfile && !$user->sellerProfile) {
            return redirect()->route('home');
        }
        
        if ($user->sellerProfile) {
            return redirect()->route('seller.dashboard');
        }

        return Inertia::render('Livestock/Seller/CreateProfile');
    }

    /**
     * Store seller profile.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'farm_name' => 'required|string|max:255',
            'address' => 'required|string',
            'description' => 'nullable|string',
            'phone' => 'required|string|max:20',
            'national_id_number' => 'nullable|string|max:50',
            'payee_type' => 'required|in:individual,business,bank',
            'payee_details' => 'required|array',
        ]);

        $user = $request->user('livestock');

        if ($user->sellerProfile) {
            return back()->withErrors(['error' => 'You already have a seller profile.']);
        }

        SellerProfile::create([
            'livestock_user_id' => $user->id,
            ...$validated,
            'verification_status' => 'pending',
        ]);

        return redirect()->route('seller.dashboard')
            ->with('success', 'Seller profile created! Waiting for admin verification.');
    }

    /**
     * Show seller dashboard.
     */
    public function dashboard(Request $request): Response|RedirectResponse
    {
        $user = $request->user('livestock');
        $profile = $user->sellerProfile;

        // If user is a buyer (has buyer profile but no seller profile), redirect to home/marketplace
        if (!$profile && $user->buyerProfile) {
            return redirect()->route('home');
        }

        // If user has neither seller nor buyer profile, redirect to create seller profile
        if (!$profile) {
            return redirect()->route('seller.create');
        }

        $animals = $user->soldAnimals()
            ->with(['primaryPhoto', 'listing'])
            ->latest()
            ->paginate(12);

        // Get purchased animals (animals where user is current owner but not original seller)
        $purchasedAnimals = LivestockAnimal::where('current_owner_livestock_user_id', $user->id)
            ->where('livestock_user_id', '!=', $user->id)
            ->with(['primaryPhoto', 'listing', 'seller'])
            ->latest()
            ->paginate(12);

        $listings = $user->listings()
            ->with(['animal.primaryPhoto'])
            ->where('status', 'active')
            ->latest()
            ->paginate(10);

        $payouts = $user->payouts()
            ->latest()
            ->paginate(10);

        return Inertia::render('Livestock/Seller/Dashboard', [
            'profile' => $profile,
            'animals' => $animals,
            'purchasedAnimals' => $purchasedAnimals,
            'listings' => $listings,
            'payouts' => $payouts,
        ]);
    }

    /**
     * Edit seller profile.
     */
    public function edit(Request $request): Response|RedirectResponse
    {
        $user = $request->user('livestock');
        $profile = $user->sellerProfile;

        // If user is a buyer (has buyer profile but no seller profile), redirect to home
        if (!$profile && $user->buyerProfile) {
            return redirect()->route('home');
        }

        if (!$profile) {
            return redirect()->route('seller.create');
        }

        return Inertia::render('Livestock/Seller/EditProfile', [
            'profile' => $profile,
        ]);
    }

    /**
     * Update seller profile.
     */
    public function update(Request $request)
    {
        $user = $request->user('livestock');
        $profile = $user->sellerProfile;

        // If user is a buyer (has buyer profile but no seller profile), redirect to home
        if (!$profile && $user->buyerProfile) {
            return redirect()->route('home');
        }

        if (!$profile) {
            return redirect()->route('seller.create');
        }

        $validated = $request->validate([
            'farm_name' => 'required|string|max:255',
            'address' => 'required|string',
            'description' => 'nullable|string',
            'phone' => 'required|string|max:20',
            'national_id_number' => 'nullable|string|max:50',
            'payee_type' => 'required|in:individual,business,bank',
            'payee_details' => 'required|array',
        ]);

        $profile->update($validated);

        return redirect()->route('seller.dashboard')
            ->with('success', 'Profile updated successfully.');
    }
}
