<?php

namespace App\Http\Controllers\Livestock;

use App\Http\Controllers\BaseController;
use App\Models\LivestockAnimal;
use App\Models\LivestockPayout;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class BuyerController extends BaseController
{
    /**
     * Show buyer dashboard.
     */
    public function dashboard(Request $request): Response
    {
        $user = $request->user('livestock');
        
        // Only allow buyers (users with buyer profile)
        if (!$user->buyerProfile) {
            return redirect()->route('home');
        }

        // Get purchased animals (animals where user is current owner but not original seller)
        $purchasedAnimals = LivestockAnimal::where('current_owner_livestock_user_id', $user->id)
            ->where('livestock_user_id', '!=', $user->id)
            ->with(['primaryPhoto', 'listing', 'seller'])
            ->latest()
            ->paginate(12);

        // Get stats
        $stats = [
            'total_purchased' => LivestockAnimal::where('current_owner_livestock_user_id', $user->id)
                ->where('livestock_user_id', '!=', $user->id)
                ->count(),
            'available' => LivestockAnimal::where('current_owner_livestock_user_id', $user->id)
                ->where('livestock_user_id', '!=', $user->id)
                ->where('status', 'available')
                ->count(),
            'sold' => LivestockAnimal::where('current_owner_livestock_user_id', $user->id)
                ->where('livestock_user_id', '!=', $user->id)
                ->where('status', 'sold')
                ->count(),
            'listed' => LivestockAnimal::where('current_owner_livestock_user_id', $user->id)
                ->where('livestock_user_id', '!=', $user->id)
                ->whereHas('listing', function($query) {
                    $query->where('status', 'active');
                })
                ->count(),
        ];

        return Inertia::render('Livestock/Buyer/Dashboard', [
            'profile' => $user->buyerProfile,
            'purchasedAnimals' => $purchasedAnimals,
            'stats' => $stats,
        ]);
    }

    /**
     * Show buyer profile edit form.
     */
    public function edit(Request $request): Response|RedirectResponse
    {
        $user = $request->user('livestock');
        $profile = $user->buyerProfile;

        if (!$profile) {
            return redirect()->route('home');
        }

        return Inertia::render('Livestock/Buyer/EditProfile', [
            'profile' => $profile,
        ]);
    }

    /**
     * Update buyer profile.
     */
    public function update(Request $request): RedirectResponse
    {
        $user = $request->user('livestock');
        $profile = $user->buyerProfile;

        if (!$profile) {
            return redirect()->route('home');
        }

        $validated = $request->validate([
            'farm_name' => 'required|string|max:255',
            'address' => 'required|string',
            'description' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|string|email|max:255',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'zip_code' => 'nullable|string|max:20',
            'country' => 'nullable|string|max:255',
            'national_id_number' => 'nullable|string|max:255',
            'farm_type' => 'nullable|string|max:255',
            'farm_size_acres' => 'nullable|integer|min:0',
            'number_of_animals' => 'nullable|integer|min:0',
            'specialization' => 'nullable|string|max:255',
        ]);

        $profile->update($validated);

        return redirect()->route('buyer.dashboard')
            ->with('success', 'Profile updated successfully.');
    }

    /**
     * Display all animals for buyers (read-only view).
     */
    public function animals(Request $request): Response
    {
        $user = $request->user('livestock');
        
        // Only allow buyers (users with buyer profile)
        if (!$user->buyerProfile) {
            return redirect()->route('home');
        }

        $perPage = (int) $request->get('per_page', 12);
        $page = (int) $request->get('page', 1);
        $search = $request->get('search', '');
        $status = $request->get('status', '');

        // Get all animals that the buyer owns (both purchased and originally owned)
        $query = LivestockAnimal::where('current_owner_livestock_user_id', $user->id)
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
                  ->orWhere('color_markings', 'LIKE', "%{$search}%")
                  ->orWhere('species', 'LIKE', "%{$search}%");
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

        // Calculate stats (for purchased animals, don't count "sold" status - they're available to the buyer)
        $stats = [
            'total' => LivestockAnimal::where('current_owner_livestock_user_id', $user->id)->count(),
            'available' => LivestockAnimal::where('current_owner_livestock_user_id', $user->id)
                ->where(function($query) {
                    $query->where('status', 'available')
                          ->orWhere(function($q) {
                              // Count purchased animals with "sold" status as "available"
                              $q->where('status', 'sold')
                                ->whereColumn('livestock_user_id', '!=', 'current_owner_livestock_user_id');
                          });
                })
                ->count(),
            'sold' => LivestockAnimal::where('current_owner_livestock_user_id', $user->id)
                ->where('status', 'sold')
                ->whereColumn('livestock_user_id', '=', 'current_owner_livestock_user_id') // Only count if originally owned
                ->count(),
            'off_farm' => LivestockAnimal::where('current_owner_livestock_user_id', $user->id)
                ->where('status', 'off_farm')
                ->count(),
            'deceased' => LivestockAnimal::where('current_owner_livestock_user_id', $user->id)
                ->where('status', 'deceased')
                ->count(),
        ];

        return Inertia::render('Livestock/Buyer/Animals', [
            'animals' => $animals,
            'stats' => $stats,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'per_page' => $perPage,
                'page' => $page,
            ],
        ]);
    }

    /**
     * Display buyer payout requests (payouts where buyer needs to confirm payment).
     */
    public function payouts(Request $request): Response
    {
        $user = $request->user('livestock');
        
        // Only allow buyers (users with buyer profile)
        if (!$user->buyerProfile) {
            return redirect()->route('home');
        }

        $perPage = (int) $request->get('per_page', 12);
        $page = (int) $request->get('page', 1);
        $status = $request->get('status', '');

        // Get payouts where this buyer purchased the animal
        // Check via metadata buyer_id or by joining with listings and animals
        $query = LivestockPayout::where(function($q) use ($user) {
                // Method 1: Check metadata for buyer_id (using JSON path)
                $q->whereRaw('JSON_EXTRACT(metadata, "$.buyer_id") = ?', [$user->id])
                  // Method 2: Check via listing reference and animal ownership
                  ->orWhere(function($subQuery) use ($user) {
                      $subQuery->where('reference_model', 'App\Models\LivestockListing')
                          ->whereExists(function($existsQuery) use ($user) {
                              $existsQuery->select(DB::raw(1))
                                  ->from('livestock_listings')
                                  ->whereColumn('livestock_listings.id', 'livestock_payouts.reference_id')
                                  ->whereExists(function($animalQuery) use ($user) {
                                      $animalQuery->select(DB::raw(1))
                                          ->from('livestock_animals')
                                          ->whereColumn('livestock_animals.id', 'livestock_listings.animal_id')
                                          ->where('livestock_animals.current_owner_livestock_user_id', $user->id)
                                          ->where('livestock_animals.livestock_user_id', '!=', $user->id);
                                  });
                          });
                  });
            })
            ->with(['livestockUser']);

        if ($status) {
            $query->where('status', $status);
        }

        $payouts = $query->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page)
            ->withQueryString();

        // Transform payouts to include listing and animal info
        $payouts->through(function ($payout) {
            $reference = $payout->reference();
            $listing = null;
            $animal = null;
            
            if ($reference && $reference instanceof \App\Models\LivestockListing) {
                $reference->load(['animal.photos', 'seller']);
                $listing = $reference;
                $animal = $reference->animal;
            }
            
            $metadata = $payout->metadata ?? [];
            
            return [
                'id' => $payout->id,
                'amount' => $payout->amount,
                'currency' => $payout->currency,
                'status' => $payout->status,
                'created_at' => $payout->created_at,
                'paid_at' => $payout->paid_at,
                'notes' => $payout->notes,
                'buyer_confirmation' => $metadata['buyer_confirmation'] ?? null,
                'buyer_confirmation_notes' => $metadata['buyer_confirmation_notes'] ?? null,
                'buyer_confirmed_at' => $metadata['buyer_confirmed_at'] ?? null,
                'seller' => $payout->livestockUser ? [
                    'id' => $payout->livestockUser->id,
                    'name' => $payout->livestockUser->name,
                    'email' => $payout->livestockUser->email,
                ] : null,
                'listing' => $listing ? [
                    'id' => $listing->id,
                    'title' => $listing->title,
                    'price' => $listing->price,
                ] : null,
                'animal' => $animal ? [
                    'id' => $animal->id,
                    'species' => $animal->species,
                    'breed' => $animal->breed,
                    'ear_tag' => $animal->ear_tag,
                    'primary_photo' => $animal->photos->first() ? [
                        'url' => $animal->photos->first()->url
                    ] : null,
                ] : null,
            ];
        });

        // Get stats using the same query logic
        $baseQueryCallback = function($q) use ($user) {
            $q->where(function($subQ) use ($user) {
                $subQ->whereRaw('JSON_EXTRACT(metadata, "$.buyer_id") = ?', [$user->id])
                    ->orWhere(function($existsQ) use ($user) {
                        $existsQ->where('reference_model', 'App\Models\LivestockListing')
                            ->whereExists(function($listingQuery) use ($user) {
                                $listingQuery->select(DB::raw(1))
                                    ->from('livestock_listings')
                                    ->whereColumn('livestock_listings.id', 'livestock_payouts.reference_id')
                                    ->whereExists(function($animalQuery) use ($user) {
                                        $animalQuery->select(DB::raw(1))
                                            ->from('livestock_animals')
                                            ->whereColumn('livestock_animals.id', 'livestock_listings.animal_id')
                                            ->where('livestock_animals.current_owner_livestock_user_id', $user->id)
                                            ->where('livestock_animals.livestock_user_id', '!=', $user->id);
                                    });
                            });
                    });
            });
        };

        $stats = [
            'total' => LivestockPayout::where($baseQueryCallback)->count(),
            'pending_confirmation' => LivestockPayout::where($baseQueryCallback)
                ->where('status', 'pending')
                ->where(function($query) {
                    $query->whereNull('metadata->buyer_confirmation')
                        ->orWhere('metadata->buyer_confirmation', '!=', 'confirmed');
                })
                ->count(),
            'confirmed' => LivestockPayout::where($baseQueryCallback)
                ->where('metadata->buyer_confirmation', 'confirmed')
                ->count(),
            'paid' => LivestockPayout::where($baseQueryCallback)
                ->where('status', 'paid')
                ->count(),
        ];

        return Inertia::render('Livestock/Buyer/Payouts', [
            'payouts' => $payouts,
            'stats' => $stats,
            'filters' => [
                'status' => $status,
                'per_page' => $perPage,
                'page' => $page,
            ],
        ]);
    }

    /**
     * Confirm payment after inspection.
     */
    public function confirmPayment(Request $request, $id)
    {
        $user = $request->user('livestock');
        
        if (!$user->buyerProfile) {
            return redirect()->route('home');
        }

        $validated = $request->validate([
            'notes' => 'nullable|string|max:1000',
        ]);

        // Get payout and verify it's for a purchase by this buyer
        $payout = LivestockPayout::where(function($q) use ($user) {
                $q->whereRaw('JSON_EXTRACT(metadata, "$.buyer_id") = ?', [$user->id])
                  ->orWhere(function($subQuery) use ($user) {
                      $subQuery->where('reference_model', 'App\Models\LivestockListing')
                          ->whereExists(function($existsQuery) use ($user) {
                              $existsQuery->select(DB::raw(1))
                                  ->from('livestock_listings')
                                  ->whereColumn('livestock_listings.id', 'livestock_payouts.reference_id')
                                  ->whereExists(function($animalQuery) use ($user) {
                                      $animalQuery->select(DB::raw(1))
                                          ->from('livestock_animals')
                                          ->whereColumn('livestock_animals.id', 'livestock_listings.animal_id')
                                          ->where('livestock_animals.current_owner_livestock_user_id', $user->id)
                                          ->where('livestock_animals.livestock_user_id', '!=', $user->id);
                                  });
                          });
                  });
            })
            ->findOrFail($id);

        // Update payout metadata with buyer confirmation
        $metadata = $payout->metadata ?? [];
        $metadata['buyer_confirmation'] = 'confirmed';
        $metadata['buyer_confirmation_notes'] = $validated['notes'] ?? null;
        $metadata['buyer_confirmed_at'] = now()->toIso8601String();

        $payout->update([
            'metadata' => $metadata,
        ]);

        return redirect()->route('buyer.payouts')
            ->with('success', 'Payment confirmed successfully. Seller will receive payout.');
    }
}
