<?php

namespace App\Http\Controllers\Livestock;

use App\Http\Controllers\BaseController;
use App\Models\LivestockListing;
use App\Models\LivestockAnimal;
use App\Models\OwnershipHistory;
use App\Models\LivestockPayout;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Cashier;

class MarketplaceController extends BaseController
{
    /**
     * Display the marketplace.
     */
    public function index(Request $request): Response
    {
        $perPage = (int) $request->get('per_page', 12);
        $page = (int) $request->get('page', 1);
        $search = $request->get('search', '');
        $species = $request->get('species', '');
        $breed = $request->get('breed', '');
        $minPrice = $request->get('min_price', '');
        $maxPrice = $request->get('max_price', '');
        $location = $request->get('location', '');

        $query = LivestockListing::with([
            'animal' => function($q) {
                $q->with(['primaryPhoto', 'seller', 'currentOwner']);
            },
            'seller'
        ])->where('status', 'active');

        // Apply filters
        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('title', 'LIKE', "%{$search}%")
                  ->orWhere('description', 'LIKE', "%{$search}%")
                  ->orWhereHas('animal', function($animalQuery) use ($search) {
                      $animalQuery->where('breed', 'LIKE', "%{$search}%")
                                  ->orWhere('ear_tag', 'LIKE', "%{$search}%");
                  });
            });
        }

        if ($species) {
            $query->whereHas('animal', function($q) use ($species) {
                $q->where('species', $species);
            });
        }

        if ($breed) {
            $query->whereHas('animal', function($q) use ($breed) {
                $q->where('breed', 'LIKE', "%{$breed}%");
            });
        }

        if ($minPrice) {
            $query->where('price', '>=', $minPrice);
        }

        if ($maxPrice) {
            $query->where('price', '<=', $maxPrice);
        }

        if ($location) {
            $query->whereHas('animal', function($q) use ($location) {
                $q->where('location', 'LIKE', "%{$location}%");
            });
        }

        $listings = $query->orderBy('listed_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page)
            ->withQueryString();

        // Get unique species and breeds for filters
        $speciesList = LivestockAnimal::distinct()->pluck('species')->filter();
        $breedsList = LivestockAnimal::distinct()->pluck('breed')->filter();
        $locationsList = LivestockAnimal::distinct()->pluck('location')->filter();

        return Inertia::render('Livestock/Marketplace/Index', [
            'listings' => $listings,
            'filters' => [
                'search' => $search,
                'species' => $species,
                'breed' => $breed,
                'min_price' => $minPrice,
                'max_price' => $maxPrice,
                'location' => $location,
                'per_page' => $perPage,
                'page' => $page,
            ],
            'speciesList' => $speciesList,
            'breedsList' => $breedsList,
            'locationsList' => $locationsList,
        ]);
    }

    /**
     * Show a single animal listing.
     */
