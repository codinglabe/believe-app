<?php

namespace App\Http\Controllers;

use App\Models\BankVerification;
use App\Services\PlaidVerificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class PlaidVerificationController extends Controller
{
    protected $plaidService;

    public function __construct(PlaidVerificationService $plaidService)
    {
        $this->plaidService = $plaidService;
    }

    public function show()
    {
        $user = Auth::user();
        
        Log::info('PlaidVerificationController@show - Starting verification page', [
            'user_id' => $user->id,
            'user_name' => $user->name,
            'user_email' => $user->email
        ]);
        
        // Check if user has an organization
        if (!$user->organization) {
            Log::warning('PlaidVerificationController@show - No organization found', [
                'user_id' => $user->id
            ]);
            return redirect()->route('dashboard')->with('error', 'You must have an organization to verify ownership.');
        }

        Log::info('PlaidVerificationController@show - Organization found', [
            'user_id' => $user->id,
            'organization_id' => $user->organization->id,
            'organization_name' => $user->organization->name,
            'organization_ein' => $user->organization->ein
        ]);

        try {
            // Create initial link token
            $linkToken = $this->plaidService->createLinkToken($user);
            
            Log::info('PlaidVerificationController@show - Link token created successfully', [
                'user_id' => $user->id,
                'link_token_length' => strlen($linkToken)
            ]);

            return Inertia::render('organization/verification', [
                'organization' => $user->organization,
                'linkToken' => $linkToken,
            ]);
        } catch (\Exception $e) {
            Log::error('PlaidVerificationController@show - Failed to create link token', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return redirect()->route('dashboard')->with('error', 'Failed to initialize verification: ' . $e->getMessage());
        }
    }

    public function createLinkToken(Request $request)
    {
        $user = Auth::user();
        
        Log::info('PlaidVerificationController@createLinkToken - Creating link token', [
            'user_id' => $user->id
        ]);
        
        try {
            $linkToken = $this->plaidService->createLinkToken($user);
            
            Log::info('PlaidVerificationController@createLinkToken - Success', [
                'user_id' => $user->id,
                'link_token_created' => true
            ]);
            
            return response()->json([
                'success' => true,
                'link_token' => $linkToken
            ]);
        } catch (\Exception $e) {
            Log::error('PlaidVerificationController@createLinkToken - Failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to create link token: ' . $e->getMessage()
            ], 500);
        }
    }

    public function exchangeToken(Request $request)
    {
        $request->validate([
            'public_token' => 'required|string',
            'metadata' => 'required|array',
        ]);

        $user = Auth::user();
        
        Log::info('PlaidVerificationController@exchangeToken - Starting token exchange', [
            'user_id' => $user->id,
            'public_token_length' => strlen($request->public_token),
            'metadata' => $request->metadata
        ]);

        try {
            $result = $this->plaidService->exchangePublicToken($request->public_token);
            
            Log::info('PlaidVerificationController@exchangeToken - Success', [
                'user_id' => $user->id,
                'access_token_received' => !empty($result['access_token']),
                'item_id' => $result['item_id'] ?? null
            ]);
            
            return response()->json([
                'success' => true,
                'access_token' => $result['access_token'],
                'account_id' => $result['item_id'] // Using item_id as account_id for now
            ]);
        } catch (\Exception $e) {
            Log::error('PlaidVerificationController@exchangeToken - Failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to exchange token: ' . $e->getMessage()
            ], 500);
        }
    }

    public function verifyOwnership(Request $request)
    {
        $request->validate([
            'access_token' => 'required|string',
            'account_id' => 'required|string',
            'metadata' => 'required|array',
        ]);

        $user = Auth::user();
        
        Log::info('PlaidVerificationController@verifyOwnership - Starting ownership verification', [
            'user_id' => $user->id,
            'access_token_length' => strlen($request->access_token),
            'account_id' => $request->account_id,
            'metadata' => $request->metadata
        ]);
        
        if (!$user->organization) {
            Log::warning('PlaidVerificationController@verifyOwnership - No organization found', [
                'user_id' => $user->id
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'No organization found for verification.'
            ], 400);
        }

        try {
            // Process bank verification through Plaid service
            $verification = $this->plaidService->verifyBankOwnership(
                $user,
                $request->access_token,
                $request->account_id,
                $request->metadata
            );

            Log::info('PlaidVerificationController@verifyOwnership - Verification completed', [
                'user_id' => $user->id,
                'verification_id' => $verification->id,
                'verification_status' => $verification->verification_status,
                'name_similarity_score' => $verification->name_similarity_score
            ]);

            return response()->json([
                'success' => true,
                'verification_id' => $verification->id,
                'status' => $verification->verification_status
            ]);

        } catch (\Exception $e) {
            Log::error('PlaidVerificationController@verifyOwnership - Verification failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Bank verification failed: ' . $e->getMessage()
            ], 500);
        }
    }

    public function results()
    {
        $user = Auth::user();
        
        Log::info('PlaidVerificationController@results - Loading results page', [
            'user_id' => $user->id
        ]);
        
        $verification = BankVerification::where('user_id', $user->id)
            ->latest()
            ->first();

        if (!$verification) {
            Log::warning('PlaidVerificationController@results - No verification found', [
                'user_id' => $user->id
            ]);
            
            return redirect()->route('verification.ownership')->with('error', 'No verification found.');
        }

        Log::info('PlaidVerificationController@results - Verification found', [
            'user_id' => $user->id,
            'verification_id' => $verification->id,
            'verification_status' => $verification->verification_status
        ]);

        return Inertia::render('organization/verification-results', [
            'verification' => $verification,
            'organization' => $user->organization,
        ]);
    }

    public function downloadCertificate(Request $request)
    {
        $user = Auth::user();
        
        Log::info('PlaidVerificationController@downloadCertificate - Certificate download requested', [
            'user_id' => $user->id
        ]);
        
        $verification = BankVerification::where('user_id', $user->id)
            ->where('verification_status', 'verified')
            ->latest()
            ->first();

        if (!$verification) {
            Log::warning('PlaidVerificationController@downloadCertificate - No verified account found', [
                'user_id' => $user->id
            ]);
            
            return back()->with('error', 'No verified account found.');
        }

        try {
            // Generate PDF certificate
            $pdf = $this->plaidService->generateVerificationCertificate($verification);
            
            Log::info('PlaidVerificationController@downloadCertificate - Certificate generated', [
                'user_id' => $user->id,
                'verification_id' => $verification->id
            ]);
            
            return response($pdf)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'attachment; filename="verification-certificate.pdf"');
        } catch (\Exception $e) {
            Log::error('PlaidVerificationController@downloadCertificate - Failed to generate certificate', [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);
            
            return back()->with('error', 'Failed to generate certificate.');
        }
    }

    public function retry()
    {
        $user = Auth::user();
        
        Log::info('PlaidVerificationController@retry - Retrying verification', [
            'user_id' => $user->id
        ]);
        
        // Delete existing verification to start fresh
        $deletedCount = BankVerification::where('user_id', $user->id)->delete();
        
        Log::info('PlaidVerificationController@retry - Previous verifications deleted', [
            'user_id' => $user->id,
            'deleted_count' => $deletedCount
        ]);
        
        return redirect()->route('verification.ownership');
    }
}
