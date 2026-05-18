<?php

namespace App\Http\Controllers\Livestock;

use App\Http\Controllers\BaseController;
use App\Models\LivestockPayout;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PayoutController extends BaseController
{
    /**
     * Display a listing of payouts.
     */
    public function index(Request $request): Response
    {
        $user = $request->user('livestock');
        
        $perPage = (int) $request->get('per_page', 12);
        $page = (int) $request->get('page', 1);
        $status = $request->get('status', '');

        $query = $user->payouts();

        if ($status) {
            $query->where('status', $status);
        }

        $payouts = $query->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page)
            ->withQueryString();

        return Inertia::render('Livestock/Payouts/Index', [
            'payouts' => $payouts,
            'filters' => [
                'status' => $status,
                'per_page' => $perPage,
                'page' => $page,
            ],
        ]);
    }

    /**
     * Display the specified payout.
     */
    public function show(Request $request, $id): Response
    {
        $user = $request->user('livestock');
        $payout = $user->payouts()->findOrFail($id);

        // Load reference data (listing, animal, buyer info)
        $referenceData = null;
        if ($payout->reference_model && $payout->reference_id) {
            $reference = $payout->reference();
            
            if ($reference) {
                // If it's a listing, load animal and buyer info
                if ($payout->reference_model === 'App\Models\LivestockListing') {
                    $reference->load([
                        'animal' => function($query) {
                            $query->with(['photos', 'currentOwner', 'seller']);
                        },
                        'seller'
                    ]);
                    
                    // Get buyer info from metadata (preferred) or ownership history
                    $metadata = $payout->metadata ?? [];
                    $buyer = null;
                    $buyerAddress = null;
                    
                    if (!empty($metadata['buyer_id'])) {
                        // Use metadata if available (includes address)
                        $buyer = [
                            'id' => $metadata['buyer_id'],
                            'name' => $metadata['buyer_name'] ?? null,
                            'email' => $metadata['buyer_email'] ?? null,
                        ];
                        $buyerAddress = $metadata['buyer_address'] ?? null;
                    } else {
                        // Fallback to ownership history
                        $ownershipHistory = \App\Models\OwnershipHistory::with('newOwner')
                            ->where('animal_id', $reference->animal_id)
                            ->where('previous_owner_id', $user->id)
                            ->where('new_owner_id', '!=', $user->id)
                            ->latest()
                            ->first();
                        
                        if ($ownershipHistory && $ownershipHistory->newOwner) {
                            $buyer = [
                                'id' => $ownershipHistory->newOwner->id,
                                'name' => $ownershipHistory->newOwner->name,
                                'email' => $ownershipHistory->newOwner->email,
                            ];
                        }
                    }
                    
                    $referenceData = [
                        'type' => 'listing',
                        'listing' => $reference,
                        'animal' => $reference->animal,
                        'buyer' => $buyer,
                        'buyer_address' => $buyerAddress,
                        'buyer_confirmation' => $metadata['buyer_confirmation'] ?? null,
                        'buyer_confirmation_notes' => $metadata['buyer_confirmation_notes'] ?? null,
                        'buyer_confirmed_at' => $metadata['buyer_confirmed_at'] ?? null,
                    ];
                }
            }
        }

        return Inertia::render('Livestock/Payouts/Show', [
            'payout' => $payout,
            'reference_data' => $referenceData,
        ]);
    }
}
