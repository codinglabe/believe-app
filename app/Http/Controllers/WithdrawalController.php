<?php

namespace App\Http\Controllers;

use App\Models\Withdrawal;
use App\Models\User;
use App\Models\PaymentMethod; // Make sure this is imported
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Srmklive\PayPal\Services\PayPal as PayPalClient; // Correct PayPal client import

class WithdrawalController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $filters = $request->only(['search', 'status']);

        $query = Withdrawal::query()->with('user');

        if ($filters['search'] ?? false) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('amount', 'like', '%' . $search . '%')
                  ->orWhere('status', 'like', '%' . $search . '%')
                  ->orWhere('payment_method', 'like', '%' . $search . '%')
                  ->orWhere('paypal_email', 'like', '%' . $search . '%')
                  ->orWhereHas('user', function ($userQuery) use ($search) {
                      $userQuery->where('name', 'like', '%' . $search . '%')
                                ->orWhere('email', 'like', '%' . $search . '%');
                  });
            });
        }

        if ($filters['status'] ?? false) {
            $query->where('status', $filters['status']);
        }

        $withdrawals = $query->orderBy('created_at', 'desc')->paginate(10)->through(function ($withdrawal) {
            return [
                'id' => $withdrawal->id,
                'user_name' => $withdrawal->user->name ?? 'N/A',
                'user_email' => $withdrawal->user->email ?? 'N/A',
                'amount' => $withdrawal->amount,
                'payment_method' => $withdrawal->payment_method,
                'paypal_email' => $withdrawal->paypal_email,
                'bank_account_details' => $withdrawal->bank_account_details,
                'status' => $withdrawal->status,
                'transaction_id' => $withdrawal->transaction_id,
                'admin_notes' => $withdrawal->admin_notes,
                'created_at' => $withdrawal->created_at->toDateTimeString(),
                'processed_at' => $withdrawal->processed_at?->toDateTimeString(),
            ];
        });

        return Inertia::render('admin/withdrawal/index', [
            'withdrawals' => $withdrawals,
            'filters' => $filters,
        ]);
    }

    /**
     * Show the form for creating a new resource (for users to request withdrawal).
     */
    public function create()
    {
        return Inertia::render('user/withdrawal/create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
            'paypal_email' => ['required', 'email'],
        ]);

        $user = Auth::user();
        $amount = $request->amount;

        if ($user->currentBalance() < $amount) {
            return redirect()->back()->withErrors(['amount' => 'Insufficient balance.']);
        }

        $withdrawal = Withdrawal::create([
            'user_id' => $user->id,
            'amount' => $amount,
            'payment_method' => 'paypal',
            'paypal_email' => $request->paypal_email,
            'status' => 'pending',
        ]);

        $user->withdrawFund(
            $amount,
            'paypal',
            [
                'paypal_email' => $request->paypal_email,
                'withdrawal_id' => $withdrawal->id,
            ],
            $withdrawal->id,
            Withdrawal::class,
            'pending'
        );

        return redirect()->back()->with('success', 'Withdrawal request submitted successfully.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Withdrawal $withdrawal)
    {
        $withdrawal->load('user');

        $user = $withdrawal->user;
        $totalEarned = 0;
        $userNodeSells = collect();

        if ($user) {
            $user->load(['nodeReferrals.nodeSells']);

            foreach ($user->nodeReferrals as $referral) {
                if ($referral->nodeSells->isNotEmpty()) {
                    foreach ($referral->nodeSells as $nodeSell) {
                        $commission = ($nodeSell->amount * $referral->parchentage) / 100;
                        $totalEarned += $commission;

                        $userNodeSells->push([
                            'id' => $nodeSell->id,
                            'buyer_name' => $nodeSell->buyer_name ?? 'N/A',
                            'buyer_email' => $nodeSell->buyer_email ?? 'N/A',
                            'amount_invested' => $nodeSell->amount,
                            'commission_earned' => $commission,
                            'status' => $nodeSell->status,
                            'sold_at' => $nodeSell->sold_at ?? $nodeSell->created_at->toDateTimeString(),
                            'referral_link' => $referral->referral_link,
                        ]);
                    }
                }
            }
        }

        // Fetch the PayPal withdrawal mode from the PaymentMethod model
        $paypalWithdrawalConfig = PaymentMethod::getConfig('paypal', 'withdrawal');
        $paypalWithdrawalMode = $paypalWithdrawalConfig->mode_environment ?? 'manual'; // Default to manual

        return Inertia::render('admin/withdrawal/show', [
            'withdrawal' => [
                'id' => $withdrawal->id,
                'user_name' => $withdrawal->user->name ?? 'N/A',
                'user_email' => $withdrawal->user->email ?? 'N/A',
                'amount' => $withdrawal->amount,
                'payment_method' => $withdrawal->payment_method,
                'paypal_email' => $withdrawal->paypal_email,
                'bank_account_details' => $withdrawal->bank_account_details,
                'status' => $withdrawal->status,
                'transaction_id' => $withdrawal->transaction_id,
                'admin_notes' => $withdrawal->admin_notes,
                'created_at' => $withdrawal->created_at->toDateTimeString(),
                'processed_at' => $withdrawal->processed_at?->toDateTimeString(),
            ],
            'userEarnings' => [
                'total_earned' => $totalEarned,
                'transactions' => $userNodeSells->sortByDesc('sold_at')->values()->all(),
            ],
            'paypalWithdrawalMode' => $paypalWithdrawalMode, // Pass the environment mode to the frontend
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Withdrawal $withdrawal)
    {
        $withdrawal->load('user');
        return Inertia::render('admin/withdrawal/edit', [
            'withdrawal' => [
                'id' => $withdrawal->id,
                'user_name' => $withdrawal->user->name ?? 'N/A',
                'user_email' => $withdrawal->user->email ?? 'N/A',
                'amount' => $withdrawal->amount,
                'payment_method' => $withdrawal->payment_method,
                'paypal_email' => $withdrawal->paypal_email,
                'bank_account_details' => $withdrawal->bank_account_details,
                'status' => $withdrawal->status,
                'transaction_id' => $withdrawal->transaction_id,
                'admin_notes' => $withdrawal->admin_notes,
                'created_at' => $withdrawal->created_at->toDateTimeString(),
                'processed_at' => $withdrawal->processed_at?->toDateTimeString(),
            ],
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Withdrawal $withdrawal)
    {
        $request->validate([
            'status' => ['required', 'string', 'in:pending,accepted,processing,completed,rejected,failed'],
            'admin_notes' => ['nullable', 'string', 'max:1000'],
            'transaction_id' => ['nullable', 'string', 'max:255'],
        ]);

        $withdrawal->update($request->only(['status', 'admin_notes', 'transaction_id']));

        if ($request->status === 'completed' && !$withdrawal->processed_at) {
            $withdrawal->processed_at = now();
            $withdrawal->save();

            if ($withdrawal->transaction) {
                $withdrawal->transaction->update(['status' => 'completed', 'processed_at' => now()]);
            }
        } elseif ($request->status === 'failed' || $request->status === 'rejected') {
            if ($withdrawal->transaction) {
                $withdrawal->transaction->update(['status' => $request->status, 'processed_at' => now()]);
            }
        }

        return redirect()->route('withdrawals.show', $withdrawal->id)->with('success', 'Withdrawal updated successfully.');
    }

    /**
     * Accept a pending withdrawal request.
     */
    public function accept(Withdrawal $withdrawal)
    {
        if ($withdrawal->status === 'pending') {
            $withdrawal->update(['status' => 'accepted', 'admin_notes' => 'Withdrawal request accepted.']);
            return redirect()->back()->with('success', 'Withdrawal request accepted. You can now process the payment.');
        }
        return redirect()->back()->with('error', 'Withdrawal cannot be accepted from its current status.');
    }

    /**
     * Process the payment for an accepted withdrawal.
     */
    public function makePayment(Request $request, Withdrawal $withdrawal)
    {
        // Validate that the withdrawal is in 'accepted' or 'processing' status
        if (!in_array($withdrawal->status, ['accepted', 'processing'])) {
            return redirect()->back()->with('error', 'Payment can only be made for accepted or processing withdrawals.');
        }

        $request->validate([
            'payment_type' => ['required', 'string', 'in:automatic,manual'],
            'transaction_id' => ['nullable', 'string', 'max:255'], // For manual payments
        ]);

        // Ensure payment method is PayPal
        if ($withdrawal->payment_method !== 'paypal') {
            return redirect()->back()->with('error', 'This withdrawal is not set for PayPal payment.');
        }

        // Fetch PayPal withdrawal settings dynamically
        $paypalConfig = PaymentMethod::getConfig('paypal', 'withdrawal');

        if (!$paypalConfig && $request->payment_type === 'automatic') {
            return redirect()->back()->with('error', 'PayPal automatic payment settings are not configured.');
        }

        // Update status to processing before attempting payment
        $withdrawal->update(['status' => 'processing', 'admin_notes' => 'Payment processing initiated.']);

        if ($request->payment_type === 'automatic') {
            try {
                // Prepare dynamic PayPal API credentials
                $providerConfig = [
                    'mode'    => $paypalConfig->mode_environment, // 'sandbox' or 'live'
                    'sandbox' => [
                        'username'    => '', // Not typically needed for Payouts
                        'password'    => '', // Not typically needed for Payouts
                        'secret'      => $paypalConfig->client_secret,
                        'certificate' => '',
                        'app_id'      => $paypalConfig->client_id, // For REST API, app_id is client_id
                    ],
                    'live' => [
                        'username'    => '', // Not typically needed for Payouts
                        'password'    => '', // Not typically needed for Payouts
                        'secret'      => $paypalConfig->client_secret,
                        'certificate' => '',
                        'app_id'      => $paypalConfig->client_id,
                    ],
                    'payment_action' => 'Sale', // Not relevant for Payouts
                    'currency'       => 'USD', // Ensure this matches your currency
                    'notify_url'     => env('APP_URL') . '/paypal/webhook', // Optional: for webhooks
                    'locale'         => 'en_US', // Optional
                    'validate_ssl'   => true, // Optional
                ];

                // Initialize PayPal client with dynamic credentials
                $provider = new PayPalClient();
                $provider->setApiCredentials($providerConfig);
                $provider->getAccessToken();

                // Prepare payout details
                $payouts = [
                    'sender_batch_header' => [
                        'sender_batch_id' => 'NodeBoss_Withdrawal_' . $withdrawal->id . '_' . uniqid(),
                        'email_subject' => 'Your Withdrawal from NodeBoss',
                        'email_message' => 'You have received a withdrawal from NodeBoss.',
                    ],
                    'items' => [
                        [
                            'recipient_type' => 'EMAIL',
                            'receiver' => $withdrawal->paypal_email,
                            'amount' => [
                                'value' => number_format($withdrawal->amount, 2, '.', ''), // Format to 2 decimal places
                                'currency' => 'USD', // Or your configured currency
                            ],
                            'note' => 'Withdrawal from NodeBoss for ' . $withdrawal->user_name,
                            'sender_item_id' => 'withdrawal_' . $withdrawal->id,
                        ],
                    ],
                ];

                // Execute payout
                $response = $provider->createPayout($payouts);

                // Check response status
                if (isset($response['batch_header']['payout_batch_id']) && $response['batch_header']['batch_status'] === 'PENDING') {
                    $payoutBatchId = $response['batch_header']['payout_batch_id'];
                    $withdrawal->update([
                        'status' => 'completed', // Or 'processing' if you want to wait for webhook confirmation
                        'transaction_id' => $payoutBatchId,
                        'processed_at' => now(),
                        'admin_notes' => ($withdrawal->admin_notes ?? '') . "\nAutomatic PayPal payment initiated. PayPal Batch ID: {$payoutBatchId}",
                    ]);

                    // Update the associated transaction's status
                    if ($withdrawal->transaction) {
                        $withdrawal->transaction->update(['status' => 'completed', 'processed_at' => now()]);
                    }
                    return redirect()->back()->with('success', 'Automatic PayPal payment initiated successfully! Check PayPal for final status.');
                } else {
                    Log::error("PayPal Payout Error for Withdrawal ID {$withdrawal->id}: " . json_encode($response));
                    throw new \Exception('PayPal payout failed: ' . ($response['message'] ?? 'Unknown error'));
                }

            } catch (\Exception $e) {
                Log::error("Automatic PayPal payment error for Withdrawal ID {$withdrawal->id}: " . $e->getMessage());
                $withdrawal->update([
                    'status' => 'failed',
                    'admin_notes' => ($withdrawal->admin_notes ?? '') . "\nAutomatic PayPal payment failed due to error: " . $e->getMessage(),
                ]);
                // Update the associated transaction's status to failed
                if ($withdrawal->transaction) {
                    $withdrawal->transaction->update(['status' => 'failed', 'processed_at' => now()]);
                }
                return redirect()->back()->with('error', 'Automatic PayPal payment failed due to an error. Check logs for details.');
            }
        } else { // Manual payment
            $withdrawal->update([
                'status' => 'completed',
                'transaction_id' => $request->transaction_id,
                'processed_at' => now(),
                'admin_notes' => ($withdrawal->admin_notes ?? '') . "\nManual payment marked as completed. Transaction ID: {$request->transaction_id}",
            ]);
            // Update the associated transaction's status
            if ($withdrawal->transaction) {
                $withdrawal->transaction->update(['status' => 'completed', 'processed_at' => now()]);
            }
            return redirect()->back()->with('success', 'Manual payment marked as completed successfully!');
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Withdrawal $withdrawal)
    {
        $withdrawal->delete();
        return redirect()->route('withdrawals.index')->with('success', 'Withdrawal deleted successfully.');
    }
}
