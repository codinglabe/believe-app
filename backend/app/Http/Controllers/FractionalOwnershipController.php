<?php

namespace App\Http\Controllers;

use App\Models\FractionalOffering;
use App\Models\FractionalAsset;
use App\Models\FractionalOrder;
use App\Models\FractionalListing;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Laravel\Cashier\Cashier;

class FractionalOwnershipController extends Controller
{
    public function index(Request $request)
    {
        $query = FractionalOffering::with('asset')
            ->where('status', 'live')
            ->orderBy('created_at', 'desc');

        // Search functionality
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('summary', 'like', "%{$search}%")
                  ->orWhereHas('asset', function ($assetQuery) use ($search) {
                      $assetQuery->where('name', 'like', "%{$search}%")
                                 ->orWhere('type', 'like', "%{$search}%");
                  });
            });
        }

        // Filter by asset type
        if ($request->has('asset_type') && $request->asset_type) {
            $query->whereHas('asset', function ($q) use ($request) {
                $q->where('type', $request->asset_type);
            });
        }

        $offerings = $query->paginate(12);

        // Get unique asset types for filter
        $assetTypes = FractionalAsset::distinct()
            ->whereNotNull('type')
            ->pluck('type')
            ->sort()
            ->values();

        return Inertia::render('frontend/fractional/Index', [
            'offerings' => $offerings,
            'assetTypes' => $assetTypes,
            'filters' => [
                'search' => $request->search,
                'asset_type' => $request->asset_type,
            ],
        ]);
    }

    public function myPurchases(Request $request)
    {
        $user = Auth::user();

        $query = FractionalOrder::with(['offering.asset'])
            ->where('user_id', $user->id)
            ->where('status', 'paid')
            ->orderBy('paid_at', 'desc');

        // Search functionality
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                  ->orWhere('tag_number', 'like', "%{$search}%")
                  ->orWhereHas('offering', function ($offeringQuery) use ($search) {
                      $offeringQuery->where('title', 'like', "%{$search}%")
                                    ->orWhereHas('asset', function ($assetQuery) use ($search) {
                                        $assetQuery->where('name', 'like', "%{$search}%");
                                    });
                  });
            });
        }

        $orders = $query->paginate(12);

        // Calculate stats
        $totalInvested = FractionalOrder::where('user_id', $user->id)
            ->where('status', 'paid')
            ->sum('amount');

        $totalOrders = FractionalOrder::where('user_id', $user->id)
            ->where('status', 'paid')
            ->count();

        $totalShares = FractionalOrder::where('user_id', $user->id)
            ->where('status', 'paid')
            ->get()
            ->sum(function ($order) {
                $meta = $order->meta ?? [];
                return $meta['full_shares'] ?? $order->shares ?? 0;
            });

        $totalTokens = FractionalOrder::where('user_id', $user->id)
            ->where('status', 'paid')
            ->sum('tokens');

        return Inertia::render('frontend/user-profile/fractional-ownership', [
            'orders' => $orders,
            'stats' => [
                'total_invested' => $totalInvested,
                'total_orders' => $totalOrders,
                'total_shares' => $totalShares,
                'total_tokens' => $totalTokens,
            ],
            'filters' => [
                'search' => $request->search,
            ],
        ]);
    }

    public function show(FractionalOffering $offering)
    {
        $offering->load('asset');

        // Only show live offerings to public
        if ($offering->status !== 'live') {
            abort(404);
        }

        return Inertia::render('frontend/fractional/Show', [
            'offering' => $offering,
        ]);
    }

    public function purchase(Request $request, FractionalOffering $offering)
    {
        $request->validate([
            'amount' => ['required', 'numeric', 'min:' . ($offering->token_price ?? $offering->price_per_share)],
        ]);

        if (!Auth::check()) {
            return redirect()->route('login')->with('error', 'Please login to purchase.');
        }

        $tokenPrice = $offering->token_price ?? $offering->price_per_share;
        $costPerShare = $offering->price_per_share;
        $amountInvested = $request->amount;

        // Calculate full shares and tokens from amount invested
        $fullShares = $costPerShare > 0 ? floor($amountInvested / $costPerShare) : 0;
        $remainingAmount = $costPerShare > 0 ? $amountInvested % $costPerShare : $amountInvested;
        $tokens = $tokenPrice > 0 ? floor($remainingAmount / $tokenPrice) : 0;

        if ($fullShares <= 0 && $tokens <= 0) {
            return back()->with('error', 'Amount is too low. Minimum purchase is ' . $offering->currency . ' ' . number_format($tokenPrice, 2));
        }

        // Check available shares and tokens
        $tokensPerShare = $offering->tokens_per_share;
        $totalTokensNeeded = ($fullShares * $tokensPerShare) + $tokens;

        DB::beginTransaction();
        try {
            $user = Auth::user();
            
            // Load the asset to check its type
            $offering->load('asset');
            
            // For livestock assets, allow continuous selling
            // Tag numbers will be auto-generated even if no listings exist
            // No validation needed - system will handle tag generation automatically
            
            /**
             * Sequential Tag Selling Logic
             * 
             * For livestock/animal assets (goat, livestock, etc.):
             * - Each tag (ZM-001, ZM-002, etc.) must be sold completely before moving to the next
             * - Tokens are allocated sequentially: complete partial tags first, then new full shares, then remaining tokens
             * - Example: If ZM-001 has 1 token sold and someone invests $85 (1 share + 2 tokens):
             *   - ZM-001 gets 2 tokens (now has 3 tokens total)
             *   - ZM-002 gets 1 full share
             */
            $isLivestockAsset = false;
            $orderIds = [];
            $orderCounter = 0; // Counter to ensure unique order numbers within same purchase
            
            if ($offering->asset) {
                $isLivestockAsset = $offering->asset->isLivestockAsset();
                
                if ($isLivestockAsset) {
                    // Get all active fractional listings for this asset, ordered by creation
                    // Note: This can be empty - tag numbers will be auto-generated if no listings exist
                    $listings = FractionalListing::where('fractional_asset_id', $offering->asset_id)
                        ->where('status', 'active')
                        ->orderBy('id', 'asc')
                        ->get();
                    
                    // Get country code from buyer's farm country (buyer profile)
                    // Priority: 1. Buyer profile country, 2. Existing listings, 3. Default 'ZM'
                    $countryCode = null;
                    
                    // First, try to get from buyer's profile (farm country code)
                    $mainUser = Auth::user();
                    if ($mainUser && method_exists($mainUser, 'livestockUser') && $mainUser->livestockUser) {
                        $livestockUser = $mainUser->livestockUser;
                        if ($livestockUser->buyerProfile && $livestockUser->buyerProfile->country) {
                            // Get country code from buyer profile
                            // The country field stores the country code (2-letter ISO code)
                            $countryCode = strtoupper($livestockUser->buyerProfile->country);
                            
                            // If it's a full country name, try to get the code from countries table
                            if (strlen($countryCode) > 2) {
                                $country = \App\Models\Country::where('name', $livestockUser->buyerProfile->country)
                                    ->orWhere('code', $livestockUser->buyerProfile->country)
                                    ->where('is_active', true)
                                    ->first();
                                if ($country) {
                                    $countryCode = strtoupper($country->code);
                                }
                            }
                        }
                    }
                    
                    // If not found in buyer profile, try existing listings
                    if (!$countryCode && $listings->isNotEmpty()) {
                        $countryCode = $listings->first()->country_code;
                    }
                    
                    // If still not found, try buyer's existing listings for this asset
                    if (!$countryCode && $mainUser && method_exists($mainUser, 'livestockUser') && $mainUser->livestockUser) {
                        $livestockUser = $mainUser->livestockUser;
                        $buyerListing = FractionalListing::where('livestock_user_id', $livestockUser->id)
                            ->where('fractional_asset_id', $offering->asset_id)
                            ->whereNotNull('country_code')
                            ->first();
                        if ($buyerListing) {
                            $countryCode = $buyerListing->country_code;
                        }
                    }
                    
                    // Default to 'ZM' if no country code found
                    if (!$countryCode) {
                        $countryCode = 'ZM';
                    }
                    
                    // Helper function to get or create a pre-generated tag
                    $getOrCreatePreGeneratedTag = function($countryCode, $fractionalAssetId) {
                        // First, try to get an available pre-generated tag
                        $preGeneratedTag = \App\Models\PreGeneratedTag::where('country_code', strtoupper($countryCode))
                            ->where('status', 'available')
                            ->where(function($query) use ($fractionalAssetId) {
                                $query->whereNull('fractional_asset_id')
                                      ->orWhere('fractional_asset_id', $fractionalAssetId);
                            })
                            ->orderBy('created_at', 'asc')
                            ->first();
                        
                        if ($preGeneratedTag) {
                            // Mark as assigned
                            $preGeneratedTag->update([
                                'status' => 'assigned',
                                'fractional_asset_id' => $fractionalAssetId,
                            ]);
                            return $preGeneratedTag->tag_number;
                        }
                        
                        // If no pre-generated tag available, generate one (fallback)
                        // Get all existing tag numbers for this asset and country code
                        $existingTags = FractionalListing::where('fractional_asset_id', $fractionalAssetId)
                            ->where('country_code', $countryCode)
                            ->whereNotNull('tag_number')
                            ->pluck('tag_number')
                            ->toArray();
                        
                        // Also check pre-generated tags
                        $preGeneratedTags = \App\Models\PreGeneratedTag::where('country_code', strtoupper($countryCode))
                            ->pluck('tag_number')
                            ->toArray();
                        
                        $allTags = array_merge($existingTags, $preGeneratedTags);
                        
                        // Extract numbers from existing tags (e.g., "ZM-001" -> 1)
                        $existingNumbers = [];
                        foreach ($allTags as $tag) {
                            if (preg_match('/^' . preg_quote($countryCode, '/') . '-(\d+)$/i', $tag, $matches)) {
                                $existingNumbers[] = (int)$matches[1];
                            }
                        }
                        
                        // Find the next available number
                        $nextNumber = 1;
                        if (!empty($existingNumbers)) {
                            $maxNumber = max($existingNumbers);
                            $nextNumber = $maxNumber + 1;
                        }
                        
                        // Generate tag number with zero-padding (e.g., ZM-001, ZM-002)
                        $tagNumber = strtoupper($countryCode) . '-' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);
                        
                        // Double-check uniqueness (in case of race condition)
                        $attempts = 0;
                        while ((FractionalListing::where('tag_number', $tagNumber)->exists() || 
                                \App\Models\PreGeneratedTag::where('tag_number', $tagNumber)->exists()) && 
                                $attempts < 100) {
                            $nextNumber++;
                            $tagNumber = strtoupper($countryCode) . '-' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);
                            $attempts++;
                        }
                        
                        // Automatically insert the generated tag into pre_generated_tags table
                        // livestock_animal_id is null because this is for continuous selling (not assigned to a specific animal)
                        \App\Models\PreGeneratedTag::create([
                            'country_code' => strtoupper($countryCode),
                            'tag_number' => $tagNumber,
                            'fractional_asset_id' => $fractionalAssetId,
                            'livestock_animal_id' => null, // Null because it's for continuous selling
                            'status' => 'assigned', // Mark as assigned since it's being used
                        ]);
                        
                        \Log::info('Auto-created pre-generated tag', [
                            'tag_number' => $tagNumber,
                            'country_code' => strtoupper($countryCode),
                            'fractional_asset_id' => $fractionalAssetId,
                            'status' => 'assigned',
                        ]);
                        
                        return $tagNumber;
                    };
                    
                    // Helper function to get or create a listing for a tag number
                    $getOrCreateListing = function($tagNumber, $countryCode, $fractionalAssetId) use ($offering, $user) {
                        $listing = FractionalListing::where('fractional_asset_id', $fractionalAssetId)
                            ->where('tag_number', $tagNumber)
                            ->where('status', 'active')
                            ->first();
                        
                        if (!$listing) {
                            // For auto-generated tags (continuous selling), livestock_animal_id should be null
                            // Only set it if this is the first listing for this asset
                            $fractionalAsset = FractionalAsset::find($fractionalAssetId);
                            $livestockAnimalId = null;
                            
                            // Check if this is the first listing for this asset
                            $hasExistingListing = FractionalListing::where('fractional_asset_id', $fractionalAssetId)
                                ->exists();
                            
                            // Only set livestock_animal_id for the first listing, null for subsequent ones (continuous selling)
                            if (!$hasExistingListing) {
                                if ($fractionalAsset && $fractionalAsset->meta) {
                                    $livestockAnimalId = $fractionalAsset->meta['livestock_animal_id'] ?? null;
                                }
                                
                                // If no livestock_animal_id in meta, try to get from existing listings
                                if (!$livestockAnimalId) {
                                    $existingListing = FractionalListing::where('fractional_asset_id', $fractionalAssetId)
                                        ->whereNotNull('livestock_animal_id')
                                        ->first();
                                    if ($existingListing) {
                                        $livestockAnimalId = $existingListing->livestock_animal_id;
                                    }
                                }
                            }
                            // For subsequent listings (continuous selling), livestock_animal_id remains null
                            
                            // Get user for livestock_user_id - ALWAYS use the authenticated buyer making the purchase
                            $livestockUserId = null;
                            
                            // First priority: Get from authenticated user (the buyer making the purchase)
                            if ($user && method_exists($user, 'livestockUser') && $user->livestockUser) {
                                $livestockUserId = $user->livestockUser->id;
                            }
                            
                            // Fallback: Try to get from existing listings for this asset
                            if (!$livestockUserId) {
                                $existingListing = FractionalListing::where('fractional_asset_id', $fractionalAssetId)
                                    ->whereNotNull('livestock_user_id')
                                    ->first();
                                
                                if ($existingListing) {
                                    $livestockUserId = $existingListing->livestock_user_id;
                                }
                            }
                            
                            // If still null, this is an error - buyer must have a livestock user account
                            if (!$livestockUserId) {
                                Log::error("Cannot create fractional listing: buyer has no livestock_user_id", [
                                    'user_id' => $user ? $user->id : null,
                                    'fractional_asset_id' => $fractionalAssetId,
                                    'tag_number' => $tagNumber,
                                ]);
                                throw new \Exception('Buyer account is not properly set up. Please contact support.');
                            }
                            
                            // Allow livestock_animal_id to be null - it can be assigned later
                            // This allows tag generation even when no listings exist and no animal is assigned yet
                            
                            // Create new listing
                            // livestock_animal_id can be null - will be assigned later via pre-generated tags dashboard
                            $listing = FractionalListing::create([
                                'livestock_animal_id' => $livestockAnimalId, // Can be null - will be assigned later
                                'fractional_asset_id' => $fractionalAssetId,
                                'livestock_user_id' => $livestockUserId, // Must always be set
                                'country_code' => $countryCode,
                                'tag_number' => $tagNumber,
                                'status' => 'active',
                            ]);
                            
                            Log::info("Auto-created new fractional listing", [
                                'tag_number' => $tagNumber,
                                'country_code' => $countryCode,
                                'fractional_asset_id' => $fractionalAssetId,
                                'livestock_animal_id' => $livestockAnimalId,
                                'livestock_user_id' => $livestockUserId,
                            ]);
                        }
                        
                        return $listing;
                    };
                    
                    // Generate base order number once
                    $baseOrderNumber = $this->generateOrderNumber();
                    
                    // Calculate how many tokens we need to allocate
                    $remainingFullShares = $fullShares;
                    $remainingPartialTokens = $tokens;
                    $allTagNumbers = []; // Collect all tag numbers for this purchase
                    $tagAllocations = []; // Track token allocations per tag: ['ZM-001' => 2, 'ZM-002' => 10]
                    
                    // Helper function to get tokens sold for a tag (from database)
                    $getTokensSoldForTag = function($listing) use ($offering) {
                        // Check both: orders with this tag_number directly, AND orders with this tag in tag_allocations meta
                        $tokensSoldDirect = FractionalOrder::where('offering_id', $offering->id)
                            ->where('status', 'paid')
                            ->where('tag_number', $listing->tag_number)
                            ->sum('tokens');
                        
                        // Also check tag_allocations in meta for orders that have multiple tags
                        $tokensSoldFromMeta = FractionalOrder::where('offering_id', $offering->id)
                            ->where('status', 'paid')
                            ->whereNotNull('meta')
                            ->get()
                            ->sum(function ($order) use ($listing) {
                                $meta = $order->meta ?? [];
                                $tagAllocs = $meta['tag_allocations'] ?? [];
                                return $tagAllocs[$listing->tag_number] ?? 0;
                            });
                        
                        return $tokensSoldDirect + $tokensSoldFromMeta;
                    };
                    
                    // Helper function to get total tokens for a tag (database + current allocations)
                    $getTotalTokensForTag = function($listing) use ($getTokensSoldForTag, &$tagAllocations) {
                        $tokensFromDatabase = $getTokensSoldForTag($listing);
                        $tokensFromCurrentAllocation = $tagAllocations[$listing->tag_number] ?? 0;
                        return $tokensFromDatabase + $tokensFromCurrentAllocation;
                    };
                    
                    // Step 1: FIRST, fill ALL tags with leftover tokens (tags with tokens > 0 and < tokensPerShare)
                    // This ensures we fill up existing tags with leftover tokens BEFORE creating new tags
                    // This MUST happen before allocating full shares or creating new tags
                    // If no listings exist, we'll create tags in Step 1b, Step 2, or Step 3
                    if ($remainingPartialTokens > 0) {
                        // First pass: Fill ALL tags with leftover tokens (loop multiple times to fill all)
                        $filledAny = true;
                        while ($remainingPartialTokens > 0 && $filledAny) {
                            $filledAny = false;
                            
                            foreach ($listings as $listing) {
                                if ($remainingPartialTokens <= 0) break;
                                
                                $tokensSoldForTag = $getTokensSoldForTag($listing);
                                $totalTokensForTag = $getTotalTokensForTag($listing);
                                
                                // Check if this tag has leftover tokens (tokens sold > 0 but < tokensPerShare)
                                // This means the tag is partially sold and has space for more tokens
                                $hasLeftoverTokens = $totalTokensForTag > 0 && $totalTokensForTag < $tokensPerShare;
                                
                                if ($hasLeftoverTokens && $remainingPartialTokens > 0) {
                                    // Calculate how many tokens are needed to complete this tag
                                    $tokensNeededToComplete = $tokensPerShare - $totalTokensForTag;
                                    // Allocate as many tokens as possible (up to what's needed or what's available)
                                    $tokensToAllocate = min($tokensNeededToComplete, $remainingPartialTokens);
                                    
                                    if ($tokensToAllocate > 0) {
                                        // Collect tag number and track allocation
                                        if (!in_array($listing->tag_number, $allTagNumbers)) {
                                            $allTagNumbers[] = $listing->tag_number;
                                        }
                                        $tagAllocations[$listing->tag_number] = ($tagAllocations[$listing->tag_number] ?? 0) + $tokensToAllocate;
                                        $remainingPartialTokens -= $tokensToAllocate;
                                        $filledAny = true;
                                        
                                        Log::info("Step 1: Filled leftover tokens in existing tag", [
                                            'tag_number' => $listing->tag_number,
                                            'tokens_allocated' => $tokensToAllocate,
                                            'tokens_sold_before' => $tokensSoldForTag,
                                            'total_tokens_before' => $totalTokensForTag,
                                            'tokens_needed_to_complete' => $tokensNeededToComplete,
                                            'remaining_partial_tokens' => $remainingPartialTokens,
                                        ]);
                                    }
                                }
                            }
                        }
                        
                        // Step 1b: If there are still remaining partial tokens AND no full shares to allocate,
                        // allocate to first available tag (with 0 tokens) or create new tag
                        // If we have full shares, skip this step and let Step 2 allocate full shares first
                        // Then Step 3 will handle remaining partial tokens
                        if ($remainingPartialTokens > 0 && $remainingFullShares == 0) {
                            $allocated = false;
                            
                            // First, try existing listings
                            foreach ($listings as $listing) {
                                if ($remainingPartialTokens <= 0) break;
                                
                                $tokensSoldForTag = $getTokensSoldForTag($listing);
                                
                                // Only allocate to tags with 0 tokens (completely available)
                                if ($tokensSoldForTag == 0 && $remainingPartialTokens > 0) {
                                    $tokensAvailableForTag = $tokensPerShare - $tokensSoldForTag;
                                    $tokensToAllocate = min($tokensAvailableForTag, $remainingPartialTokens);
                                    
                                    // Collect tag number and track allocation
                                    if (!in_array($listing->tag_number, $allTagNumbers)) {
                                        $allTagNumbers[] = $listing->tag_number;
                                    }
                                    $tagAllocations[$listing->tag_number] = ($tagAllocations[$listing->tag_number] ?? 0) + $tokensToAllocate;
                                    $remainingPartialTokens -= $tokensToAllocate;
                                    $allocated = true;
                                    
                                    Log::info("Allocated remaining partial tokens to existing tag", [
                                        'tag_number' => $listing->tag_number,
                                        'tokens_allocated' => $tokensToAllocate,
                                    ]);
                                }
                            }
                            
                            // If we still have partial tokens and no existing tags available, create new one
                            if ($remainingPartialTokens > 0 && !$allocated) {
                                $newTagNumber = $getOrCreatePreGeneratedTag($countryCode, $offering->asset_id);
                                $newListing = $getOrCreateListing($newTagNumber, $countryCode, $offering->asset_id);
                                
                                // If listing creation succeeded, allocate tokens
                                if ($newListing) {
                                    // Add to listings collection
                                    $listings->push($newListing);
                                    
                                    // Allocate to new tag
                                    $tokensToAllocate = min($tokensPerShare, $remainingPartialTokens);
                                    if (!in_array($newListing->tag_number, $allTagNumbers)) {
                                        $allTagNumbers[] = $newListing->tag_number;
                                    }
                                    $tagAllocations[$newListing->tag_number] = ($tagAllocations[$newListing->tag_number] ?? 0) + $tokensToAllocate;
                                    $remainingPartialTokens -= $tokensToAllocate;
                                    
                                    Log::info("Allocated remaining partial tokens to newly created tag", [
                                        'tag_number' => $newListing->tag_number,
                                        'tokens_allocated' => $tokensToAllocate,
                                    ]);
                                } else {
                                    Log::warning("Failed to create fractional listing for tag allocation", [
                                        'tag_number' => $newTagNumber,
                                        'fractional_asset_id' => $offering->asset_id,
                                    ]);
                                }
                            }
                        }
                    }
                    
                    // Step 2: THEN, allocate full shares to tags with 0 tokens (completely new tags)
                    // Full shares go to tags that are completely empty (considering both database AND current allocations)
                    while ($remainingFullShares > 0) {
                        $allocated = false;
                        
                        // First, try existing listings
                        foreach ($listings as $listing) {
                            if ($remainingFullShares <= 0) break;
                            
                            // Check total tokens: database + current allocations in this purchase
                            $totalTokensForTag = $getTotalTokensForTag($listing);
                            
                            // Full share can ONLY go to tags with exactly 0 tokens (completely available)
                            if ($totalTokensForTag == 0 && $remainingFullShares > 0) {
                                // Collect tag number and track allocation
                                if (!in_array($listing->tag_number, $allTagNumbers)) {
                                    $allTagNumbers[] = $listing->tag_number;
                                }
                                $tagAllocations[$listing->tag_number] = ($tagAllocations[$listing->tag_number] ?? 0) + $tokensPerShare;
                                $remainingFullShares--;
                                $allocated = true;
                                
                                Log::info("Allocated full share to existing tag", [
                                    'tag_number' => $listing->tag_number,
                                    'tokens_allocated' => $tokensPerShare,
                                ]);
                            }
                        }
                        
                        // If we still have full shares and no existing tags available, create new ones
                        if ($remainingFullShares > 0 && !$allocated) {
                            $newTagNumber = $getOrCreatePreGeneratedTag($countryCode, $offering->asset_id);
                            $newListing = $getOrCreateListing($newTagNumber, $countryCode, $offering->asset_id);
                            
                            // If listing creation succeeded, allocate tokens
                            if ($newListing) {
                                // Add to listings collection for future iterations
                                $listings->push($newListing);
                                
                                // Allocate to new tag
                                if (!in_array($newListing->tag_number, $allTagNumbers)) {
                                    $allTagNumbers[] = $newListing->tag_number;
                                }
                                $tagAllocations[$newListing->tag_number] = ($tagAllocations[$newListing->tag_number] ?? 0) + $tokensPerShare;
                                $remainingFullShares--;
                                
                                Log::info("Allocated full share to newly created tag", [
                                    'tag_number' => $newListing->tag_number,
                                    'tokens_allocated' => $tokensPerShare,
                                ]);
                            } else {
                                // If listing creation failed, break out of while loop
                                Log::warning("Failed to create fractional listing for tag allocation", [
                                    'tag_number' => $newTagNumber,
                                    'fractional_asset_id' => $offering->asset_id,
                                ]);
                                break;
                            }
                        }
                    }
                    
                    // Step 3: If there are still remaining partial tokens after allocating full shares,
                    // FIRST try to fill ANY remaining partially sold tags (tags with leftover tokens), THEN create new tags if needed
                    // This is critical: we must check for leftover tokens again because Step 2 might have created new tags
                    // that we haven't checked yet, or there might be other tags with leftover tokens
                    if ($remainingPartialTokens > 0) {
                        // First, try to fill ALL partially sold tags that still have leftover tokens
                        // Loop multiple times to ensure we fill all leftover tokens
                        $filledAny = true;
                        while ($remainingPartialTokens > 0 && $filledAny) {
                            $filledAny = false;
                            
                            foreach ($listings as $listing) {
                                if ($remainingPartialTokens <= 0) break;
                                
                                $totalTokensForTag = $getTotalTokensForTag($listing);
                                
                                // Check if this tag has leftover tokens (partially sold but not full)
                                // Leftover tokens = tokens sold > 0 and < tokensPerShare
                                if ($totalTokensForTag > 0 && $totalTokensForTag < $tokensPerShare) {
                                    $tokensNeededToComplete = $tokensPerShare - $totalTokensForTag;
                                    $tokensToAllocate = min($tokensNeededToComplete, $remainingPartialTokens);
                                    
                                    if ($tokensToAllocate > 0) {
                                        // Collect tag number and track allocation
                                        if (!in_array($listing->tag_number, $allTagNumbers)) {
                                            $allTagNumbers[] = $listing->tag_number;
                                        }
                                        $tagAllocations[$listing->tag_number] = ($tagAllocations[$listing->tag_number] ?? 0) + $tokensToAllocate;
                                        $remainingPartialTokens -= $tokensToAllocate;
                                        $filledAny = true;
                                        
                                        Log::info("Step 3: Filled leftover tokens in existing tag", [
                                            'tag_number' => $listing->tag_number,
                                            'tokens_allocated' => $tokensToAllocate,
                                            'total_tokens_before' => $totalTokensForTag,
                                            'tokens_needed_to_complete' => $tokensNeededToComplete,
                                            'remaining_partial_tokens' => $remainingPartialTokens,
                                        ]);
                                    }
                                }
                            }
                        }
                        
                        // Only AFTER filling ALL leftover tokens, create new tags for remaining partial tokens
                        if ($remainingPartialTokens > 0) {
                            $newTagNumber = $getOrCreatePreGeneratedTag($countryCode, $offering->asset_id);
                            $newListing = $getOrCreateListing($newTagNumber, $countryCode, $offering->asset_id);
                            
                            // If listing creation succeeded, allocate tokens
                            if ($newListing) {
                                // Add to listings collection
                                $listings->push($newListing);
                                
                                // Allocate to new tag
                                $tokensToAllocate = min($tokensPerShare, $remainingPartialTokens);
                                if (!in_array($newListing->tag_number, $allTagNumbers)) {
                                    $allTagNumbers[] = $newListing->tag_number;
                                }
                                $tagAllocations[$newListing->tag_number] = ($tagAllocations[$newListing->tag_number] ?? 0) + $tokensToAllocate;
                                $remainingPartialTokens -= $tokensToAllocate;
                                
                                Log::info("Step 3: Allocated remaining partial tokens to newly created tag", [
                                    'tag_number' => $newListing->tag_number,
                                    'tokens_allocated' => $tokensToAllocate,
                                ]);
                            } else {
                                Log::warning("Failed to create fractional listing for tag allocation", [
                                    'tag_number' => $newTagNumber,
                                    'fractional_asset_id' => $offering->asset_id,
                                ]);
                            }
                        }
                    }
                    
                    // Create a SINGLE order with all tag information
                    // If no tags were allocated (shouldn't happen, but handle gracefully), create one now
                    if (empty($allTagNumbers)) {
                        // This should only happen if there was an error in allocation
                        // Create a tag now as a fallback
                        Log::warning("No tag numbers generated during allocation - creating fallback tag", [
                            'offering_id' => $offering->id,
                            'total_tokens_needed' => $totalTokensNeeded,
                            'full_shares' => $fullShares,
                            'tokens' => $tokens,
                        ]);
                        
                        // Generate a tag number
                        $fallbackTagNumber = $getOrCreatePreGeneratedTag($countryCode, $offering->asset_id);
                        $fallbackListing = $getOrCreateListing($fallbackTagNumber, $countryCode, $offering->asset_id);
                        
                        if ($fallbackListing) {
                            // Allocate all tokens to this fallback tag
                            $allTagNumbers = [$fallbackTagNumber];
                            $tagAllocations[$fallbackTagNumber] = $totalTokensNeeded;
                            
                            Log::info("Created fallback tag for token allocation", [
                                'tag_number' => $fallbackTagNumber,
                                'tokens_allocated' => $totalTokensNeeded,
                            ]);
                        } else {
                            // If even fallback fails, rollback
                            DB::rollBack();
                            Log::error("Failed to create fallback tag - cannot proceed", [
                                'offering_id' => $offering->id,
                                'tag_number' => $fallbackTagNumber,
                            ]);
                            return back()->with('error', 'Unable to allocate tokens. Please try again.');
                        }
                    }
                    
                    // Verify tag allocations match total tokens needed
                    $totalAllocatedTokens = array_sum($tagAllocations);
                    
                    // Ensure all_tag_numbers and tag_allocations are properly set
                    // Sort tag numbers for consistency
                    $allTagNumbers = array_values(array_unique($allTagNumbers));
                    sort($allTagNumbers);
                    ksort($tagAllocations);
                    
                    // Debug: Log the final allocations for troubleshooting
                    Log::info("Tag allocation result", [
                        'all_tag_numbers' => $allTagNumbers,
                        'tag_allocations' => $tagAllocations,
                        'total_tokens_needed' => $totalTokensNeeded,
                        'total_allocated' => $totalAllocatedTokens,
                        'full_shares' => $fullShares,
                        'tokens' => $tokens,
                        'remaining_full_shares' => $remainingFullShares,
                        'remaining_partial_tokens' => $remainingPartialTokens,
                        'available_listings' => $listings->pluck('tag_number')->toArray(),
                    ]);
                    
                    if ($totalAllocatedTokens != $totalTokensNeeded) {
                        // This shouldn't happen, but if it does, log it
                        Log::warning("Token allocation mismatch: totalAllocated={$totalAllocatedTokens}, totalNeeded={$totalTokensNeeded}", [
                            'tag_allocations' => $tagAllocations,
                            'all_tag_numbers' => $allTagNumbers,
                        ]);
                    }
                    
                    // Use the first tag number as the primary tag (for backward compatibility)
                    $primaryTagNumber = $allTagNumbers[0];
                    
            $order = FractionalOrder::create([
                'user_id' => $user->id,
                'offering_id' => $offering->id,
                        'order_number' => $baseOrderNumber,
                        'tag_number' => $primaryTagNumber, // Primary tag for backward compatibility
                'tokens' => $totalTokensNeeded,
                        'shares' => $fullShares,
                        'amount' => $amountInvested, // Use exact amount invested
                'status' => 'requires_payment',
                'payment_provider' => 'stripe',
                'meta' => [
                    'full_shares' => $fullShares,
                    'tokens' => $tokens,
                    'total_tokens' => $totalTokensNeeded,
                            'tokens_per_share' => $tokensPerShare, // Store for certificate display
                            'is_livestock_asset' => true,
                            'is_goat_asset' => true,
                            'all_tag_numbers' => array_values($allTagNumbers), // Ensure it's a proper array
                            'tag_allocations' => $tagAllocations, // Token allocation per tag
                ],
            ]);

            $orderIds[] = $order->id;
                } else {
                    // Non-livestock asset: create single order without tag
                    $totalTokensNeeded = ($fullShares * $tokensPerShare) + $tokens;
                    $order = FractionalOrder::create([
                        'user_id' => $user->id,
                        'offering_id' => $offering->id,
                        'order_number' => $this->generateOrderNumber(),
                        'tag_number' => null,
                        'tokens' => $totalTokensNeeded,
                        'shares' => $fullShares,
                        'amount' => $amountInvested,
                        'status' => 'requires_payment',
                        'payment_provider' => 'stripe',
                        'meta' => [
                            'full_shares' => $fullShares,
                            'tokens' => $tokens,
                            'total_tokens' => $totalTokensNeeded,
                            'is_livestock_asset' => false,
                        ],
                    ]);
                    $orderIds[] = $order->id;
                }
            } else {
                // No asset: create single order
                $totalTokensNeeded = ($fullShares * $tokensPerShare) + $tokens;
                $order = FractionalOrder::create([
                    'user_id' => $user->id,
                    'offering_id' => $offering->id,
                    'order_number' => $this->generateOrderNumber(),
                    'tag_number' => null,
                    'tokens' => $totalTokensNeeded,
                    'shares' => $fullShares,
                    'amount' => $amountInvested,
                    'status' => 'requires_payment',
                    'payment_provider' => 'stripe',
                    'meta' => [
                        'full_shares' => $fullShares,
                        'tokens' => $tokens,
                        'total_tokens' => $totalTokensNeeded,
                        'is_livestock_asset' => false,
                    ],
                ]);
                $orderIds[] = $order->id;
            }

            // Use the exact amount invested by the user for Stripe payment
            // Don't sum order amounts as they might have rounding differences
            $totalAmountInCents = (int) ($amountInvested * 100);

            // Create description for Stripe
            $description = "Fractional Ownership: {$offering->title}";
            if ($fullShares > 0 && $tokens > 0) {
                $description .= " - {$fullShares} " . ($fullShares === 1 ? 'Share' : 'Shares') . " & {$tokens} " . ($tokens === 1 ? 'Token' : 'Tokens');
            } elseif ($fullShares > 0) {
                $description .= " - {$fullShares} " . ($fullShares === 1 ? 'Share' : 'Shares');
            } else {
                $description .= " - {$tokens} " . ($tokens === 1 ? 'Token' : 'Tokens');
            }

            // Create Stripe checkout session
            $checkout = $user->checkoutCharge(
                $totalAmountInCents,
                $description,
                1,
                [
                    'success_url' => route('fractional.purchase.success') . '?session_id={CHECKOUT_SESSION_ID}',
                    'cancel_url' => route('fractional.purchase.cancel') . '?offering_id=' . $offering->id,
                    'metadata' => [
                        'user_id' => $user->id,
                        'offering_id' => $offering->id,
                        'order_ids' => implode(',', $orderIds),
                        'full_shares' => $fullShares,
                        'tokens' => $tokens,
                        'total_tokens' => $totalTokensNeeded,
                        'amount_invested' => $amountInvested,
                        'is_livestock_asset' => $isLivestockAsset ? 'true' : 'false',
                        'is_goat_asset' => $isLivestockAsset ? 'true' : 'false', // For backward compatibility
                        'type' => 'fractional_ownership',
                    ],
                    'payment_method_types' => ['card'],
                ]
            );

            DB::commit();

            // Redirect to Stripe checkout
            return Inertia::location($checkout->url);
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Purchase failed: ' . $e->getMessage());
        }
    }

    public function purchaseSuccess(Request $request)
    {
        $sessionId = $request->get('session_id');

        if (!$sessionId) {
            return redirect()->route('fractional.index')->with('error', 'Invalid payment session.');
        }

        try {
            $user = Auth::user();

            // Retrieve Stripe session
            $session = Cashier::stripe()->checkout->sessions->retrieve($sessionId);

            if ($session->payment_status !== 'paid') {
                return redirect()->route('fractional.index')->with('error', 'Payment was not completed.');
            }

            $metadata = $session->metadata ?? (object)[];
            $orderIds = !empty($metadata->order_ids) ? explode(',', $metadata->order_ids) : [];
            $offeringId = $metadata->offering_id ?? null;

            if (empty($orderIds) || !$offeringId) {
                return redirect()->route('fractional.index')->with('error', 'Invalid payment metadata.');
            }

            DB::beginTransaction();

            // Update all orders to paid status
            $orders = FractionalOrder::whereIn('id', $orderIds)
                ->where('user_id', $user->id)
                ->where('status', 'requires_payment')
                ->get();

            // Get metadata from session to preserve shares and tokens info
            $fullShares = $metadata->full_shares ?? 0;
            $tokens = $metadata->tokens ?? 0;
            $amountInvested = $metadata->amount_invested ?? null;

            foreach ($orders as $order) {
                // Preserve existing meta - especially all_tag_numbers and tag_allocations
                // These were set during order creation and must be preserved
                $existingMeta = $order->meta ?? [];
                
                // Get all_tag_numbers from existing meta (already set during order creation)
                // This contains all tag numbers that received tokens in this purchase
                $allTagNumbers = $existingMeta['all_tag_numbers'] ?? [];
                
                // If for some reason it's not set, use tag_number as fallback
                if (empty($allTagNumbers) && $order->tag_number) {
                    $allTagNumbers = [$order->tag_number];
                }
                
                // Ensure all_tag_numbers is always an array and unique
                $allTagNumbers = array_values(array_unique($allTagNumbers));
                
                $order->update([
                    'status' => 'paid',
                    'payment_intent_id' => $session->payment_intent,
                    'paid_at' => now(),
                    'amount' => $amountInvested ?? $order->amount, // Use exact amount from metadata
                    'shares' => $fullShares, // Update shares from metadata
                    'meta' => array_merge($existingMeta, [
                        'stripe_session_id' => $sessionId,
                        'payment_status' => $session->payment_status,
                        'full_shares' => $fullShares,
                        'tokens' => $tokens,
                        'amount_invested' => $amountInvested ?? $order->amount,
                        'all_tag_numbers' => $allTagNumbers, // Preserve all tag numbers from order creation
                    ]),
                ]);

                // Update or create holdings
                $holding = \App\Models\FractionalHolding::firstOrCreate(
                    [
                        'user_id' => $user->id,
                        'offering_id' => $order->offering_id,
                    ],
                    [
                        'shares' => 0,
                        'avg_cost_per_share' => 0,
                    ]
                );

                // Update holdings (convert tokens to shares for tracking)
                $offering = $order->offering;
                $tokensPerShare = $offering->tokens_per_share;
                $sharesFromTokens = $order->tokens / $tokensPerShare;

                $totalShares = $holding->shares + $sharesFromTokens;
                $totalCost = ($holding->shares * $holding->avg_cost_per_share) + $order->amount;
                $newAvgCost = $totalShares > 0 ? $totalCost / $totalShares : 0;

                $holding->update([
                    'shares' => $totalShares,
                    'avg_cost_per_share' => $newAvgCost,
                ]);
            }

            // Update available shares after payment confirmation
            // For livestock assets: Only count fully sold tags (complete shares)
            // For non-livestock assets: Count based on tokens
            $offering = \App\Models\FractionalOffering::find($offeringId);
            if ($offering) {
                $offering->load('asset');
                $tokensPerShare = $offering->tokens_per_share;
                
                if ($offering->asset && $offering->asset->isLivestockAsset()) {
                    // For livestock assets: Count how many tags are FULLY sold
                    // A tag is fully sold only when ALL tokensPerShare tokens are sold for that tag
                    $listings = FractionalListing::where('fractional_asset_id', $offering->asset_id)
                        ->where('status', 'active')
                        ->get();
                    
                    $fullySoldTags = 0;
                    foreach ($listings as $listing) {
                        // Calculate total tokens sold for this tag (from all orders)
                        $tokensSoldDirect = FractionalOrder::where('offering_id', $offeringId)
                            ->where('status', 'paid')
                            ->where('tag_number', $listing->tag_number)
                            ->sum('tokens');
                        
                        // Also check tag_allocations in meta for orders that have multiple tags
                        $tokensSoldFromMeta = FractionalOrder::where('offering_id', $offeringId)
                            ->where('status', 'paid')
                            ->whereNotNull('meta')
                            ->get()
                            ->sum(function ($order) use ($listing) {
                    $meta = $order->meta ?? [];
                                $tagAllocs = $meta['tag_allocations'] ?? [];
                                return $tagAllocs[$listing->tag_number] ?? 0;
                            });
                        
                        $totalTokensSoldForTag = $tokensSoldDirect + $tokensSoldFromMeta;
                        
                        // Tag is fully sold only when it has exactly tokensPerShare tokens sold
                        if ($totalTokensSoldForTag >= $tokensPerShare) {
                            $fullySoldTags++;
                        }
                    }
                    
                    // Available shares = total shares - fully sold tags
                    // Only decrease available_shares when a tag is COMPLETELY sold (all tokens)
                    $offering->available_shares = max(0, $offering->total_shares - $fullySoldTags);
                    
                    // Only update status to 'sold_out' when all tags are fully sold
                    if ($fullySoldTags >= $offering->total_shares) {
                        $offering->status = 'sold_out';
                        
                        // Update the fractional listing status to sold_out
                        foreach ($listings as $listing) {
                            $listing->status = 'sold_out';
                            $listing->save();
                        }
                    }
                } else {
                    // For non-livestock assets: Use token-based calculation
                    $totalTokensSold = FractionalOrder::where('offering_id', $offeringId)
                        ->where('status', 'paid')
                        ->sum('tokens');
                    
                    $totalTokensAvailable = $offering->total_shares * $tokensPerShare;
                    $remainingTokens = max(0, $totalTokensAvailable - $totalTokensSold);
                    $offering->available_shares = floor($remainingTokens / $tokensPerShare);
                    
                    // Only update status to 'sold_out' when fully sold (no tokens remaining)
                    if ($remainingTokens == 0) {
                    $offering->status = 'sold_out';
                    }
                }
                
                $offering->save();
            }

            DB::commit();

            // Redirect to certificate page for the first order
            $firstOrder = $orders->first();
            if ($firstOrder) {
                return redirect()->route('fractional.certificate.show', $firstOrder->id)
                    ->with('success', 'Payment successful! Your purchase has been confirmed.');
            }

            return redirect()->route('fractional.show', $offeringId)
                ->with('success', 'Payment successful! Your purchase has been confirmed.');

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Fractional purchase success error: ' . $e->getMessage());
            return redirect()->route('fractional.index')->with('error', 'Error processing payment: ' . $e->getMessage());
        }
    }

    public function purchaseCancel(Request $request)
    {
        $offeringId = $request->get('offering_id');

        // Clean up pending orders if needed
        if ($offeringId && Auth::check()) {
            FractionalOrder::where('user_id', Auth::id())
                ->where('offering_id', $offeringId)
                ->where('status', 'requires_payment')
                ->delete();
        }

        if ($offeringId) {
            return redirect()->route('fractional.show', $offeringId)
                ->with('info', 'Payment was cancelled. You can try again when ready.');
        }

        return redirect()->route('fractional.index')
            ->with('info', 'Payment was cancelled.');
    }

    /**
     * Generate a unique order number
     * Format: FO-YYYYMMDD-XXXXXX (e.g., FO-20251116-000001)
     */
    private function generateOrderNumber(): string
    {
        $prefix = 'FO-' . date('Ymd') . '-';

        // Get the last order number for today
        $lastOrder = FractionalOrder::where('order_number', 'like', $prefix . '%')
            ->orderBy('order_number', 'desc')
            ->first();

        if ($lastOrder) {
            // Extract the sequence number and increment
            $lastNumber = (int) substr($lastOrder->order_number, -6);
            $nextNumber = $lastNumber + 1;
        } else {
            // First order of the day
            $nextNumber = 1;
        }

        return $prefix . str_pad($nextNumber, 6, '0', STR_PAD_LEFT);
    }
}

