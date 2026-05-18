/**
 * Create customer with custom KYC data
 */
public function createCustomerWithKyc(Request $request)
{
    try {
        $user = Auth::user();
        
        // Use Spatie hasRole() instead of in_array
        $isOrgUser = $user->hasRole(['organization', 'organization_pending']);

        if ($isOrgUser) {
            $organization = $user->organization;
            if (!$organization) {
                return response()->json(['success' => false, 'message' => 'Organization not found.'], 404);
            }
            $entity = $organization;
            $entityType = Organization::class;
        } else {
            $entity = $user;
            $entityType = User::class;
        }

        // Get or create integration
        $integration = BridgeIntegration::where('integratable_id', $entity->id)
            ->where('integratable_type', $entityType)
            ->first();

        if (!$integration) {
            $integration = new BridgeIntegration();
            $integration->integratable_id = $entity->id;
            $integration->integratable_type = $entityType;
        }

        // Get signed agreement ID from metadata
        $metadata = $integration->bridge_metadata;
        if (!is_array($metadata)) {
            $metadata = is_string($metadata) ? json_decode($metadata, true) : [];
        }
        
        $signedAgreementId = $request->input('signed_agreement_id')
            ?? ($metadata['signed_agreement_id'] ?? null);
        
        Log::info('Create customer KYC: Checking signed_agreement_id', [
            'from_request' => $request->input('signed_agreement_id'),
            'from_metadata' => $metadata['signed_agreement_id'] ?? null,
            'tos_status' => $integration->tos_status,
            'final_signed_agreement_id' => $signedAgreementId,
        ]);

        // If no signed_agreement_id but TOS status is accepted, try to get it from Bridge
        if (!$signedAgreementId && $integration->tos_status === 'accepted' && $integration->bridge_customer_id) {
            Log::info('TOS is accepted but signed_agreement_id not found, checking Bridge customer');
            
            try {
                $customerResult = $this->bridgeService->getCustomer($integration->bridge_customer_id);
                if ($customerResult['success'] && isset($customerResult['data']['signed_agreement_id'])) {
                    $signedAgreementId = $customerResult['data']['signed_agreement_id'];
                    $metadata['signed_agreement_id'] = $signedAgreementId;
                    $integration->bridge_metadata = $metadata;
                    $integration->save();
                    
                    Log::info('Retrieved signed_agreement_id from Bridge customer', [
                        'signed_agreement_id' => $signedAgreementId,
                    ]);
                }
            } catch (\Exception $e) {
                Log::warning('Failed to get signed_agreement_id from Bridge', [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Validate signed_agreement_id is present
        if (!$signedAgreementId) {
            if (!in_array($integration->tos_status, ['accepted', 'approved'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Terms of Service must be accepted first. Please accept TOS before submitting KYC data.',
                    'debug' => [
                        'tos_status' => $integration->tos_status,
                        'has_signed_agreement_id' => false,
                    ],
                ], 400);
            }
        }

        DB::beginTransaction();

        try {
            if ($isOrgUser) {
                // Business customer (KYB)
                $validated = $request->validate([
                    // Business Info
                    'business_legal_name' => 'sometimes|string|max:255',
                    'email' => 'sometimes|email',
                    'ein' => 'sometimes|string',
                    'phone' => 'nullable|string',
                    'primary_website' => 'nullable|url',
                    'business_description' => 'nullable|string',

                    // Registered Address (incorporation address)
                    'registered_address.street_line_1' => 'sometimes|string',
                    'registered_address.street_line_2' => 'nullable|string',
                    'registered_address.city' => 'sometimes|string',
                    'registered_address.subdivision' => 'sometimes|string',
                    'registered_address.postal_code' => 'sometimes|string',
                    'registered_address.country' => 'sometimes|string',

                    // Physical Address (operating address) - optional
                    'physical_address.street_line_1' => 'nullable|string',
                    'physical_address.street_line_2' => 'nullable|string',
                    'physical_address.city' => 'nullable|string',
                    'physical_address.subdivision' => 'nullable|string',
                    'physical_address.postal_code' => 'nullable|string',
                    'physical_address.country' => 'nullable|string',

                    // Control Person (Beneficial Owner) - required for business
                    'control_person.first_name' => 'required|string',
                    'control_person.last_name' => 'required|string',
                    'control_person.email' => 'required|email',
                    'control_person.birth_date' => 'required|date',
                    'control_person.ssn' => 'required|string',
                    'control_person.title' => 'required|string',
                    'control_person.ownership_percentage' => 'required|numeric|min:0|max:100',

                    // Control Person Address
                    'control_person.residential_address.street_line_1' => 'required|string',
                    'control_person.residential_address.street_line_2' => 'nullable|string',
                    'control_person.residential_address.city' => 'required|string',
                    'control_person.residential_address.subdivision' => 'required|string',
                    'control_person.residential_address.postal_code' => 'required|string',
                    'control_person.residential_address.country' => 'required|string',

                    // ID Documents
                    'control_person.id_type' => 'required|in:drivers_license,passport',
                    'control_person.id_number' => 'required|string',
                    'control_person.id_front_image' => 'required|string',
                    'control_person.id_back_image' => 'nullable|string',
                ]);

                // Use organization data as defaults
                $businessLegalName = $validated['business_legal_name'] ?? $organization->name ?? null;
                $email = $validated['email'] ?? $organization->email ?? $user->email ?? null;
                $ein = $validated['ein'] ?? $organization->ein ?? null;
                $phone = $validated['phone'] ?? $organization->phone ?? null;
                $primaryWebsite = $validated['primary_website'] ?? $organization->website ?? null;
                
                // Registered Address - use organization defaults
                $registeredAddress = [
                    'street_line_1' => $validated['registered_address']['street_line_1'] ?? $organization->street ?? null,
                    'street_line_2' => $validated['registered_address']['street_line_2'] ?? null,
                    'city' => $validated['registered_address']['city'] ?? $organization->city ?? null,
                    'subdivision' => $validated['registered_address']['subdivision'] ?? $organization->state ?? null,
                    'postal_code' => $validated['registered_address']['postal_code'] ?? $organization->zip ?? null,
                    'country' => $validated['registered_address']['country'] ?? 'USA',
                ];
                
                // Validate required fields
                if (empty($businessLegalName)) {
                    throw new \Exception('Business legal name is required');
                }
                if (empty($email)) {
                    throw new \Exception('Email is required');
                }
                if (empty($ein)) {
                    throw new \Exception('EIN is required');
                }
                if (empty($registeredAddress['street_line_1']) || empty($registeredAddress['city']) || 
                    empty($registeredAddress['subdivision']) || empty($registeredAddress['postal_code'])) {
                    throw new \Exception('Business address is incomplete.');
                }

                // Build control person data per Bridge API spec
                $controlPerson = [
                    'first_name' => $validated['control_person']['first_name'],
                    'last_name' => $validated['control_person']['last_name'],
                    'email' => $validated['control_person']['email'],
                    'birth_date' => $validated['control_person']['birth_date'],
                    'title' => $validated['control_person']['title'],
                    'ownership_percentage' => $validated['control_person']['ownership_percentage'],
                    'has_control' => true,
                    'has_ownership' => $validated['control_person']['ownership_percentage'] > 0,
                    'attested_ownership_structure_at' => now()->toIso8601String(),

                    'residential_address' => [
                        'street_line_1' => $validated['control_person']['residential_address']['street_line_1'],
                        'street_line_2' => $validated['control_person']['residential_address']['street_line_2'] ?? null,
                        'city' => $validated['control_person']['residential_address']['city'],
                        'subdivision' => $validated['control_person']['residential_address']['subdivision'],
                        'postal_code' => $validated['control_person']['residential_address']['postal_code'],
                        'country' => $validated['control_person']['residential_address']['country'],
                    ],

                    'identifying_information' => [
                        [
                            'type' => 'ssn',
                            'issuing_country' => 'usa',
                            'number' => $validated['control_person']['ssn'],
                        ],
                        [
                            'type' => $validated['control_person']['id_type'],
                            'issuing_country' => 'usa',
                            'number' => $validated['control_person']['id_number'],
                            'image_front' => $this->formatBase64Image($validated['control_person']['id_front_image']),
                            'image_back' => !empty($validated['control_person']['id_back_image']) 
                                ? $this->formatBase64Image($validated['control_person']['id_back_image']) 
                                : null,
                        ],
                    ],
                ];

                // Build customer data for Bridge API
                $customerData = [
                    'type' => 'business',
                    'business_legal_name' => $businessLegalName,
                    'email' => $email,
                    'registered_address' => $registeredAddress,
                    'identifying_information' => [
                        [
                            'type' => 'ein',
                            'issuing_country' => 'usa',
                            'number' => $ein,
                        ],
                    ],
                    'associated_persons' => [$controlPerson],
                ];

                // Add signed_agreement_id if available
                if ($signedAgreementId) {
                    $customerData['signed_agreement_id'] = $signedAgreementId;
                }

                // Add optional fields
                if (!empty($phone)) {
                    $customerData['phone'] = $phone;
                }
                if (!empty($primaryWebsite)) {
                    $customerData['primary_website'] = $primaryWebsite;
                }
                if (!empty($validated['business_description'])) {
                    $customerData['business_description'] = $validated['business_description'];
                }

                // Add physical address if provided
                if (!empty($validated['physical_address']['street_line_1'])) {
                    $customerData['physical_address'] = [
                        'street_line_1' => $validated['physical_address']['street_line_1'],
                        'street_line_2' => $validated['physical_address']['street_line_2'] ?? null,
                        'city' => $validated['physical_address']['city'],
                        'subdivision' => $validated['physical_address']['subdivision'],
                        'postal_code' => $validated['physical_address']['postal_code'],
                        'country' => $validated['physical_address']['country'],
                    ];
                }

                // Add additional beneficial owners if provided
                if ($request->has('additional_beneficial_owners') && is_array($request->input('additional_beneficial_owners'))) {
                    foreach ($request->input('additional_beneficial_owners') as $owner) {
                        $customerData['associated_persons'][] = $owner;
                    }
                }

            } else {
                // Individual customer (KYC)
                $validated = $request->validate([
                    'first_name' => 'required|string|max:255',
                    'last_name' => 'required|string|max:255',
                    'email' => 'required|email',
                    'birth_date' => 'required|date',
                    'residential_address.street_line_1' => 'required|string',
                    'residential_address.street_line_2' => 'nullable|string',
                    'residential_address.city' => 'required|string',
                    'residential_address.subdivision' => 'required|string',
                    'residential_address.postal_code' => 'required|string',
                    'residential_address.country' => 'required|string',
                    'ssn' => 'required|string',
                    'id_type' => 'required|in:drivers_license,passport,state_id',
                    'id_number' => 'required|string',
                    'id_front_image' => 'required|string',
                    'id_back_image' => 'nullable|string',
                ]);

                $customerData = [
                    'type' => 'individual',
                    'first_name' => $validated['first_name'],
                    'last_name' => $validated['last_name'],
                    'email' => $validated['email'],
                    'birth_date' => $validated['birth_date'],
                    'residential_address' => [
                        'street_line_1' => $validated['residential_address']['street_line_1'],
                        'street_line_2' => $validated['residential_address']['street_line_2'] ?? null,
                        'city' => $validated['residential_address']['city'],
                        'subdivision' => $validated['residential_address']['subdivision'],
                        'postal_code' => $validated['residential_address']['postal_code'],
                        'country' => $validated['residential_address']['country'],
                    ],
                    'identifying_information' => [
                        [
                            'type' => 'ssn',
                            'issuing_country' => 'usa',
                            'number' => $validated['ssn'],
                        ],
                        [
                            'type' => $validated['id_type'],
                            'issuing_country' => 'usa',
                            'number' => $validated['id_number'],
                            'image_front' => $this->formatBase64Image($validated['id_front_image']),
                            'image_back' => !empty($validated['id_back_image']) 
                                ? $this->formatBase64Image($validated['id_back_image']) 
                                : null,
                        ],
                    ],
                ];

                // Add signed_agreement_id if available
                if ($signedAgreementId) {
                    $customerData['signed_agreement_id'] = $signedAgreementId;
                }
            }

            // Create customer with Bridge
            if ($isOrgUser) {
                $result = $this->bridgeService->createBusinessCustomer($customerData);
            } else {
                $result = $this->bridgeService->createCustomerWithKycData($customerData);
            }

            if (!$result['success']) {
                Log::error('Bridge customer creation failed', [
                    'error' => $result['error'],
                    'response' => $result['response'] ?? null,
                    'type' => $isOrgUser ? 'business' : 'individual',
                ]);
                throw new \Exception($result['error'] ?? 'Failed to create customer');
            }

            $responseData = $result['data'];

            // Update integration
            $integration->bridge_customer_id = $responseData['id'] ?? null;

            if ($isOrgUser) {
                $integration->kyb_status = $responseData['kyb_status'] ?? 'pending';
                if (isset($responseData['kyc_status'])) {
                    $integration->kyc_status = $responseData['kyc_status'];
                }
            } else {
                $integration->kyc_status = $responseData['kyc_status'] ?? 'pending';
            }

            $integration->tos_status = 'accepted';
            
            // Merge metadata
            $existingMetadata = $integration->bridge_metadata ?? [];
            if (!is_array($existingMetadata)) {
                $existingMetadata = is_string($existingMetadata) ? json_decode($existingMetadata, true) : [];
            }
            
            $newMetadata = array_merge($existingMetadata, [
                'customer_data' => $responseData,
                'type' => $isOrgUser ? 'business' : 'individual',
                'created_at' => now()->toIso8601String(),
            ]);
            
            if ($signedAgreementId) {
                $newMetadata['signed_agreement_id'] = $signedAgreementId;
            }
            
            $integration->bridge_metadata = $newMetadata;
            $integration->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'KYC data submitted successfully. Verification is pending.',
                'data' => [
                    'customer_id' => $integration->bridge_customer_id,
                    'kyc_status' => $integration->kyc_status,
                    'kyb_status' => $integration->kyb_status ?? null,
                ],
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    } catch (\Exception $e) {
        Log::error('Create customer with KYC error', ['error' => $e->getMessage()]);
        return response()->json([
            'success' => false,
            'message' => 'Failed to create customer: ' . $e->getMessage(),
        ], 500);
    }
}

/**
 * Format base64 image with proper data URI prefix
 */
private function formatBase64Image(string $base64): string
{
    // If already has data URI prefix, return as-is
    if (str_starts_with($base64, 'data:image/')) {
        return $base64;
    }
    
    // Add data URI prefix
    return 'data:image/jpg;base64,' . $base64;
}