<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\EINLookupRequest;
use App\Http\Requests\Auth\OrganizationRegistrationRequest;
use App\Models\Organization;
use App\Models\User;
use App\Services\EINLookupService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Illuminate\Support\Str;

class OrganizationRegisterController extends Controller
{
    protected $einLookupService;

    public function __construct(EINLookupService $einLookupService)
    {
        $this->einLookupService = $einLookupService;
    }

    public function create(Request $request)
    {
        if ($request->has('ref')) {

            $user = User::where('referral_code', $request->ref)->first();

            if (!$user) {
                return redirect()->route('register')->with('error', 'Invalid referral code');
            }
            return Inertia::render('frontend/register/organization', [
                'referralCode' => $user->referral_code,
            ]);
        }
        return Inertia::render('frontend/register/organization');
    }

    public function lookupEIN(Request $request)
    {
        // Add debugging
        Log::info('EIN Lookup Request', [
            'request_data' => $request->all(),
            'headers' => $request->headers->all(),
            'method' => $request->method(),
            'url' => $request->fullUrl()
        ]);

        try {
            // Manual validation with better error messages
            $validated = $request->validate([
                'ein' => 'required|string|min:9|max:9'
            ], [
                'ein.required' => 'EIN is required',
                'ein.min' => 'EIN must be exactly 9 digits',
                'ein.max' => 'EIN must be exactly 9 digits'
            ]);

            $ein = $validated['ein'];

            // Check if organization already registered
            $existingOrg = Organization::where('ein', $ein)->first();
            if ($existingOrg) {
                return back()->withErrors([
                    'message' => 'This organization is already registered.'
                ]);
            }

            // Lookup in Excel data
            $orgData = $this->einLookupService->lookupEIN($ein);

            if (!$orgData) {
                return back()->withErrors([
                    'message' => 'EIN not found in IRS database. Please verify the number and try again.'
                ]);
            }

            Log::info('EIN Lookup Success', ['data' => $orgData]);

            // Return success response with data
            // return Inertia::visit('frontend/register/organization', [
            //     'lookupResponse' => [
            //         'success' => true,
            //         'data' => $orgData,
            //     ],
            // ]);

            return response()->json([
                    'success' => true,
                    'data' => $orgData
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('EIN Lookup Validation Error', ['errors' => $e->errors()]);
            return back()->withErrors($e->errors());
        } catch (\Exception $e) {
            Log::error('EIN Lookup Error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return back()->withErrors([
                'message' => 'Error looking up EIN. Please try again.'
            ]);
        }
    }

    public function register(Request $request)
    {
        try {
            // Manual validation
            $validator = Validator::make($request->all(), [
                'ein' => 'required|string|size:9|unique:organizations,ein',
                'name' => 'nullable|string|max:255',
                'ico' => 'nullable|string|max:255',
                'street' => 'nullable|string|max:255',
                'city' => 'nullable|string|max:100',
                'state' => 'nullable|string|max:50',
                'zip' => 'nullable|string|max:20',
                'classification' => 'nullable|string|max:100',
                'ruling' => 'nullable|string|max:50',
                'deductibility' => 'nullable|string|max:50',
                'organization' => 'nullable|string|max:100',
                'status' => 'nullable|string|max:50',
                'tax_period' => 'nullable|string|max:50',
                'filing_req' => 'nullable|string|max:50',
                'ntee_code' => 'nullable|string|max:20',
                'email' => 'required|email|max:255',
                'phone' => 'required|string|max:20',
                'contact_name' => 'required|string|max:255',
                'contact_title' => 'required|string|max:100',
                'password' => 'required|string|confirmed|min:8',
                'password_confirmation' => 'required|string',
                'website' => 'nullable|url|max:255',
                'description' => 'required|string|max:2000',
                'mission' => 'required|string|max:2000',
                'agree_to_terms' => 'required|accepted',
                'has_edited_irs_data' => 'boolean'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $validated = $validator->validated();

            DB::beginTransaction();

            // Check if IRS data was edited
            $hasEditedIRS = $request->boolean('has_edited_irs_data', false);

            // Store original IRS data if edited
            $originalIRSData = null;
            if ($hasEditedIRS) {
                $originalIRSData = $this->einLookupService->lookupEIN($validated['ein']);
            }

            $referredBy = null;
            if ($request->has('referralCode')) {
                $user = User::where('referral_code', $request->referralCode)->first();
                if ($user) {
                    $referredBy = $user->id;
                }
            }

            $slug = Str::slug($validated['name']);
            if (User::where('slug', $slug)->exists()) {
                $slug = $slug . '-' . Str::random(5);
            }

            $user = User::create([
                "name" => $validated['contact_name'],
                "slug" => $slug,
                "email" => $validated['email'],
                "contact_number" => $validated['phone'],
                "password" => Hash::make($validated['password']),
                "role" => 'organization',
                "referred_by" => $referredBy,
            ]);

      

            $organization = Organization::create([
                'user_id' => $user->id,
                'ein' => $validated['ein'],
                'name' => $validated['name'],
                'ico' => $validated['ico'] ?? null,
                'street' => $validated['street'],
                'city' => $validated['city'],
                'state' => $validated['state'],
                'zip' => $validated['zip'],
                'classification' => $validated['classification'] ?? null,
                'ruling' => $validated['ruling'] ?? null,
                'deductibility' => $validated['deductibility'] ?? null,
                'organization' => $validated['organization'] ?? null,
                'status' => $validated['status'] ?? 'Active',
                'tax_period' => $validated['tax_period'] ?? null,
                'filing_req' => $validated['filing_req'] ?? null,
                'ntee_code' => $validated['ntee_code'] ?? null,
                'email' => $validated['email'],
                'phone' => $validated['phone'],
                'contact_name' => $validated['contact_name'],
                'contact_title' => $validated['contact_title'],
                'website' => $validated['website'] ?? null,
                'description' => $validated['description'],
                'mission' => $validated['mission'],
                'registration_status' => $hasEditedIRS ? 'pending' : 'approved',
                'has_edited_irs_data' => $hasEditedIRS,
                'original_irs_data' => $originalIRSData
            ]);

            DB::commit();

            Log::info('Organization Registration Success', ['organization_id' => $organization->id]);

            event(new Registered($user));

            $user->assignRole('organization');

            Auth::login($user);

            // return to_route('dashboard');

            // Return success response
            return response()->json([
                'success' => true,
                'message' => $hasEditedIRS
                    ? 'Application submitted successfully! We will review it within 3-5 business days.'
                    : 'Organization registered successfully!',
                'organization' => $organization
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Organization Registration Error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Registration failed. Please try again.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
