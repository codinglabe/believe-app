<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\EINLookupRequest;
use App\Http\Requests\Auth\OrganizationRegistrationRequest;
use App\Models\BoardMember;
use App\Models\BridgeIntegration;
use App\Models\Organization;
use App\Models\OrganizationInvite;
use App\Models\User;
use App\Services\BridgeService;
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
use App\Services\SeoService;

class OrganizationRegisterController extends Controller
{
    protected EINLookupService $einLookupService;
    protected TaxComplianceService $taxComplianceService;
    protected BridgeService $bridgeService;

    public function __construct(
        EINLookupService $einLookupService,
        TaxComplianceService $taxComplianceService,
        BridgeService $bridgeService
    ) {
        $this->einLookupService = $einLookupService;
        $this->taxComplianceService = $taxComplianceService;
        $this->bridgeService = $bridgeService;
    }

    public function create(Request $request)
    {
        $seo = SeoService::forPage('register_organization');

        // Handle invite token
        if ($request->has('invite')) {
            $invite = OrganizationInvite::where('token', $request->invite)
                ->where('status', '!=', 'accepted')
                ->first();

            if (!$invite) {
                return redirect()->route('register.organization')
                    ->with('error', 'Invalid or expired invitation link');
            }

            return Inertia::render('frontend/register/organization', [
                'seo' => $seo,
                'ein' => $invite->ein,
                'inviteToken' => $invite->token,
                'organizationName' => $invite->organization_name,
            ]);
        }

        // Handle legacy referral code (for backward compatibility)
        if ($request->has('ref') || $request->has('ein')) {
            $user = User::where('referral_code', $request->ref)->first();

            if (!$user) {
                return redirect()->route('register.organization')->with('error', 'Invalid referral code');
            }

            return Inertia::render('frontend/register/organization', [
                'seo' => $seo,
                'ein' => $request->query('ein'),
                'referralCode' => $user->referral_code,
            ]);
        }

        return Inertia::render('frontend/register/organization', [
            'seo' => $seo,
        ]);
    }

