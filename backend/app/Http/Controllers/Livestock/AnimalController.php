<?php

namespace App\Http\Controllers\Livestock;

use App\Http\Controllers\BaseController;
use App\Models\LivestockAnimal;
use App\Models\AnimalPhoto;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Storage;

class AnimalController extends BaseController
{
    /**
     * Display a listing of animals.
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $user = $request->user('livestock');
        
        // If user is a buyer (has buyer profile but no seller profile), redirect to home
        if ($user->buyerProfile && !$user->sellerProfile) {
            return redirect()->route('home');
        }
        
        if (!$user->sellerProfile || !$user->sellerProfile->isVerified()) {
            return redirect()->route('seller.create')
                ->with('error', 'Please complete and verify your seller profile first.');
        }

        $perPage = (int) $request->get('per_page', 12);
        $page = (int) $request->get('page', 1);
        $search = $request->get('search', '');
        $status = $request->get('status', '');

        $query = $user->soldAnimals()->with(['primaryPhoto', 'listing']);

        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('breed', 'LIKE', "%{$search}%")
                  ->orWhere('ear_tag', 'LIKE', "%{$search}%")
                  ->orWhere('color_markings', 'LIKE', "%{$search}%");
            });
        }

        if ($status) {
            $query->where('status', $status);
        }

        $animals = $query->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page)
            ->withQueryString();

        return Inertia::render('Livestock/Animals/Index', [
            'animals' => $animals,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'per_page' => $perPage,
                'page' => $page,
            ],
        ]);
    }

    /**
     * Display purchased animals.
     */
    public function purchased(Request $request): Response|RedirectResponse
    {
        $user = $request->user('livestock');
        
        // Allow buyers to view purchased animals
        if ($user->buyerProfile && !$user->sellerProfile) {
            // Buyer can view purchased animals
        } else if (!$user->sellerProfile || !$user->sellerProfile->isVerified()) {
            return redirect()->route('seller.create')
                ->with('error', 'Please complete and verify your seller profile first.');
        }

        $perPage = (int) $request->get('per_page', 12);
        $page = (int) $request->get('page', 1);
        $search = $request->get('search', '');
        $status = $request->get('status', '');

        // Get purchased animals (animals where user is current owner but not original seller)
        $query = LivestockAnimal::where('current_owner_livestock_user_id', $user->id)
            ->where('livestock_user_id', '!=', $user->id)
            ->with([
                'primaryPhoto', 
                'listing', 
                'seller', 
                'fractionalListing' => function($q) {
                    $q->with(['fractionalAsset.offerings' => function($offeringQuery) {
                        $offeringQuery->whereIn('status', ['live', 'sold_out'])->orderBy('created_at', 'desc');
                    }]);
                }
            ]);

        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('breed', 'LIKE', "%{$search}%")
                  ->orWhere('ear_tag', 'LIKE', "%{$search}%")
                  ->orWhere('color_markings', 'LIKE', "%{$search}%");
            });
        }

        if ($status) {
            $query->where('status', $status);
        }

        $animals = $query->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page)
            ->withQueryString();
        
        // Check for fractional offerings and add fractional buyer info for each animal
        $animals->getCollection()->transform(function($animal) {
            // Check for fractional offerings
            $animal->has_fractional_offering = \App\Models\FractionalAsset::whereJsonContains('meta->livestock_animal_id', $animal->id)
                ->whereHas('offerings', function($query) {
                    $query->whereIn('status', ['live', 'draft']);
                })
                ->exists();
            
            // Add fractional listing info with tag number and buyer details
            if ($animal->fractionalListing) {
                $animal->fractional_listing = [
                    'id' => $animal->fractionalListing->id,
                    'tag_number' => $animal->fractionalListing->tag_number,
                    'status' => $animal->fractionalListing->status,
                    'country_code' => $animal->fractionalListing->country_code,
                ];
                
                // Get fractional asset and offering info
                if ($animal->fractionalListing->fractionalAsset) {
                    $offering = $animal->fractionalListing->fractionalAsset->offerings->first();
                    if ($offering) {
                        $animal->fractional_offering = [
                            'id' => $offering->id,
                            'title' => $offering->title,
                            'price_per_share' => $offering->price_per_share,
                            'token_price' => $offering->token_price,
                            'tokens_per_share' => $offering->tokens_per_share,
                            'available_shares' => $offering->available_shares,
                            'status' => $offering->status,
                        ];
                        
                        // Calculate progress for this specific tag
                        // For livestock assets, each tag represents ONE share
                        // So total tokens available for this tag = tokens_per_share (not total_shares * tokens_per_share)
                        $tokensPerShare = $offering->tokens_per_share;
                        $totalTokensAvailable = $tokensPerShare; // Each tag = 1 share = tokensPerShare tokens
                        
                        // Calculate tokens sold for this specific tag
                        // IMPORTANT: Avoid double-counting!
                        // If an order has tag_allocations in meta, use ONLY that (don't count from tag_number field)
                        // If an order doesn't have tag_allocations, count from tag_number field
                        $totalTokensSold = \App\Models\FractionalOrder::where('offering_id', $offering->id)
                            ->where('status', 'paid')
                            ->get()
                            ->sum(function ($order) use ($animal) {
                                $meta = $order->meta ?? [];
                                $tagAllocs = $meta['tag_allocations'] ?? [];
                                
                                // If order has tag_allocations in meta, use that (more accurate for multi-tag orders)
                                if (!empty($tagAllocs) && isset($tagAllocs[$animal->fractionalListing->tag_number])) {
                                    return $tagAllocs[$animal->fractionalListing->tag_number];
                                }
                                
                                // Otherwise, if tag_number matches directly, count the tokens
                                if ($order->tag_number === $animal->fractionalListing->tag_number) {
                                    return $order->tokens;
                                }
                                
                                return 0;
                            });
                        $remainingTokens = max(0, $totalTokensAvailable - $totalTokensSold);
                        $progressPercentage = $totalTokensAvailable > 0 ? round(($totalTokensSold / $totalTokensAvailable) * 100, 2) : 0;
                        
                        $animal->fractional_progress = [
                            'sold_tokens' => $totalTokensSold,
                            'total_tokens' => $totalTokensAvailable,
                            'remaining_tokens' => $remainingTokens,
                            'percentage' => $progressPercentage,
                        ];
                    }
                }
            }
            
            return $animal;
        });

        return Inertia::render('Livestock/Animals/Purchased', [
            'animals' => $animals,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'per_page' => $perPage,
                'page' => $page,
            ],
        ]);
    }

    /**
     * Show the form for creating a new animal.
     */
    public function create(Request $request): Response|RedirectResponse
    {
        $user = $request->user('livestock');
        
        // Allow buyers to create animals
        if ($user->buyerProfile && !$user->sellerProfile) {
            // Buyer can create animals
        } else if (!$user->sellerProfile || !$user->sellerProfile->isVerified()) {
            return redirect()->route('seller.create')
                ->with('error', 'Please complete and verify your seller profile first.');
        }

        return Inertia::render('Livestock/Animals/Create');
    }

    /**
     * Store a newly created animal.
     */
    public function store(Request $request)
    {
        $user = $request->user('livestock');
        
        // Allow buyers to create animals
        if ($user->buyerProfile && !$user->sellerProfile) {
            // Buyer can create animals
        } else if (!$user->sellerProfile || !$user->sellerProfile->isVerified()) {
            return back()->withErrors(['error' => 'Please verify your seller profile first.']);
        }

        $validated = $request->validate([
            'species' => 'required|in:goat,sheep,cow,chicken,pig',
            'breed' => 'required|string|max:255',
            'sex' => 'required|in:male,female',
            'ear_tag' => 'nullable|string|max:50|unique:livestock_animals,ear_tag',
            'date_of_birth' => 'nullable|date',
            'age_months' => 'nullable|integer|min:0',
            'weight_kg' => 'nullable|numeric|min:0',
            'color_markings' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'health_status' => 'required|in:excellent,good,fair,poor',
            'fertility_status' => 'required|in:fertile,infertile,unknown',
            'original_purchase_price' => 'nullable|numeric|min:0',
            'current_market_value' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'photos' => 'nullable|array',
            'photos.*' => 'image|max:5120',
        ]);

        $animal = LivestockAnimal::create([
            'livestock_user_id' => $user->id,
            'current_owner_livestock_user_id' => $user->id,
            ...$validated,
            'status' => 'available',
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

        // Redirect based on user type
        if ($user->buyerProfile && !$user->sellerProfile) {
            return redirect()->route('buyer.animals')
                ->with('success', 'Animal added successfully.');
        }
        
        return redirect()->route('animals.index')
            ->with('success', 'Animal added successfully.');
    }

    /**
     * Display the specified animal.
     */
    public function show(Request $request, $id): Response
    {
        $user = $request->user('livestock');
        
        // Allow viewing animals the user sold OR animals the user owns (purchased)
        $animal = LivestockAnimal::where(function($query) use ($user) {
                $query->where('livestock_user_id', $user->id) // Animals user sold
                      ->orWhere('current_owner_livestock_user_id', $user->id); // Animals user owns
            })
            ->with([
                'photos',
                'healthRecords',
                'parentLink.father',
                'parentLink.mother',
                'listing',
                'fractionalListing',
                'ownershipHistory.previousOwner.sellerProfile',
                'ownershipHistory.previousOwner.buyerProfile',
                'ownershipHistory.newOwner.sellerProfile',
                'ownershipHistory.newOwner.buyerProfile',
            ])
            ->withCount([
                'offspringAsFather',
                'offspringAsMother',
            ])
            ->findOrFail($id);

        // Get breeding events where this animal is male or female
        $breedingEventsAsMale = \App\Models\BreedingEvent::where('male_id', $animal->id)
            ->with(['female', 'offspring.child'])
            ->orderBy('breeding_date', 'desc')
            ->get();
        
        $breedingEventsAsFemale = \App\Models\BreedingEvent::where('female_id', $animal->id)
            ->with(['male', 'offspring.child'])
            ->orderBy('breeding_date', 'desc')
            ->get();
        
        $allBreedingEvents = $breedingEventsAsMale->merge($breedingEventsAsFemale)->sortByDesc('breeding_date')->values();

        // Get offspring (children) of this animal
        $offspringAsFather = \App\Models\AnimalParentLink::where('father_id', $animal->id)
            ->with(['child.photos', 'breedingEvent'])
            ->get()
            ->map(function($link) {
                return $link->child;
            });
        
        $offspringAsMother = \App\Models\AnimalParentLink::where('mother_id', $animal->id)
            ->with(['child.photos', 'breedingEvent'])
            ->get()
            ->map(function($link) {
                return $link->child;
            });
        
        $allOffspring = $offspringAsFather->merge($offspringAsMother)->unique('id')->values();

        // Get fractional listing and purchasers information
        $fractionalPurchasers = [];
        $fractionalListing = null;
        
        if ($animal->fractionalListing) {
            $fractionalListing = \App\Models\FractionalListing::with(['fractionalAsset.offerings'])
                ->find($animal->fractionalListing->id);
            
            if ($fractionalListing && $fractionalListing->fractionalAsset) {
                $offering = $fractionalListing->fractionalAsset->offerings->where('status', 'live')->first();
                
                if ($offering) {
                    // Get all paid orders for this offering
                    $orders = \App\Models\FractionalOrder::where('offering_id', $offering->id)
                        ->where('status', 'paid')
                        ->with(['user'])
                        ->get();
                    
                    // Group purchasers by tag number
                    $purchasersByTag = [];
                    
                    foreach ($orders as $order) {
                        $tagNumbers = [];
                        $tagAllocations = [];
                        
                        // Get tag numbers from order meta
                        $meta = $order->meta ?? [];
                        if (!empty($meta['all_tag_numbers'])) {
                            $tagNumbers = $meta['all_tag_numbers'];
                            $tagAllocations = $meta['tag_allocations'] ?? [];
                        } elseif ($order->tag_number) {
                            $tagNumbers = [$order->tag_number];
                            $tagAllocations = [$order->tag_number => $order->tokens];
                        }
                        
                        // Only include tags that match this animal's fractional listing tag
                        $animalTag = $fractionalListing->tag_number;
                        
                        foreach ($tagNumbers as $tagNumber) {
                            if ($tagNumber === $animalTag) {
                                $tokensForTag = $tagAllocations[$tagNumber] ?? $order->tokens;
                                
                                if (!isset($purchasersByTag[$tagNumber])) {
                                    $purchasersByTag[$tagNumber] = [];
                                }
                                
                                $purchasersByTag[$tagNumber][] = [
                                    'user_id' => $order->user->id,
                                    'user_name' => $order->user->name,
                                    'user_email' => $order->user->email,
                                    'tokens' => $tokensForTag,
                                    'amount' => $order->amount,
                                    'order_number' => $order->order_number,
                                    'purchased_at' => $order->paid_at->toISOString(),
                                ];
                            }
                        }
                    }
                    
                    // Format purchasers grouped by tag
                    foreach ($purchasersByTag as $tagNumber => $purchasers) {
                        $fractionalPurchasers[] = [
                            'tag_number' => $tagNumber,
                            'purchasers' => $purchasers,
                        ];
                    }
                }
            }
        }

        return Inertia::render('Livestock/Animals/Show', [
            'animal' => $animal,
            'breeding_events' => $allBreedingEvents,
            'offspring' => $allOffspring,
            'fractional_listing' => $fractionalListing ? [
                'id' => $fractionalListing->id,
                'tag_number' => $fractionalListing->tag_number,
                'status' => $fractionalListing->status,
                'country_code' => $fractionalListing->country_code,
            ] : null,
            'fractional_purchasers' => $fractionalPurchasers,
        ]);
    }

    /**
     * Show the form for editing the specified animal.
     */
    public function edit(Request $request, $id): Response
    {
        $user = $request->user('livestock');
        
        // Allow editing if user is the current owner (buyer or seller)
        $animal = LivestockAnimal::where('current_owner_livestock_user_id', $user->id)
            ->with(['photos'])
            ->findOrFail($id);

        // Prevent editing sold animals - sellers can only view them
        if ($animal->status === 'sold' && $user->sellerProfile) {
            return redirect()->route('animals.show', $animal->id)
                ->with('error', 'Sold animals cannot be edited. You can only view them.');
        }

        return Inertia::render('Livestock/Animals/Edit', [
            'animal' => $animal,
        ]);
    }

    /**
     * Update the specified animal.
     */
    public function update(Request $request, $id)
    {
        $user = $request->user('livestock');
        
        // Allow updating if user is the current owner (buyer or seller)
        $animal = LivestockAnimal::where('current_owner_livestock_user_id', $user->id)
            ->findOrFail($id);

        // Prevent updating sold animals - sellers can only view them
        if ($animal->status === 'sold' && $user->sellerProfile) {
            return redirect()->route('animals.show', $animal->id)
                ->with('error', 'Sold animals cannot be edited. You can only view them.');
        }
        
        // Full update for all current owners (buyers can edit purchased animals fully)
        $validated = $request->validate([
            'species' => 'required|in:goat,sheep,cow,chicken,pig',
            'breed' => 'required|string|max:255',
            'sex' => 'required|in:male,female',
            'ear_tag' => 'nullable|string|max:50|unique:livestock_animals,ear_tag,' . $animal->id,
            'date_of_birth' => 'nullable|date',
            'age_months' => 'nullable|integer|min:0',
            'weight_kg' => 'nullable|numeric|min:0',
            'color_markings' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'health_status' => 'required|in:excellent,good,fair,poor',
            'fertility_status' => 'required|in:fertile,infertile,unknown',
            'original_purchase_price' => 'nullable|numeric|min:0',
            'current_market_value' => 'nullable|numeric|min:0',
            'status' => 'required|in:available,sold,off_farm,deceased',
            'notes' => 'nullable|string',
            'photos' => 'nullable|array',
            'photos.*' => 'image|max:5120',
            'photos_to_delete' => 'nullable|array',
            'photos_to_delete.*' => 'integer|exists:animal_photos,id',
        ]);

        $animal->update($validated);

        // Handle photo deletions
        if ($request->has('photos_to_delete')) {
            $photosToDelete = AnimalPhoto::whereIn('id', $request->photos_to_delete)
                ->where('animal_id', $animal->id)
                ->get();
            
            foreach ($photosToDelete as $photo) {
                // Delete file from storage
                $path = str_replace('/storage/', '', parse_url($photo->url, PHP_URL_PATH));
                Storage::disk('public')->delete($path);
                $photo->delete();
            }
        }

        // Handle new photo uploads
        if ($request->hasFile('photos')) {
            $existingPhotosCount = $animal->photos()->count();
            $isFirst = $existingPhotosCount === 0;
            
            foreach ($request->file('photos') as $index => $photo) {
                $path = $photo->store('livestock/animals', 'public');
                AnimalPhoto::create([
                    'animal_id' => $animal->id,
                    'url' => Storage::url($path),
                    'is_primary' => $isFirst && $index === 0,
                    'display_order' => $existingPhotosCount + $index,
                ]);
                $isFirst = false;
            }
        }

        // Redirect based on user type
        if ($user->buyerProfile && !$user->sellerProfile) {
            return redirect(`/buyer/animals`)
                ->with('success', 'Animal updated successfully.');
        }
        
        return redirect(`/animals/${$animal->id}`)
            ->with('success', 'Animal updated successfully.');
    }

    /**
     * Remove the specified animal.
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user('livestock');
        $animal = $user->soldAnimals()->findOrFail($id);

        // Prevent deleting sold animals - sellers can only view them
        if ($animal->status === 'sold' && $user->sellerProfile) {
            return back()->withErrors(['error' => 'Sold animals cannot be deleted. You can only view them.']);
        }

        // Check if animal has active listing
        if ($animal->listing && $animal->listing->isActive()) {
            return back()->withErrors(['error' => 'Cannot delete animal with active listing. Remove listing first.']);
        }

        $animal->delete();

        return redirect()->route('animals.index')
            ->with('success', 'Animal deleted successfully.');
    }
}
