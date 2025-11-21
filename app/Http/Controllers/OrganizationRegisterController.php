<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\EINLookupRequest;
use App\Http\Requests\Auth\OrganizationRegistrationRequest;
use App\Models\BoardMember;
use App\Models\Organization;
use App\Models\User;
use App\Services\EINLookupService;
use App\Services\TaxComplianceService;
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
use Spatie\Permission\Models\Role;

class OrganizationRegisterController extends Controller
{
    protected EINLookupService $einLookupService;
    protected TaxComplianceService $taxComplianceService;

    public function __construct(EINLookupService $einLookupService, TaxComplianceService $taxComplianceService)
    {
        $this->einLookupService = $einLookupService;
        $this->taxComplianceService = $taxComplianceService;
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
                return response()->json([
                    'success' => false,
                    'message' => 'This organization is already registered.'
                ]);
            }

            // Lookup in Excel data
            $orgData = $this->einLookupService->lookupEIN($ein);

            // dd($orgData);

            if (!$orgData) {
                return response()->json([
                    'success' => false,
                    'message' => 'EIN not found in IRS database. Please verify the number and try again.'
                ]);
            }

            Log::info('EIN Lookup Success', ['data' => $orgData]);

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

        // dd($request->all());
        // Manual validation
        $validator = Validator::make($request->all(), [
            'ein' => 'required|string|size:9|unique:organizations,ein',
            'name' => 'nullable|string|max:255',
            'ico' => 'nullable|string|max:255',
            'street' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'zip' => 'nullable|string|max:255',
            'classification' => 'nullable|string|max:255',
            'ruling' => 'nullable|string|max:255',
            'deductibility' => 'nullable|string|max:255',
            'organization' => 'nullable|string|max:255',
            'status' => 'nullable|string|max:255',
            'tax_period' => 'nullable|string|max:255',
            'filing_req' => 'nullable|string|max:255',
            'ntee_code' => 'nullable|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'phone' => 'required|string|max:255',
            'contact_name' => 'required|string|max:255',
            'contact_title' => 'required|string|max:255',
            'password' => 'required|string|confirmed|min:8',
            'password_confirmation' => 'required|string',
            'website' => 'nullable|url|max:255',
            'description' => 'required|string|max:2000',
            'mission' => 'required|string|max:2000',
            'image' => 'required|image|mimes:jpeg,png,jpg,gif|max:5120', // 5MB max
            'agree_to_terms' => 'required|accepted',
            // 'has_edited_irs_data' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        $taxEvaluation = $this->taxComplianceService->evaluate($validated['tax_period'] ?? null, $validated['ein']);

        DB::beginTransaction();

        // Check if IRS data was edited
        $hasEditedIRS = $request->boolean('has_edited_irs_data', false);
        $initialRole = ($hasEditedIRS || $taxEvaluation['should_lock']) ? 'organization_pending' : 'organization';

        // Store original IRS data if edited
        $originalIRSData = null;
        if ($hasEditedIRS) {
            $originalIRSData = $this->einLookupService->lookupEIN($validated['ein']);
        }

        $user = User::create([
            "name" => $validated['contact_name'],
            "slug" => Str::slug($validated['contact_name']) . '-' . Str::random(5),
            "email" => $validated['email'],
            "contact_number" => $validated['phone'],
            "password" => Hash::make($validated['password']),
            "role" => $initialRole,
            "organization_role" => 'admin',
            "referred_by" => null,
        ]);

        // Handle image upload
        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('organizations', 'public');

            $user->registered_user_image = $imagePath;
            $user->save();
        }

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
            'status' => $taxEvaluation['should_lock'] ? 'Inactive' : ($validated['status'] ?? 'Active'),
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
            'registered_user_image' => $imagePath,
            'registration_status' => $hasEditedIRS ? 'pending' : ($taxEvaluation['should_lock'] ? 'pending' : 'approved'),
            'has_edited_irs_data' => $hasEditedIRS,
            'original_irs_data' => $originalIRSData,
            'tax_compliance_status' => $taxEvaluation['status'],
            'tax_compliance_checked_at' => $taxEvaluation['checked_at'],
            'tax_compliance_meta' => $taxEvaluation['meta'],
            'is_compliance_locked' => $taxEvaluation['should_lock'],
        ]);

        $this->syncOrganizationUserRole($user, $organization);


            // Create board member record
            $boardMember = BoardMember::create([
                'organization_id' => $organization->id,
                'user_id' => $user->id,
                'position' => 'Chairperson / President',
                'appointed_on' => now(),
            ]);

            // Record history
            $boardMember->histories()->create([
                'action' => 'appointed',
                'details' => "Registered as Chairperson / President",
                'changed_by' => $user->id,
            ]);


        DB::commit();

        Log::info('Organization Registration Success', ['organization_id' => $organization->id]);

        event(new Registered($user));

        Auth::login($user);

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

    private function syncOrganizationUserRole(User $user, Organization $organization): void
    {
        if (!$user) {
            return;
        }

        $targetRole = ($organization->registration_status === 'approved' && !$organization->is_compliance_locked)
            ? 'organization'
            : 'organization_pending';

        Role::findOrCreate($targetRole);

        if ($user->hasRole($targetRole) && $user->roles()->count() === 1 && $user->role === $targetRole) {
            return;
        }

        $user->syncRoles([$targetRole]);

        if ($user->role !== $targetRole) {
            $user->role = $targetRole;
            $user->save();
        }
    }
}