    public function lookupEIN(Request $request)
    {
        try {
            Log::info('EIN Lookup Request', [
                'request_data' => $request->all(),
                'headers' => $request->headers->all(),
            ]);

            // Manual validation for AJAX requests
            $validator = Validator::make($request->all(), [
                'ein' => 'required|string|min:9|max:9|unique:organizations,ein'
            ], [
                'ein.required' => 'EIN is required',
                'ein.min' => 'EIN must be exactly 9 digits',
                'ein.max' => 'EIN must be exactly 9 digits',
                'ein.unique' => 'This organization is already registered',
            ]);

            if ($validator->fails()) {
                Log::error('EIN Lookup Validation Error', ['errors' => $validator->errors()->toArray()]);

                return response()->json([
                    'success' => false,
                    'message' => $validator->errors()->first('ein'),
                    'errors' => $validator->errors()
                ], 422); // 422 Unprocessable Entity
            }

            $ein = $request->ein;

            // Additional check (redundant but safe)
            $existingOrg = Organization::where('ein', $ein)->first();
            if ($existingOrg) {
                return response()->json([
                    'success' => false,
                    'message' => 'This organization is already registered.'
                ], 422);
            }

            // Lookup in Excel data
            $orgData = $this->einLookupService->lookupEIN($ein);

            if (!$orgData) {
                return response()->json([
                    'success' => false,
                    'message' => 'EIN not found in IRS database. Please verify the number and try again.'
                ], 404);
            }

            Log::info('EIN Lookup Success', ['data' => $orgData]);

            return response()->json([
                'success' => true,
                'data' => $orgData
            ]);
        } catch (\Exception $e) {
            Log::error('EIN Lookup Error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error looking up EIN. Please try again.'
            ], 500);
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

            // Generate unique slug from organization name with incremental numbers
            $baseSlug = Str::slug($validated['name']);
            $slug = $baseSlug;
            $counter = 1;
            while (User::where('slug', $slug)->exists()) {
                $slug = $baseSlug . '-' . $counter;
                $counter++;
            }

            $user = User::create([
                "name" => $validated['contact_name'],
                "slug" => $slug,
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

            // Handle organization invite if token was provided
            if ($request->has('invite_token')) {
                $invite = OrganizationInvite::where('token', $request->invite_token)
                    ->where('ein', $validated['ein'])
                    ->where('status', '!=', 'accepted')
                    ->first();

                if ($invite) {
                    $invite->update([
                        'status' => 'accepted',
                        'accepted_at' => now(),
                    ]);

                    Log::info('Organization invite accepted', [
                        'invite_id' => $invite->id,
                        'organization_id' => $organization->id,
                        'inviter_id' => $invite->inviter_id,
                    ]);

                    // Note: Believe points (100) will be awarded to the inviter 
                    // automatically when the organization verifies their email
                    // See: App\Listeners\AwardInviteRewardPoints
                }
            }

            DB::commit();

            Log::info('Organization Registration Success', ['organization_id' => $organization->id]);

            // Create Bridge customer for the organization (non-blocking)
            try {
                $this->createBridgeCustomer($organization, $user);
            } catch (\Exception $e) {
                // Log error but don't fail registration
                Log::error('Failed to create Bridge customer during organization registration', [
                    'organization_id' => $organization->id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
            }

            event(new Registered($user));

            // Send verification email with current domain (where user is registering from)
            // Use actual request host, not config value
            $scheme = $request->getScheme();
            $host = $request->getHost();
            $port = $request->getPort();
            $currentDomain = $scheme . '://' . $host . ($port && $port != 80 && $port != 443 ? ':' . $port : '');
            $user->sendEmailVerificationNotification($currentDomain);

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

    /**
     * Create Bridge customer for organization
     */
    private function createBridgeCustomer(Organization $organization, User $user): void
    {
        // Check if Bridge customer already exists
        $existingIntegration = BridgeIntegration::where('integratable_id', $organization->id)
            ->where('integratable_type', Organization::class)
            ->first();

        if ($existingIntegration && $existingIntegration->bridge_customer_id) {
            Log::info('Bridge customer already exists for organization', [
                'organization_id' => $organization->id,
                'bridge_customer_id' => $existingIntegration->bridge_customer_id,
            ]);
            return;
        }

        // Prepare customer data
        $email = trim($organization->email ?? $user->email ?? '');
        $name = trim($organization->name ?? $user->name ?? '');

        if (empty($email)) {
            throw new \Exception('Email is required to create Bridge customer');
        }

        if (empty($name)) {
            throw new \Exception('Organization name is required to create Bridge customer');
        }

        // Build registered address from organization data
        $registeredAddress = [
            'street_line_1' => $organization->street ?? '',
            'city' => $organization->city ?? '',
            'subdivision' => $organization->state ?? '',
            'postal_code' => $organization->zip ?? '',
            'country' => 'USA', // Default to USA, can be made configurable
        ];

        // Build identifying information (EIN)
        $identifyingInformation = [];
        if (!empty($organization->ein)) {
            $identifyingInformation[] = [
                'type' => 'ein',
                'issuing_country' => 'usa',
                'number' => $organization->ein,
            ];
        }

        // Build customer data with all required fields for Bridge business customer
        $customerData = [
            'type' => 'business',
            'business_legal_name' => $name, // Bridge expects business_legal_name, not business_name
            'email' => $email,
            'registered_address' => $registeredAddress,
            'physical_address' => $registeredAddress, // Use same as registered if physical not provided
            'identifying_information' => $identifyingInformation,
            'business_description' => $organization->description ?? $organization->mission ?? 'Business operations',
        ];

        // Add optional fields if available
        if (!empty($organization->phone)) {
            $customerData['phone'] = $organization->phone;
        }
        if (!empty($organization->website)) {
            $customerData['primary_website'] = $organization->website;
        }

        // Add business type if available (default to corporation)
        $customerData['business_type'] = $this->mapEntityTypeToBridgeType($organization->classification ?? 'corporation');

        // Add DAO status if available
        $customerData['is_dao'] = false; // Default to false, can be updated later during KYB

        // Add attested ownership structure timestamp
        $customerData['attested_ownership_structure_at'] = now()->toIso8601String();

        Log::info('Creating Bridge customer for organization', [
            'organization_id' => $organization->id,
            'customer_data' => $customerData,
        ]);

        // Create business customer in Bridge using createBusinessCustomer method
        $customerResult = $this->bridgeService->createBusinessCustomer($customerData);

        if (!$customerResult['success']) {
            Log::error('Failed to create Bridge customer', [
                'organization_id' => $organization->id,
                'error' => $customerResult['error'] ?? 'Unknown error',
                'response' => $customerResult['response'] ?? null,
            ]);
            throw new \Exception($customerResult['error'] ?? 'Failed to create Bridge customer');
        }

        $bridgeCustomerId = $customerResult['data']['id'] ?? $customerResult['data']['customer_id'] ?? null;

        if (!$bridgeCustomerId) {
            Log::error('Bridge customer ID not returned', [
                'organization_id' => $organization->id,
                'response' => $customerResult['data'] ?? null,
            ]);
            throw new \Exception('Bridge customer ID not returned');
        }

        // Save Bridge integration
        if (!$existingIntegration) {
            $existingIntegration = new BridgeIntegration();
            $existingIntegration->integratable_id = $organization->id;
            $existingIntegration->integratable_type = Organization::class;
        }

        $existingIntegration->bridge_customer_id = $bridgeCustomerId;
        $existingIntegration->bridge_metadata = [
            'customer_data' => $customerResult['data'],
            'created_at_registration' => true,
            'registration_data' => [
                'name' => $name,
                'email' => $email,
                'ein' => $organization->ein,
                'address' => $registeredAddress,
            ],
        ];
        $existingIntegration->save();

        Log::info('Bridge customer created successfully for organization', [
            'organization_id' => $organization->id,
            'bridge_customer_id' => $bridgeCustomerId,
        ]);
    }

    /**
     * Map organization classification/entity type to Bridge business type
     * 
     * @param string|null $entityType
     * @return string
     */
    private function mapEntityTypeToBridgeType(?string $entityType): string
    {
        if (empty($entityType)) {
            return 'corporation';
        }

        $entityTypeLower = strtolower(trim($entityType));

        // Map common entity types to Bridge business types
        $mapping = [
            'llc' => 'llc',
            'limited liability company' => 'llc',
            'corporation' => 'corporation',
            'corp' => 'corporation',
            'inc' => 'corporation',
            'partnership' => 'partnership',
            'cooperative' => 'cooperative',
            'trust' => 'trust',
            'sole proprietorship' => 'sole_prop',
            'sole_prop' => 'sole_prop',
        ];

        return $mapping[$entityTypeLower] ?? 'corporation';
    }
}
