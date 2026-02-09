<?php

namespace App\Http\Controllers\Barter;

use App\Http\Controllers\Controller;
use App\Models\NonprofitBarterListing;
use App\Models\NonprofitBarterTransaction;
use App\Services\BarterPointSettlementService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

/**
 * Nonprofit Barter Network (NNBN) – nonprofit-only.
 * All routes must use middleware: barter.access (EIN + KYB + Board + Bridge + Admin approved).
 *
 * Flow: Request Trade (A) → B reviews (accept / choose alternate return listing / counter / reject)
 * → Auto point settlement on accept → Fulfillment → Completion (ratings, ledger finalized).
 */
class BarterNetworkController extends Controller
{
    public function __construct(
        protected BarterPointSettlementService $settlementService
    ) {}

    /**
     * Barter dashboard home: current listings, incoming offers, recent trades.
     */
    public function index(Request $request)
    {
        $org = $request->attributes->get('barter_organization');
        $balance = $org->user ? $org->user->currentBelievePoints() : 0;

        $currentListings = NonprofitBarterListing::where('nonprofit_id', $org->id)
            ->active()
            ->with('nonprofit:id,name')
            ->latest()
            ->limit(6)
            ->get();

        $incomingRequests = NonprofitBarterTransaction::query()
            ->with(['requestingNonprofit:id,name', 'requestedListing:id,title,points_value'])
            ->where('responding_nonprofit_id', $org->id)
            ->pending()
            ->latest()
            ->limit(5)
            ->get();

        $recentTrades = NonprofitBarterTransaction::query()
            ->with(['requestingNonprofit:id,name', 'respondingNonprofit:id,name', 'requestedListing:id,title', 'returnListing:id,title'])
            ->where(fn ($q) => $q->where('requesting_nonprofit_id', $org->id)->orWhere('responding_nonprofit_id', $org->id))
            ->completed()
            ->latest()
            ->limit(5)
            ->get();

        $recentListings = NonprofitBarterListing::where('nonprofit_id', $org->id)
            ->latest()
            ->limit(5)
            ->get(['id', 'title', 'status']);

        return Inertia::render('barter/index', [
            'balance' => $balance,
            'organizationName' => $org->name,
            'currentListings' => $currentListings,
            'incomingRequests' => $incomingRequests,
            'recentTrades' => $recentTrades,
            'recentListings' => $recentListings,
        ]);
    }

    /**
     * Marketplace: browse listings (filter by category), view points value.
     */
    public function marketplace(Request $request)
    {
        $org = $request->attributes->get('barter_organization');

        $listings = NonprofitBarterListing::query()
            ->with('nonprofit:id,name')
            ->active()
            ->where('nonprofit_id', '!=', $org->id)
            ->when($request->input('category'), fn ($q) => $q->whereJsonContains('requested_services', $request->input('category')))
            ->latest()
            ->paginate(12);

        $myListings = NonprofitBarterListing::where('nonprofit_id', $org->id)
            ->active()
            ->orderBy('title')
            ->get(['id', 'title', 'points_value']);

        return Inertia::render('barter/marketplace', [
            'listings' => $listings,
            'myListings' => $myListings,
        ]);
    }

    /**
     * My Listings: create / edit / pause listings.
     */
    public function myListings(Request $request)
    {
        $org = $request->attributes->get('barter_organization');

        $listings = NonprofitBarterListing::where('nonprofit_id', $org->id)
            ->latest()
            ->paginate(20);

        return Inertia::render('barter/my-listings', [
            'listings' => $listings,
        ]);
    }

    /**
     * Show a single listing (marketplace or my listing).
     */
    public function showListing(Request $request, NonprofitBarterListing $listing)
    {
        $listing->load('nonprofit:id,name');
        $org = $request->attributes->get('barter_organization');
        $isOwner = $listing->nonprofit_id === $org->id;
        $myListings = $isOwner
            ? []
            : NonprofitBarterListing::where('nonprofit_id', $org->id)
                ->active()
                ->orderBy('title')
                ->get(['id', 'title', 'points_value']);

        return Inertia::render('barter/listing-show', [
            'listing' => $listing,
            'isOwner' => $isOwner,
            'myListings' => $myListings,
        ]);
    }

