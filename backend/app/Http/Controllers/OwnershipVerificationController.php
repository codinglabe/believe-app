<?php

namespace App\Http\Controllers;

use App\Models\NonprofitVerification;
use App\Services\NonprofitVerificationService;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class OwnershipVerificationController extends Controller
{
    protected $verificationService;

    public function __construct(NonprofitVerificationService $verificationService)
    {
        $this->verificationService = $verificationService;
    }

    public function show()
    {
        $user = Auth::user();

        // Check if user has an organization
        if (!$user->organization) {
            return redirect()->route('dashboard')->with('error', 'You must have an organization to verify ownership.');
        }
        $year = 2018;
        header('Content-Type: application/json');
        echo json_encode($this->getIrsForm990Officers($user->organization->ein, $year));
        dd($user->organization->ein);
        return Inertia::render('admin/ownership-verificaiton/verification', [
            'organization' => $user->organization,
        ]);
    }

    public function verify(Request $request)
    {
        $request->validate([
            'manager_name' => 'required|string|min:2|max:255',
            'manager_title' => 'required|string|min:2|max:255',
            'state' => 'required|string|size:2',
        ]);

        $user = Auth::user();

        if (!$user->organization) {
            return back()->withErrors(['error' => 'No organization found for verification.']);
        }

        try {
            // Create or update verification record
            $verification = NonprofitVerification::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'ein' => $user->organization->ein,
                    'organization_legal_name' => $user->organization->name,
                    'manager_name' => $request->manager_name,
                    'manager_title' => $request->manager_title,
                    'verification_status' => 'pending',
                    'verification_method' => 'irs_records',
                ]
            );

            // Process verification through service
            $result = $this->verificationService->verifyOwnership($verification, $request->state);

            return redirect()->route('verification.results');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Verification failed: ' . $e->getMessage()]);
        }
    }

    public function results()
    {
        $user = Auth::user();

        $verification = NonprofitVerification::where('user_id', $user->id)
            ->latest()
            ->first();

        if (!$verification) {
            return redirect()->route('verification.ownership')->with('error', 'No verification found.');
        }

        return Inertia::render('admin/ownership-verificaiton/verification-results', [
            'verification' => $verification,
            'organization' => $user->organization,
        ]);
    }

    public function retry()
    {
        $user = Auth::user();

        // Delete existing verification to start fresh
        NonprofitVerification::where('user_id', $user->id)->delete();

        return redirect()->route('verification.ownership');
    }



    function getPlaidAccountOwnersHttp(string $accessToken)
    {
        $clientId = env('PLAID_CLIENT_ID');
        $secret = env('PLAID_SECRET');
        $env = env('PLAID_ENV', 'sandbox'); // sandbox, development, production

        $baseUrl = match ($env) {
            'production' => 'https://production.plaid.com',
            'development' => 'https://development.plaid.com',
            default => 'https://sandbox.plaid.com',
        };

        $response = Http::post("{$baseUrl}/identity/get", [
            'client_id' => $clientId,
            'secret' => $secret,
            'access_token' => $accessToken,
        ]);

        if ($response->failed()) {
            return ['error' => $response->body()];
        }

        $accounts = $response->json('accounts');

        $result = [];

        foreach ($accounts as $account) {
            $owners = [];
            foreach ($account['owners'] ?? [] as $owner) {
                $owners[] = [
                    'names' => $owner['names'] ?? [],
                    'emails' => $owner['emails'] ?? [],
                    'phone_numbers' => $owner['phone_numbers'] ?? [],
                    'addresses' => $owner['addresses'] ?? [],
                ];
            }

            $result[] = [
                'account_id' => $account['account_id'],
                'account_name' => $account['name'],
                'owners' => $owners,
            ];
        }

        return $result;
    }
}
