<?php

namespace App\Http\Controllers;

use App\Models\Raffle;
use App\Models\RaffleTicket;
use App\Models\RaffleWinner;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class RaffleController extends BaseController
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): InertiaResponse
    {
        $this->authorizePermission($request, 'raffle.read');

        $query = Raffle::with(['organization', 'tickets', 'winners'])
            ->when($request->search, function ($query, $search) {
                $query->where('title', 'like', "%" . $search . "%")
                      ->orWhere('description', 'like', "%" . $search . "%");
            })
            ->when($request->status, function ($query, $status) {
                $query->where('status', $status);
            })
            ->when($request->user()->role === 'organization', function ($query) use ($request) {
                $query->where('organization_id', $request->user()->id);
            });

        $raffles = $query->orderBy('created_at', 'desc')->paginate(12);

        return Inertia::render('raffles/index', [
            'raffles' => $raffles,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(Request $request): InertiaResponse
    {
        $this->authorizePermission($request, 'raffle.create');

        return Inertia::render('raffles/create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $this->authorizePermission($request, 'raffle.create');

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'ticket_price' => 'required|numeric|min:0.01',
            'total_tickets' => 'required|integer|min:1|max:10000',
            'draw_date' => 'required|date|after:now',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'prizes' => 'required|array|min:1',
            'prizes.*.name' => 'required|string|max:255',
            'prizes.*.description' => 'nullable|string',
            'winners_count' => 'required|integer|min:1|max:10',
        ]);

        if ($request->hasFile('image')) {
            $validated['image'] = $request->file('image')->store('raffles', 'public');
        }

        $validated['organization_id'] = $request->user()->id;
        $validated['sold_tickets'] = 0;

        $raffle = Raffle::create($validated);

        return redirect()->route('raffles.show', $raffle)
            ->with('success', 'Raffle created successfully!');
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, Raffle $raffle): InertiaResponse
    {
        $this->authorizePermission($request, 'raffle.read');

        $raffle->load(['organization', 'tickets.user', 'winners.user', 'winners.ticket']);

        $userTickets = $request->user() 
            ? $raffle->tickets()->where('user_id', $request->user()->id)->get()
            : collect();

        return Inertia::render('raffles/show', [
            'raffle' => $raffle,
            'userTickets' => $userTickets,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Request $request, Raffle $raffle): InertiaResponse
    {
        $this->authorizePermission($request, 'raffle.edit');

        // Only allow editing if raffle is not completed and user owns it
        if ($raffle->status === 'completed' || 
            ($request->user()->role === 'organization' && $raffle->organization_id !== $request->user()->id)) {
            abort(403, 'You cannot edit this raffle.');
        }

        return Inertia::render('raffles/edit', [
            'raffle' => $raffle,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Raffle $raffle): RedirectResponse
    {
        $this->authorizePermission($request, 'raffle.edit');

        // Only allow updating if raffle is not completed and user owns it
        if ($raffle->status === 'completed' || 
            ($request->user()->role === 'organization' && $raffle->organization_id !== $request->user()->id)) {
            abort(403, 'You cannot update this raffle.');
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'ticket_price' => 'required|numeric|min:0.01',
            'total_tickets' => 'required|integer|min:' . $raffle->sold_tickets . '|max:10000',
            'draw_date' => 'required|date|after:now',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'prizes' => 'required|array|min:1',
            'prizes.*.name' => 'required|string|max:255',
            'prizes.*.description' => 'nullable|string',
            'winners_count' => 'required|integer|min:1|max:10',
        ]);

        if ($request->hasFile('image')) {
            if ($raffle->image) {
                Storage::disk('public')->delete($raffle->image);
            }
            $validated['image'] = $request->file('image')->store('raffles', 'public');
        }

        $raffle->update($validated);

        return redirect()->route('raffles.show', $raffle)
            ->with('success', 'Raffle updated successfully!');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Raffle $raffle): RedirectResponse
    {
        $this->authorizePermission($request, 'raffle.delete');

        // Only allow deletion if raffle has no tickets sold
        if ($raffle->sold_tickets > 0) {
            abort(403, 'Cannot delete raffle with sold tickets.');
        }

        if ($raffle->image) {
            Storage::disk('public')->delete($raffle->image);
        }

        $raffle->delete();

        return redirect()->route('raffles.index')
            ->with('success', 'Raffle deleted successfully!');
    }

    /**
     * Purchase tickets for a raffle
     */
    public function purchaseTickets(Request $request, Raffle $raffle)
    {
        $this->authorizePermission($request, 'raffle.purchase');

        // Load the organization relationship and its nested organization
        $raffle->load('organization.organization');

        $validated = $request->validate([
            'quantity' => 'required|integer|min:1|max:10',
        ]);

        $quantity = $validated['quantity'];
        $totalAmount = $raffle->ticket_price * $quantity;

        // Check if raffle is active and has available tickets
        if (!$raffle->is_active) {
            return back()->withErrors(['error' => 'This raffle is not active.']);
        }

        if ($raffle->available_tickets < $quantity) {
            return back()->withErrors(['error' => 'Not enough tickets available.']);
        }

        try {
            $user = $request->user();
            
            // Stripe payment - create checkout session
            $processingFee = ($totalAmount * 0.029) + 0.30;
            $totalWithFee = $totalAmount + $processingFee;
            $totalInCents = (int) ($totalWithFee * 100);
            
            // Record pending transaction
            $transaction = $user->recordTransaction([
                'type' => 'purchase',
                'amount' => $totalAmount,
                'payment_method' => 'stripe',
                'status' => 'pending',
                'meta' => [
                    'raffle_id' => $raffle->id,
                    'ticket_quantity' => $quantity,
                    'description' => "Purchased " . $quantity . " ticket(s) for raffle: " . $raffle->title
                ],
                'related_id' => $raffle->id,
                'related_type' => 'raffle'
            ]);
            // Create checkout session
            $checkout = $user->checkoutCharge(
                $totalInCents,
                "Raffle tickets for {$raffle->title}",
                1,
                [
                    'success_url' => route('raffles.success') . '?session_id={CHECKOUT_SESSION_ID}',
                    'cancel_url' => route('raffles.cancel'),
                    'metadata' => [
                        'raffle_id' => $raffle->id,
                        'quantity' => $quantity,
                        'user_id' => $user->id,
                        'transaction_id' => $transaction->id,
                        'type' => 'raffle_tickets'
                    ],
                    'payment_method_types' => ['card', 'afterpay_clearpay', 'affirm'],
                ]
            );
            
            return Inertia::location($checkout->url);
            
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Generate a unique ticket number
     */
    private function generateTicketNumber(): string
    {
        do {
            $ticketNumber = 'T' . str_pad(rand(1, 999999), 6, '0', STR_PAD_LEFT);
        } while (RaffleTicket::where('ticket_number', $ticketNumber)->exists());
        
        return $ticketNumber;
    }

    /**
     * Calculate prize amounts based on position
     */
    private function calculatePrizeAmounts(float $totalPrizePool, int $winnersCount): array
    {
        $amounts = [];
        
        if ($winnersCount === 1) {
            $amounts[0] = $totalPrizePool;
        } elseif ($winnersCount === 2) {
            $amounts[0] = $totalPrizePool * 0.6; // 60% to 1st place
            $amounts[1] = $totalPrizePool * 0.4; // 40% to 2nd place
        } elseif ($winnersCount === 3) {
            $amounts[0] = $totalPrizePool * 0.5; // 50% to 1st place
            $amounts[1] = $totalPrizePool * 0.3; // 30% to 2nd place
            $amounts[2] = $totalPrizePool * 0.2; // 20% to 3rd place
        } else {
            // For more than 3 winners, distribute evenly
            $amountPerWinner = $totalPrizePool / $winnersCount;
            for ($i = 0; $i < $winnersCount; $i++) {
                $amounts[$i] = $amountPerWinner;
            }
        }
        
        return $amounts;
    }

    /**
     * Draw winners for a raffle
     */
    public function drawWinners(Request $request, Raffle $raffle): RedirectResponse
    {
        $this->authorizePermission($request, 'raffle.draw');

        // Only allow drawing if it's draw time and raffle is active
        if (!$raffle->is_draw_time) {
            return back()->withErrors(['error' => 'Draw time has not arrived yet.']);
        }

        if ($raffle->status !== 'active') {
            return back()->withErrors(['error' => 'This raffle is not active.']);
        }

        $tickets = $raffle->tickets()->with('user')->where('status', 'active')->get();

        if ($tickets->count() < $raffle->winners_count) {
            return back()->withErrors(['error' => 'Not enough tickets sold for drawing.']);
        }

        DB::transaction(function () use ($raffle, $tickets) {
            // Select random winners
            $winners = $tickets->random($raffle->winners_count);

            // Calculate total prize pool (80% of total sales)
            $totalSales = $raffle->sold_tickets * $raffle->ticket_price;
            $prizePool = $totalSales * 0.8; // 80% goes to winners
            $prizeAmounts = $this->calculatePrizeAmounts($prizePool, $raffle->winners_count);

            // Create winner records and add prize money to balances
            foreach ($winners as $index => $ticket) {
                $prizeAmount = $prizeAmounts[$index] ?? 0;
                
                RaffleWinner::create([
                    'raffle_id' => $raffle->id,
                    'raffle_ticket_id' => $ticket->id,
                    'user_id' => $ticket->user_id,
                    'position' => $index + 1,
                    'prize_name' => $raffle->prizes[$index]['name'] ?? "Prize " . ($index + 1),
                    'prize_description' => $raffle->prizes[$index]['description'] ?? null,
                    'prize_amount' => $prizeAmount,
                    'announced_at' => now(),
                ]);

                // Add prize money to winner's balance
                if ($prizeAmount > 0 && $ticket->user) {
                    $ticket->user->addFund(
                        $prizeAmount,
                        'raffle_win',
                        [
                            'raffle_id' => $raffle->id,
                            'position' => $index + 1,
                            'prize_name' => $raffle->prizes[$index]['name'] ?? "Prize " . ($index + 1),
                            'description' => "Won " . ($index + 1) . " place in raffle: " . $raffle->title
                        ]
                    );
                }

                // Mark ticket as winner
                $ticket->update(['status' => 'winner']);
            }

            // Mark raffle as completed
            $raffle->update(['status' => 'completed']);
        });

        return back()->with('success', 'Winners have been drawn successfully!');
    }

    /**
     * Frontend: Display a listing of raffles for users
     */
    public function frontendIndex(Request $request): InertiaResponse
    {
        $query = Raffle::with(['organization', 'tickets', 'winners'])
            ->where('status', 'active') // Only show active raffles to frontend users
            ->when($request->search, function ($query, $search) {
                $query->where('title', 'like', "%" . $search . "%")
                      ->orWhere('description', 'like', "%" . $search . "%");
            })
            ->when($request->status, function ($query, $status) {
                $query->where('status', $status);
            });

        $raffles = $query->orderBy('created_at', 'desc')->paginate(12);

        // Append computed properties to each raffle
        $raffles->getCollection()->each(function ($raffle) {
            $raffle->append(['is_active', 'is_completed', 'is_draw_time', 'available_tickets']);
        });

        return Inertia::render('frontend/raffles/index', [
            'raffles' => $raffles,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    /**
     * Frontend: Display the specified raffle for users
     */
    public function frontendShow(Request $request, Raffle $raffle): InertiaResponse
    {
        $raffle->load(['organization', 'tickets.user', 'winners.user', 'winners.ticket']);

        // Append computed properties
        $raffle->append(['is_active', 'is_completed', 'is_draw_time', 'available_tickets']);

        return Inertia::render('frontend/raffles/show', [
            'raffle' => $raffle,
        ]);
    }

    /**
     * Handle successful Stripe payment
     */
    public function success(Request $request): InertiaResponse
    {
        $sessionId = $request->get('session_id');
        if (!$sessionId) {
            return Inertia::render('raffles/cancel', [
                'auth' => ['user' => $request->user()]
            ]);
        }

        try {
            DB::beginTransaction();

            $session = \Laravel\Cashier\Cashier::stripe()->checkout->sessions->retrieve($sessionId);
            $metadata = $session->metadata;
            
            $raffle = Raffle::with('organization.organization')->findOrFail($metadata->raffle_id);
            $user = User::findOrFail($metadata->user_id);
            $quantity = $metadata->quantity;
            $totalAmount = $raffle->ticket_price * $quantity;

            // Update transaction status
            $transaction = Transaction::findOrFail($metadata->transaction_id);
            $transaction->update([
                'status' => 'completed',
                'processed_at' => now(),
                'meta' => array_merge($transaction->meta, [
                    'stripe_session_id' => $sessionId,
                    'stripe_payment_intent' => $session->payment_intent,
                ])
            ]);

            // Create tickets
            $tickets = [];
            for ($i = 0; $i < $quantity; $i++) {
                $ticket = RaffleTicket::create([
                    'raffle_id' => $raffle->id,
                    'user_id' => $user->id,
                    'price' => $raffle->ticket_price,
                    'ticket_number' => $this->generateTicketNumber(),
                    'purchased_at' => now(),
                ]);
                // Load the raffle relationship
                $ticket->load('raffle.organization.organization');
                $tickets[] = $ticket;
            }

            // Update sold tickets count
            $raffle->increment('sold_tickets', $quantity);
            
            // Add funds to organization balance
            if ($raffle->organization && $raffle->organization->organization) {
                $raffle->organization->organization->addFund(
                    $totalAmount,
                    'raffle_sales',
                    [
                        'raffle_id' => $raffle->id,
                        'ticket_quantity' => $quantity,
                        'buyer_id' => $user->id,
                        'description' => "Sale of " . $quantity . " ticket(s) for raffle: " . $raffle->title
                    ]
                );
            }

            DB::commit();

            return Inertia::render('raffles/success', [
                'raffle' => $raffle,
                'tickets' => $tickets,
                'auth' => [
                    'user' => $user
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return Inertia::render('raffles/cancel', [
                'auth' => ['user' => $request->user()]
            ]);
        }
    }

    /**
     * Handle cancelled Stripe payment
     */
    public function cancel(Request $request): InertiaResponse
    {
        return Inertia::render('raffles/cancel', [
            'auth' => ['user' => $request->user()]
        ]);
    }

    /**
     * Generate QR code for ticket verification
     */
    public function generateTicketQrCode(RaffleTicket $ticket)
    {
        // Create verification data
        $verificationData = [
            'ticket_id' => $ticket->id,
            'ticket_number' => $ticket->ticket_number,
            'raffle_id' => $ticket->raffle_id,
            'user_id' => $ticket->user_id,
            'verification_url' => route('raffles.verify-ticket', $ticket->id),
            'timestamp' => now()->toISOString()
        ];

        // Generate QR code as SVG
        $qrCode = QrCode::format('svg')
            ->size(200)
            ->margin(1)
            ->generate(json_encode($verificationData));

        return response($qrCode, 200, [
            'Content-Type' => 'image/svg+xml',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0'
        ]);
    }

    /**
     * Verify ticket using QR code data
     */
    public function verifyTicket(Request $request, RaffleTicket $ticket)
    {
        $this->authorizePermission($request, 'raffle.read');

        $ticket->load(['raffle.organization', 'user']);

        return Inertia::render('raffles/verify-ticket', [
            'ticket' => $ticket,
            'verification_data' => [
                'ticket_number' => $ticket->ticket_number,
                'raffle_title' => $ticket->raffle->title,
                'organization_name' => $ticket->raffle->organization->name,
                'purchased_at' => $ticket->purchased_at,
                'is_winner' => $ticket->is_winner,
                'user_name' => $ticket->user->name,
                'user_email' => $ticket->user->email
            ]
        ]);
    }
}