    public function storeListing(Request $request)
    {
        $org = $request->attributes->get('barter_organization');

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,jpg,png,webp|max:5120',
            'points_value' => 'required|integer|min:0',
            'barter_allowed' => 'boolean',
            'requested_services' => 'nullable|array',
            'requested_services.*' => 'string',
        ]);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('barter/listings', 'public');
        }

        NonprofitBarterListing::create([
            'nonprofit_id' => $org->id,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'image' => $imagePath,
            'points_value' => $validated['points_value'],
            'barter_allowed' => $validated['barter_allowed'] ?? true,
            'requested_services' => $validated['requested_services'] ?? null,
            'status' => NonprofitBarterListing::STATUS_ACTIVE,
        ]);

        return redirect()->route('barter.my-listings')->with('success', 'Listing created.');
    }

    public function updateListing(Request $request, NonprofitBarterListing $listing)
    {
        $org = $request->attributes->get('barter_organization');
        if ($listing->nonprofit_id !== $org->id) {
            abort(403);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,jpg,png,webp|max:5120',
            'points_value' => 'sometimes|integer|min:0',
            'barter_allowed' => 'boolean',
            'requested_services' => 'nullable|array',
            'requested_services.*' => 'string',
            'status' => 'sometimes|in:active,paused,completed',
            'remove_image' => 'boolean',
        ]);

        if (!empty($validated['remove_image']) || $request->hasFile('image')) {
            if ($listing->image && Storage::disk('public')->exists($listing->image)) {
                Storage::disk('public')->delete($listing->image);
            }
            $listing->image = null;
        }

        if ($request->hasFile('image')) {
            $listing->image = $request->file('image')->store('barter/listings', 'public');
        }

        $listing->fill(collect($validated)->except(['image', 'remove_image'])->all());
        $listing->save();

        return redirect()->route('barter.my-listings')->with('success', 'Listing updated.');
    }

    /**
     * Request Trade: A selects B's listing and one of A's listings (optional extra points).
     */
    public function requestTrade(Request $request)
    {
        $org = $request->attributes->get('barter_organization');

        $validated = $request->validate([
            'requested_listing_id' => 'required|exists:nonprofit_barter_listings,id',
            'return_listing_id' => 'required|exists:nonprofit_barter_listings,id',
            'extra_points' => 'nullable|integer|min:0',
        ]);

        $requestedListing = NonprofitBarterListing::findOrFail($validated['requested_listing_id']);
        $returnListing = NonprofitBarterListing::findOrFail($validated['return_listing_id']);

        if ($requestedListing->nonprofit_id === $org->id || $returnListing->nonprofit_id !== $org->id) {
            abort(403, 'Invalid listing selection.');
        }

        $delta = $this->settlementService->computeDelta($requestedListing, $returnListing);
        $extra = (int) ($validated['extra_points'] ?? 0);
        $pointsDelta = $delta + $extra;

        NonprofitBarterTransaction::create([
            'requesting_nonprofit_id' => $org->id,
            'responding_nonprofit_id' => $requestedListing->nonprofit_id,
            'requested_listing_id' => $requestedListing->id,
            'return_listing_id' => $returnListing->id,
            'points_delta' => $pointsDelta,
            'status' => NonprofitBarterTransaction::STATUS_PENDING,
        ]);

        return redirect()->route('barter.active-trades')->with('success', 'Trade request sent.');
    }

    /**
     * Incoming Requests: B accepts, chooses alternate return listing, counters, or rejects.
     */
    public function incomingRequests(Request $request)
    {
        $org = $request->attributes->get('barter_organization');

        $requests = NonprofitBarterTransaction::query()
            ->with(['requestingNonprofit:id,name', 'requestedListing', 'returnListing'])
            ->where('responding_nonprofit_id', $org->id)
            ->pending()
            ->latest()
            ->paginate(15);

        return Inertia::render('barter/incoming-requests', [
            'requests' => $requests,
        ]);
    }

    public function acceptRequest(Request $request, NonprofitBarterTransaction $transaction)
    {
        $org = $request->attributes->get('barter_organization');
        if ($transaction->responding_nonprofit_id !== $org->id || $transaction->status !== NonprofitBarterTransaction::STATUS_PENDING) {
            abort(403);
        }

        $returnListingId = $request->input('return_listing_id', $transaction->return_listing_id);
        if ($returnListingId) {
            $returnListing = NonprofitBarterListing::findOrFail($returnListingId);
            if ($returnListing->nonprofit_id !== $transaction->requesting_nonprofit_id) {
                abort(403);
            }
            $requestedListing = $transaction->requestedListing;
            $transaction->update([
                'return_listing_id' => $returnListing->id,
                'points_delta' => $this->settlementService->computeDelta($requestedListing, $returnListing),
            ]);
        }

        $transaction->refresh();
        if (!$this->settlementService->canSettle($transaction)) {
            return redirect()->back()->with('error', 'Payer has insufficient Believe Points. Acceptance blocked.');
        }

        $transaction->update([
            'status' => NonprofitBarterTransaction::STATUS_ACCEPTED,
            'accepted_at' => now(),
        ]);

        $this->settlementService->settle($transaction);

        return redirect()->route('barter.active-trades')->with('success', 'Trade accepted.');
    }

    public function rejectRequest(Request $request, NonprofitBarterTransaction $transaction)
    {
        $org = $request->attributes->get('barter_organization');
        if ($transaction->responding_nonprofit_id !== $org->id || $transaction->status !== NonprofitBarterTransaction::STATUS_PENDING) {
            abort(403);
        }

        $transaction->update(['status' => NonprofitBarterTransaction::STATUS_CANCELLED]);

        return redirect()->route('barter.incoming-requests')->with('success', 'Trade rejected.');
    }

    /**
     * Active Trades (in_fulfillment / accepted).
     */
    public function activeTrades(Request $request)
    {
        $org = $request->attributes->get('barter_organization');

        $trades = NonprofitBarterTransaction::query()
            ->with(['requestingNonprofit:id,name', 'respondingNonprofit:id,name', 'requestedListing', 'returnListing'])
            ->where(fn ($q) => $q->where('requesting_nonprofit_id', $org->id)->orWhere('responding_nonprofit_id', $org->id))
            ->whereIn('status', [NonprofitBarterTransaction::STATUS_ACCEPTED, NonprofitBarterTransaction::STATUS_IN_FULFILLMENT])
            ->latest()
            ->paginate(15);

        return Inertia::render('barter/active-trades', [
            'trades' => $trades,
        ]);
    }

    /**
     * Trade History (completed).
     */
    public function tradeHistory(Request $request)
    {
        $org = $request->attributes->get('barter_organization');

        $trades = NonprofitBarterTransaction::query()
            ->with(['requestingNonprofit:id,name', 'respondingNonprofit:id,name', 'requestedListing', 'returnListing'])
            ->where(fn ($q) => $q->where('requesting_nonprofit_id', $org->id)->orWhere('responding_nonprofit_id', $org->id))
            ->completed()
            ->latest()
            ->paginate(15);

        return Inertia::render('barter/trade-history', [
            'trades' => $trades,
        ]);
    }

    /**
     * Believe Points Wallet (read-only view; balance from org user).
     */
    public function pointsWallet(Request $request)
    {
        $org = $request->attributes->get('barter_organization');
        $balance = $org->user ? $org->user->currentBelievePoints() : 0;

        return Inertia::render('barter/points-wallet', [
            'balance' => $balance,
        ]);
    }

    /**
     * Reputation Score (stub for Phase 1 – ratings post-completion).
     */
    public function reputation(Request $request)
    {
        $org = $request->attributes->get('barter_organization');

        return Inertia::render('barter/reputation', [
            'score' => null, // Phase 2: aggregate ratings
        ]);
    }
}