public function show(Request $request, $id): Response
    {
        // Allow viewing both active and sold listings (for viewing from animal details page)
        $listing = LivestockListing::with([
            'animal' => function($q) {
                $q->with([
                    'photos',
                    'healthRecords' => function($healthQuery) {
                        $healthQuery->orderBy('record_date', 'desc')->limit(5);
                    },
                    'parentLink.father',
                    'parentLink.mother',
                    'seller',
                    'currentOwner',
                    'ownershipHistory.previousOwner',
                    'ownershipHistory.newOwner',
                ]);
            },
            'seller'
        ])->whereIn('status', ['active', 'sold'])->findOrFail($id);

        return Inertia::render('Livestock/Marketplace/Show', [
            'listing' => $listing,
        ]);
    }

    /**
     * Create Stripe checkout session for animal purchase.
     */
    public function checkout(Request $request, $id)
    {
        $user = $request->user('livestock');
        
        if (!$user) {
            return redirect()->route('livestock.login')
                ->with('error', 'Please login to purchase an animal.');
        }

        // Only buyers can purchase animals
        if (!$user->buyerProfile) {
            return back()->withErrors(['error' => 'Only buyers can purchase animals. Please create a buyer profile first.']);
        }

        $listing = LivestockListing::with(['animal', 'seller'])
            ->where('status', 'active')
            ->findOrFail($id);

        // Check if user is trying to purchase their own listing
        if ($listing->livestock_user_id === $user->id) {
            return back()->withErrors(['error' => 'You cannot purchase your own listing.']);
        }

        // Check if user already owns this animal
        if ($listing->animal->current_owner_livestock_user_id === $user->id) {
            return back()->withErrors(['error' => 'You already own this animal.']);
        }

        try {
            // Calculate amount in cents
            $amountInCents = (int) ($listing->price * 100);
            $currency = strtolower($listing->currency ?? 'usd');

            // Create checkout session
            $checkout = $user->checkoutCharge(
                $amountInCents,
                "Purchase: {$listing->title} - {$listing->animal->breed}",
                1,
                [
                    'success_url' => route('marketplace.purchase.success') . '?session_id={CHECKOUT_SESSION_ID}&listing_id=' . $listing->id,
                    'cancel_url' => route('marketplace.purchase.cancel') . '?listing_id=' . $listing->id,
                    'metadata' => [
                        'user_id' => $user->id,
                        'listing_id' => $listing->id,
                        'animal_id' => $listing->animal_id,
                        'seller_id' => $listing->livestock_user_id,
                        'price' => $listing->price,
                        'currency' => $currency,
                        'type' => 'animal_purchase',
                    ],
                    'payment_method_types' => ['card'],
                ]
            );

            // Return Inertia redirect to Stripe checkout
            return Inertia::location($checkout->url);
            
        } catch (\Exception $e) {
            Log::error('Animal purchase checkout error', [
                'error' => $e->getMessage(),
                'user_id' => $user->id,
                'listing_id' => $id,
                'trace' => $e->getTraceAsString(),
            ]);
            
            return back()->withErrors([
                'error' => 'Failed to create checkout session. Please try again.',
            ]);
        }
    }

    /**
     * Handle successful payment and complete purchase.
     */
    public function purchaseSuccess(Request $request)
    {
        try {
            $sessionId = $request->query('session_id');
            $listingId = $request->query('listing_id');
            
            if (!$sessionId || !$listingId) {
                return redirect()->route('marketplace.index')
                    ->with('error', 'Invalid session. Please try again.');
            }

            $user = $request->user('livestock');
            
            if (!$user) {
                return redirect()->route('livestock.login')
                    ->with('error', 'Please login to complete purchase.');
            }

            // Retrieve the checkout session from Stripe
            $session = Cashier::stripe()->checkout->sessions->retrieve($sessionId);
            
            if ($session->payment_status !== 'paid') {
                return redirect()->route('marketplace.show', $listingId)
                    ->with('error', 'Payment was not completed.');
            }

            // Verify metadata matches
            $metadata = $session->metadata ?? [];
            if (empty($metadata->listing_id) || $metadata->listing_id != $listingId) {
                return redirect()->route('marketplace.index')
                    ->with('error', 'Invalid purchase session.');
            }

            // Verify user matches
            if (empty($metadata->user_id) || $metadata->user_id != $user->id) {
                return redirect()->route('marketplace.index')
                    ->with('error', 'Invalid user for this purchase.');
            }

            // Get listing
            $listing = LivestockListing::with(['animal', 'seller'])
                ->where('status', 'active')
                ->findOrFail($listingId);

            // Verify listing is still available
            if ($listing->status !== 'active') {
                return redirect()->route('marketplace.show', $listingId)
                    ->with('error', 'This listing is no longer available.');
            }

            // Start transaction
            DB::beginTransaction();
            try {
                // Update listing
                $listing->markAsSold();

                // Transfer ownership and preserve original ear tag
                $listing->animal->update([
                    'current_owner_livestock_user_id' => $user->id,
                    'status' => 'sold',
                    'original_ear_tag' => $listing->animal->ear_tag, // Preserve seller's tag
                ]);

                // Create ownership history
                OwnershipHistory::create([
                    'animal_id' => $listing->animal_id,
                    'previous_owner_id' => $listing->livestock_user_id,
                    'new_owner_id' => $user->id,
                    'transfer_date' => now(),
                    'method' => 'sale',
                    'notes' => "Purchased from marketplace listing #{$listing->id}",
                ]);

                // Get buyer profile for drop-off address
                $buyerProfile = $user->buyerProfile;
                $buyerAddress = null;
                if ($buyerProfile) {
                    $buyerAddress = [
                        'farm_name' => $buyerProfile->farm_name,
                        'address' => $buyerProfile->address,
                        'city' => $buyerProfile->city,
                        'state' => $buyerProfile->state,
                        'zip_code' => $buyerProfile->zip_code,
                        'country' => $buyerProfile->country,
                        'phone' => $buyerProfile->phone,
                        'email' => $buyerProfile->email,
                    ];
                }

                // Create payout for seller
                LivestockPayout::create([
                    'livestock_user_id' => $listing->livestock_user_id,
                    'amount' => $listing->price,
                    'currency' => $listing->currency ?? 'USD',
                    'payout_type' => 'animal_sale',
                    'reference_model' => 'App\Models\LivestockListing',
                    'reference_id' => $listing->id,
                    'status' => 'pending',
                    'metadata' => [
                        'stripe_session_id' => $sessionId,
                        'stripe_payment_intent' => $session->payment_intent,
                        'purchase_date' => now()->toIso8601String(),
                        'buyer_id' => $user->id,
                        'buyer_name' => $user->name,
                        'buyer_email' => $user->email,
                        'buyer_address' => $buyerAddress,
                        'buyer_confirmation' => null, // Will be set when buyer confirms after inspection
                        'buyer_confirmation_notes' => null,
                        'buyer_confirmed_at' => null,
                    ],
                ]);

                DB::commit();

                Log::info('Animal purchased successfully', [
                    'user_id' => $user->id,
                    'listing_id' => $listingId,
                    'animal_id' => $listing->animal_id,
                    'amount' => $listing->price,
                    'session_id' => $sessionId,
                ]);

                return redirect()->route('animals.show', $listing->animal_id)
                    ->with('success', 'Animal purchased successfully! You are now the owner.');
                    
            } catch (\Exception $e) {
                DB::rollBack();
                Log::error('Animal purchase processing error', [
                    'error' => $e->getMessage(),
                    'user_id' => $user->id,
                    'listing_id' => $listingId,
                    'session_id' => $sessionId,
                ]);
                
                return redirect()->route('marketplace.show', $listingId)
                    ->with('error', 'Purchase processing failed. Please contact support.');
            }
            
        } catch (\Exception $e) {
            Log::error('Animal purchase success handler error', [
                'error' => $e->getMessage(),
                'session_id' => $request->query('session_id'),
                'listing_id' => $request->query('listing_id'),
            ]);
            
            return redirect()->route('marketplace.index')
                ->with('error', 'Error processing payment. Please contact support.');
        }
    }

    /**
     * Handle cancelled payment.
     */
    public function purchaseCancel(Request $request)
    {
        $listingId = $request->query('listing_id');
        
        if ($listingId) {
            return redirect()->route('marketplace.show', $listingId)
                ->with('info', 'Purchase was cancelled. You can try again anytime.');
        }
        
        return redirect()->route('marketplace.index')
            ->with('info', 'Purchase was cancelled.');
    }
}
