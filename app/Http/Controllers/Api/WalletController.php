<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BridgeIntegration;
use App\Models\Transaction;
use App\Services\BridgeWalletReadService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class WalletController extends Controller
{
    private function bridgeWalletBlocksLocalLedger(Request $request): bool
    {
        $user = $request->user();
        if ($user === null) {
            return false;
        }

        return app(BridgeWalletReadService::class)->usesBridgeWalletAsSourceOfTruth(
            BridgeIntegration::resolveForUser($user)
        );
    }

    private function bridgeLedgerBlockedResponse(Request $request)
    {
        $integration = BridgeIntegration::resolveForUser($request->user());
        $balance = round((float) (app(BridgeWalletReadService::class)->getBalance($integration) ?? 0), 2);

        return response()->json([
            'success' => false,
            'message' => 'This account uses Bridge wallet. Balance and transfers are managed by Bridge API only.',
            'source' => 'bridge_wallet',
            'data' => [
                'balance' => $balance,
            ],
        ], 400);
    }

    /**
     * Get wallet balance
     */
    public function getBalance(Request $request)
    {
        $user = $request->user();
        $integration = BridgeIntegration::resolveForUser($user);
        $bridgeRead = app(BridgeWalletReadService::class);

        if ($bridgeRead->usesBridgeWalletAsSourceOfTruth($integration)) {
            $balance = round((float) ($bridgeRead->getBalance($integration) ?? 0), 2);

            return response()->json([
                'success' => true,
                'data' => [
                    'balance' => $balance,
                    'currency' => 'USD',
                    'source' => 'bridge_wallet',
                ],
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'balance' => $user->balance ?? 0,
                'currency' => 'USD',
                'source' => 'ledger',
            ],
        ]);
    }

    /**
     * Deposit funds to wallet
     */
    public function deposit(Request $request)
    {
        if ($this->bridgeWalletBlocksLocalLedger($request)) {
            return $this->bridgeLedgerBlockedResponse($request);
        }

        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'sometimes|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();
        $amount = $request->amount;

        DB::beginTransaction();
        try {
            // Update user balance
            $user->increment('balance', $amount);

            // Create transaction record
            $transaction = Transaction::create([
                'user_id' => $user->id,
                'type' => 'deposit',
                'status' => 'completed',
                'amount' => $amount,
                'fee' => 0,
                'currency' => 'USD',
                'payment_method' => $request->payment_method ?? 'wallet',
                'processed_at' => now(),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Deposit successful',
                'data' => [
                    'transaction_id' => $transaction->transaction_id,
                    'amount' => $amount,
                    'new_balance' => $user->fresh()->balance,
                ],
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Deposit failed: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Withdraw funds from wallet
     */
    public function withdraw(Request $request)
    {
        if ($this->bridgeWalletBlocksLocalLedger($request)) {
            return $this->bridgeLedgerBlockedResponse($request);
        }

        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'sometimes|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();
        $amount = $request->amount;

        if ($user->balance < $amount) {
            return response()->json([
                'success' => false,
                'message' => 'Insufficient balance',
            ], 400);
        }

        DB::beginTransaction();
        try {
            // Update user balance
            $user->decrement('balance', $amount);

            // Create transaction record
            $transaction = Transaction::create([
                'user_id' => $user->id,
                'type' => 'withdrawal',
                'status' => 'completed',
                'amount' => $amount,
                'fee' => 0,
                'currency' => 'USD',
                'payment_method' => $request->payment_method ?? 'wallet',
                'processed_at' => now(),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Withdrawal successful',
                'data' => [
                    'transaction_id' => $transaction->transaction_id,
                    'amount' => $amount,
                    'new_balance' => $user->fresh()->balance,
                ],
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Withdrawal failed: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Send funds to another user
     */
    public function send(Request $request)
    {
        if ($this->bridgeWalletBlocksLocalLedger($request)) {
            return $this->bridgeLedgerBlockedResponse($request);
        }

        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email',
            'amount' => 'required|numeric|min:0.01',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();
        $amount = $request->amount;
        $recipient = \App\Models\User::where('email', $request->email)->first();

        if ($user->id === $recipient->id) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot send funds to yourself',
            ], 400);
        }

        if ($user->balance < $amount) {
            return response()->json([
                'success' => false,
                'message' => 'Insufficient balance',
            ], 400);
        }

        DB::beginTransaction();
        try {
            // Update sender balance
            $user->decrement('balance', $amount);

            // Update recipient balance
            $recipient->increment('balance', $amount);

            // Create transaction records
            Transaction::create([
                'user_id' => $user->id,
                'type' => 'transfer',
                'status' => 'completed',
                'amount' => -$amount,
                'fee' => 0,
                'currency' => 'USD',
                'payment_method' => 'wallet',
                'meta' => ['recipient_id' => $recipient->id, 'recipient_email' => $recipient->email],
                'processed_at' => now(),
            ]);

            Transaction::create([
                'user_id' => $recipient->id,
                'type' => 'transfer',
                'status' => 'completed',
                'amount' => $amount,
                'fee' => 0,
                'currency' => 'USD',
                'payment_method' => 'wallet',
                'meta' => ['sender_id' => $user->id, 'sender_email' => $user->email],
                'processed_at' => now(),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Funds sent successfully',
                'data' => [
                    'amount' => $amount,
                    'recipient' => $recipient->email,
                    'new_balance' => $user->fresh()->balance,
                ],
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Transfer failed: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Transfer funds (alias for send)
     */
    public function transfer(Request $request)
    {
        return $this->send($request);
    }
}
