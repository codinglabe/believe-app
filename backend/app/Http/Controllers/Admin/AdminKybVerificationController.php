<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BridgeKycKybSubmission;
use App\Models\VerificationDocument;
use App\Models\BridgeIntegration;
use App\Services\BridgeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class AdminKybVerificationController extends Controller
{
    protected BridgeService $bridgeService;

    public function __construct(BridgeService $bridgeService)
    {
        $this->bridgeService = $bridgeService;
    }

    /**
     * Helper: determine MIME type from stored file path (by extension)
     */
    private function getMimeType(string $path): string
    {
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        return match ($extension) {
            'pdf' => 'application/pdf',
            'png' => 'image/png',
            'jpg', 'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            default => 'application/octet-stream',
        };
    }

    /**
     * Display a listing of KYB submissions
     */
    public function index(Request $request)
    {
        // Permission is checked via middleware

        $query = BridgeKycKybSubmission::with(['bridgeIntegration.integratable'])
            ->where('type', 'kyb')
            ->orderBy('created_at', 'desc');

        // Apply status filter for tabs
        $status = $request->get('status', $request->get('tab', 'all'));
        if ($status && $status !== 'all') {
            // Bridge KYC/KYB statuses: not_started, incomplete, under_review, awaiting_questionnaire, awaiting_ubo, approved, rejected, paused, offboarded
            if ($status === 'pending' || $status === 'in_review' || $status === 'under_review') {
                $query->whereIn('submission_status', ['not_started', 'under_review', 'incomplete', 'awaiting_questionnaire', 'awaiting_ubo']);
            } else {
                $query->where('submission_status', $status);
            }
        }

        // Apply search filter
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('business_name', 'like', "%{$search}%")
                    ->orWhere('business_email', 'like', "%{$search}%")
                    ->orWhere('ein', 'like', "%{$search}%")
                    ->orWhere('bridge_customer_id', 'like', "%{$search}%");
            });
        }

        $submissions = $query->paginate(15);

        // Add business_name and business_email from organization to each submission
        $submissions->getCollection()->transform(function ($submission) {
            // First, check if submission already has business_name and business_email
            $businessName = $submission->business_name;
            $businessEmail = $submission->business_email;
            
            // If not set, try to get from submission_data JSON
            if (!$businessName && $submission->submission_data) {
                $businessName = $submission->submission_data['business_name'] ?? null;
            }
            if (!$businessEmail && $submission->submission_data) {
                $businessEmail = $submission->submission_data['business_email'] ?? null;
            }
            
            // If still not set, get from organization via bridge_integration
            if (!$businessName || !$businessEmail) {
                $integration = $submission->bridgeIntegration;
                if ($integration && $integration->integratable) {
                    $organization = $integration->integratable;
                    if ($organization instanceof \App\Models\Organization) {
                        // Use organization data as fallback
                        if (!$businessName) {
                            $businessName = $organization->name;
                        }
                        if (!$businessEmail) {
                            $businessEmail = $organization->email;
                        }
                    }
                }
            }
            
            // Set the values on the submission
            $submission->business_name = $businessName;
            $submission->business_email = $businessEmail;
            
            return $submission;
        });

        // Calculate stats
        $stats = [
            'total' => BridgeKycKybSubmission::where('type', 'kyb')->count(),
            // Bridge KYC/KYB statuses: not_started, incomplete, under_review, awaiting_questionnaire, awaiting_ubo, approved, rejected, paused, offboarded
            'pending' => BridgeKycKybSubmission::where('type', 'kyb')
                ->whereIn('submission_status', ['not_started', 'under_review', 'incomplete', 'awaiting_questionnaire', 'awaiting_ubo'])
                ->count(),
            'approved' => BridgeKycKybSubmission::where('type', 'kyb')
                // Bridge approved status
                ->where('submission_status', 'approved')
                ->count(),
            'rejected' => BridgeKycKybSubmission::where('type', 'kyb')
                ->where('submission_status', 'rejected')
                ->count(),
            'not_submitted' => BridgeKycKybSubmission::where('type', 'kyb')
                ->where('submission_status', 'not_submitted')
                ->count(),
        ];

        // Get direct Bridge submission setting
        $directBridgeSubmission = \App\Models\AdminSetting::get('kyb_direct_bridge_submission', false);

        return inertia('admin/kyb-verification/Index', [
            'submissions' => $submissions,
            'stats' => $stats,
            'filters' => [
                'status' => $status,
                'search' => $request->search,
            ],
            'directBridgeSubmission' => $directBridgeSubmission,
        ]);
    }

    /**
     * Display the specified KYB submission
     */
    public function show($id)
    {
        $submission = BridgeKycKybSubmission::with([
            'bridgeIntegration.integratable',
            'verificationDocuments',
            'controlPerson',
            'associatedPersons'
        ])->where('type', 'kyb')->findOrFail($id);

        // Permission is checked via middleware

        // Get business data from organization (via bridge_integration)
        $businessAddress = null;
        $businessName = null;
        $businessEmail = null;
        $integration = $submission->bridgeIntegration;
        if ($integration) {
            $organization = $integration->integratable;
            if ($organization && $organization instanceof \App\Models\Organization) {
                $businessName = $organization->name;
                $businessEmail = $organization->email;
                // Map Organization columns to Bridge format
                $businessAddress = [
                    'street_line_1' => $organization->street ?? null,
                    'city' => $organization->city ?? null,
                    'subdivision' => $organization->state ?? null,
                    'postal_code' => $organization->zip ?? null,
                    'country' => 'USA', // Default to USA
                ];
            }
        }

        // Convert submission to array and add business data
        $submissionData = $submission->toArray();
        $submissionData['business_name'] = $businessName;
        $submissionData['business_email'] = $businessEmail;
        $submissionData['business_address'] = $businessAddress;
        $submissionData['registered_address'] = $businessAddress; // Same as business address

        return inertia('admin/kyb-verification/Show', [
            'submission' => $submissionData,
        ]);
    }

    /**
     * Approve a KYB submission and send to Bridge
     */
    public function approve(Request $request, $id)
    {
        $submission = BridgeKycKybSubmission::where('type', 'kyb')->findOrFail($id);
        
        // Permission is checked via middleware

        DB::beginTransaction();
        try {
            // Check if all required documents are approved before allowing main approval (from VerificationDocument table)
            $requiredDocs = ['business_formation', 'business_ownership', 'id_front'];
            // ID back is only required for drivers_license
            // Get control person from control_persons table
            $controlPersonModel = $submission->controlPerson;
            $controlPerson = $controlPersonModel ? [
                'first_name' => $controlPersonModel->first_name,
                'last_name' => $controlPersonModel->last_name,
                'email' => $controlPersonModel->email,
                'birth_date' => $controlPersonModel->birth_date?->format('Y-m-d'),
                'title' => $controlPersonModel->title,
                'ownership_percentage' => $controlPersonModel->ownership_percentage,
                'ssn' => $controlPersonModel->ssn,
                'id_type' => $controlPersonModel->id_type,
                'id_number' => $controlPersonModel->id_number,
                'street_line_1' => $controlPersonModel->street_line_1,
                'city' => $controlPersonModel->city,
                'state' => $controlPersonModel->state,
                'postal_code' => $controlPersonModel->postal_code,
                'country' => $controlPersonModel->country,
            ] : [];
            if (($controlPerson['id_type'] ?? '') === 'drivers_license') {
                $requiredDocs[] = 'id_back';
            }
            
            $allApproved = true;
            $missingDocs = [];
            foreach ($requiredDocs as $docType) {
                $verificationDoc = VerificationDocument::where('bridge_kyc_kyb_submission_id', $submission->id)
                    ->where('document_type', $docType)
                    ->first();
                
                if (!$verificationDoc || $verificationDoc->status !== 'approved') {
                    $allApproved = false;
                    $missingDocs[] = str_replace('_', ' ', $docType);
                }
            }
            
            if (!$allApproved) {
                DB::rollBack();
                return redirect()->back()->with('error', 'Please approve all required documents before approving the submission. Missing: ' . implode(', ', $missingDocs));
            }

            // If submission hasn't been sent to Bridge yet, or was rejected/needs refill, send it now
            // Only check bridge_response if status is approved (don't store until approved)
            $hasBeenSent = !empty($submission->bridge_response) && $submission->submission_status === 'approved';
            if (!$submission->bridge_customer_id || !$hasBeenSent) {
                Log::info('Sending KYB submission to Bridge upon approval', [
                    'submission_id' => $submission->id,
                    'has_customer_id' => !empty($submission->bridge_customer_id),
                ]);

                // Get submission data
                $customerData = $submission->submission_data ?? [];

                // Source of truth for files is verification_documents
                $docMap = VerificationDocument::where('bridge_kyc_kyb_submission_id', $submission->id)
                    ->pluck('file_path', 'document_type')
                    ->toArray();

                // Always prefer verification_documents paths, fallback to legacy submission_data paths
                $customerData['business_formation_document_path'] = $docMap['business_formation']
                    ?? ($customerData['business_formation_document_path'] ?? null);
                $customerData['business_ownership_document_path'] = $docMap['business_ownership']
                    ?? ($customerData['business_ownership_document_path'] ?? null);
                $customerData['proof_of_address_document_path'] = $docMap['proof_of_address']
                    ?? ($customerData['proof_of_address_document_path'] ?? null);
                $customerData['determination_letter_501c3_document_path'] = $docMap['determination_letter_501c3']
                    ?? ($customerData['determination_letter_501c3_document_path'] ?? null);
                
                // Ensure we have the integration
                $integration = $submission->bridgeIntegration;
                if (!$integration) {
                    throw new \Exception('Bridge integration not found for this submission');
                }

                // Get business data from organization (via bridge_integration)
                $organization = $integration->integratable;
                if (!$organization || !($organization instanceof \App\Models\Organization)) {
                    throw new \Exception('Organization not found for this submission');
                }
                
                // Build business address from organization (map Organization columns to Bridge format)
                // Organization uses: street, city, state, zip
                // Bridge expects: street_line_1, city, subdivision, postal_code, country
                $businessAddress = [
                    'street_line_1' => $organization->street ?? null,
                    'street_line_2' => null, // Organization doesn't have street_line_2
                    'city' => $organization->city ?? null,
                    'subdivision' => $organization->state ?? null,
                    'postal_code' => $organization->zip ?? null,
                    'country' => 'USA', // Default to USA if not specified
                ];
                
                // Validate required address fields for Bridge
                if (empty($businessAddress['street_line_1']) || empty($businessAddress['city']) || 
                    empty($businessAddress['subdivision']) || empty($businessAddress['postal_code'])) {
                    $missingFields = [];
                    if (empty($businessAddress['street_line_1'])) $missingFields[] = 'street';
                    if (empty($businessAddress['city'])) $missingFields[] = 'city';
                    if (empty($businessAddress['subdivision'])) $missingFields[] = 'state';
                    if (empty($businessAddress['postal_code'])) $missingFields[] = 'zip';
                    
                    DB::rollBack();
                    return redirect()->back()->with('error', 
                        'Organization address is incomplete. Please update the organization profile with the following required fields: ' . 
                        implode(', ', $missingFields) . '. Bridge requires a complete registered address.'
                    );
                }
                
                // Get physical address from submission_data if available, otherwise use business address
                $physicalAddress = $customerData['physical_address'] ?? $businessAddress;
                if (is_array($physicalAddress)) {
                    $physicalAddress = array_filter([
                        'street_line_1' => $physicalAddress['street_line_1'] ?? null,
                        'street_line_2' => $physicalAddress['street_line_2'] ?? null,
                        'city' => $physicalAddress['city'] ?? null,
                        'subdivision' => $physicalAddress['subdivision'] ?? $physicalAddress['state'] ?? null,
                        'postal_code' => $physicalAddress['postal_code'] ?? null,
                        'country' => $physicalAddress['country'] ?? 'USA',
                    ]);
                }
                
                // Get business description from submission_data or use default
                $businessDescription = $customerData['business_description'] ?? 'Business operations';
                
                $bridgeCustomerData = [
                    'type' => 'business',
                    'business_legal_name' => $organization->name,
                    'email' => $organization->email,
                    'registered_address' => $businessAddress,
                    'physical_address' => $physicalAddress,
                    'identifying_information' => [
                        [
                            'type' => 'ein',
                            'issuing_country' => 'usa',
                            'number' => $submission->ein ?? $organization->ein,
                        ],
                    ],
                    'business_description' => $businessDescription,
                ];
                
                // REQUIRED fields per Bridge KYB
                $bridgeCustomerData['business_type'] = $customerData['business_type'] ?? $customerData['entity_type'] ?? 'corporation';
                $bridgeCustomerData['is_dao'] = $customerData['is_dao'] ?? $customerData['dao_status'] ?? false;
                $bridgeCustomerData['attested_ownership_structure_at'] = now()->toIso8601String();
                
                // Add entity_type if available (may not be in Bridge API, but store in metadata)
                if (!empty($customerData['entity_type'])) {
                    $bridgeCustomerData['entity_type'] = $customerData['entity_type'];
                }
                
                // Add primary_website if available
                if (!empty($customerData['primary_website'])) {
                    $bridgeCustomerData['primary_website'] = $customerData['primary_website'];
                }
                
                // Add signed_agreement_id if available in integration metadata
                if ($integration->bridge_metadata) {
                    $metadata = is_array($integration->bridge_metadata) 
                        ? $integration->bridge_metadata 
                        : json_decode($integration->bridge_metadata, true);
                    if (!empty($metadata['signed_agreement_id'])) {
                        $bridgeCustomerData['signed_agreement_id'] = $metadata['signed_agreement_id'];
                    }
                }

                // Add control person KYC as ultimate_beneficial_owners (UBO) for business creation
                $controlPersonModel = $submission->controlPerson;
                if ($controlPersonModel) {
                    $controlPerson = [
                        'first_name' => $controlPersonModel->first_name,
                        'last_name' => $controlPersonModel->last_name,
                        'email' => $controlPersonModel->email,
                        'birth_date' => $controlPersonModel->birth_date?->format('Y-m-d'),
                        'title' => $controlPersonModel->title,
                        'ownership_percentage' => $controlPersonModel->ownership_percentage,
                        'ssn' => $controlPersonModel->ssn,
                        'id_type' => $controlPersonModel->id_type,
                        'id_number' => $controlPersonModel->id_number,
                        'street_line_1' => $controlPersonModel->street_line_1,
                        'city' => $controlPersonModel->city,
                        'state' => $controlPersonModel->state,
                        'postal_code' => $controlPersonModel->postal_code,
                        'country' => $controlPersonModel->country,
                    ];
                    
                    // Load ID images from verification_documents table
                    $idFrontImage = null;
                    $idBackImage = null;
                    
                    $idFrontDoc = $submission->getVerificationDocument('id_front');
                    $idBackDoc = $submission->getVerificationDocument('id_back');
                    
                    $idFrontPath = $idFrontDoc?->file_path;
                    $idBackPath = $idBackDoc?->file_path;

                    if ($idFrontPath) {
                        $imagePath = storage_path('app/public/' . $idFrontPath);
                        if (file_exists($imagePath)) {
                            $imageData = file_get_contents($imagePath);
                            $mimeType = $this->getMimeType($idFrontPath);
                            $idFrontImage = "data:{$mimeType};base64," . base64_encode($imageData);
                        }
                    }
                    
                    // Only load back image if not passport (passport only has front)
                    $idType = strtolower($controlPerson['id_type'] ?? 'drivers_license');
                    if ($idType !== 'passport' && $idBackPath) {
                        $imagePath = storage_path('app/public/' . $idBackPath);
                        if (file_exists($imagePath)) {
                            $imageData = file_get_contents($imagePath);
                            $mimeType = $this->getMimeType($idBackPath);
                            $idBackImage = "data:{$mimeType};base64," . base64_encode($imageData);
                        }
                    }

                    $uboIdentifyingInfo = [];
                    if (!empty($controlPerson['ssn'])) {
                        $uboIdentifyingInfo[] = [
                            'type' => 'ssn',
                            'issuing_country' => 'usa',
                            'number' => $controlPerson['ssn'],
                        ];
                    }
                    $idInfo = [
                        'type' => $controlPerson['id_type'] ?? 'drivers_license',
                        'issuing_country' => 'usa',
                        'number' => $controlPerson['id_number'] ?? null,
                    ];
                    
                    // For passport, only image_front is required (no image_back)
                    // For other ID types, both image_front and image_back are needed
                    $idType = strtolower($controlPerson['id_type'] ?? 'drivers_license');
                    if ($idType === 'passport') {
                        // Passport requires image_front - do NOT add if missing
                        if (!empty($idFrontImage)) {
                            $idInfo['image_front'] = $idFrontImage;
                            $uboIdentifyingInfo[] = $idInfo;
                        } else {
                            // If no image_front for passport, skip adding it (Bridge requires it)
                            Log::error('Passport image_front missing for control person - skipping passport ID info', [
                                'control_person_id' => $controlPersonModel->id ?? null,
                                'id_number' => $controlPerson['id_number'] ?? null,
                            ]);
                            // Don't add passport ID info if image_front is missing
                        }
                    } else {
                        // For other ID types (drivers_license, state_id, etc.), include both if available
                        if (!empty($idFrontImage)) {
                            $idInfo['image_front'] = $idFrontImage;
                        }
                        if (!empty($idBackImage)) {
                            $idInfo['image_back'] = $idBackImage;
                        }
                        // Only add ID info if we have at least front image
                        if (!empty($idFrontImage)) {
                            $uboIdentifyingInfo[] = $idInfo;
                        } else {
                            Log::warning('ID front image missing for control person - skipping ID info', [
                                'control_person_id' => $controlPersonModel->id ?? null,
                                'id_type' => $idType,
                            ]);
                        }
                    }

                    $bridgeCustomerData['ultimate_beneficial_owners'] = [
                        [
                            'first_name' => $controlPerson['first_name'] ?? null,
                            'last_name' => $controlPerson['last_name'] ?? null,
                            'email' => $controlPerson['email'] ?? null,
                            'birth_date' => $controlPerson['birth_date'] ?? null,
                            'title' => $controlPerson['title'] ?? 'Owner',
                            'ownership_percentage' => (int)($controlPerson['ownership_percentage'] ?? 25),
                            'has_ownership' => true,
                            'has_control' => true,
                            'is_signer' => true,
                            'address' => [
                                'street_line_1' => $controlPerson['street_line_1'] ?? null,
                                'street_line_2' => null, // Control person doesn't have street_line_2 in new structure
                                'city' => $controlPerson['city'] ?? null,
                                'subdivision' => $controlPerson['state'] ?? null,
                                'postal_code' => $controlPerson['postal_code'] ?? null,
                                'country' => $controlPerson['country'] ?? 'USA',
                            ],
                            'identifying_information' => $uboIdentifyingInfo,
                        ],
                    ];
                    
                    // ALSO add control person as an associated person (they are the same person)
                    $bridgeAssociatedPersons = [
                        [
                            'first_name' => $controlPerson['first_name'] ?? null,
                            'last_name' => $controlPerson['last_name'] ?? null,
                            'email' => $controlPerson['email'] ?? null,
                            'birth_date' => $controlPerson['birth_date'] ?? null,
                            'title' => $controlPerson['title'] ?? 'Owner',
                            'ownership_percentage' => (int)($controlPerson['ownership_percentage'] ?? 25),
                            'has_ownership' => true,
                            'has_control' => true,
                            'is_signer' => true,
                            'residential_address' => [
                                'street_line_1' => $controlPerson['street_line_1'] ?? null,
                                'city' => $controlPerson['city'] ?? null,
                                'subdivision' => $controlPerson['state'] ?? null,
                                'postal_code' => $controlPerson['postal_code'] ?? null,
                                'country' => $controlPerson['country'] ?? 'USA',
                            ],
                            'identifying_information' => $uboIdentifyingInfo,
                        ],
                    ];
                } else {
                    $bridgeAssociatedPersons = [];
                }
                
                // Add additional associated persons from associated_persons table (if any)
                $associatedPersons = $submission->associatedPersons;
                if ($associatedPersons->isNotEmpty()) {
                    foreach ($associatedPersons as $associatedPerson) {
                        // Load ID images from verification_documents
                        // First try to get from associated person's documents, then fall back to submission level
                        $idFrontDoc = $associatedPerson->getIdFrontImage();
                        $idBackDoc = $associatedPerson->getIdBackImage();
                        
                        // If not found at associated person level, try submission level (for control person who is also associated person)
                        if (!$idFrontDoc) {
                            $idFrontDoc = $submission->getVerificationDocument('id_front');
                        }
                        if (!$idBackDoc) {
                            $idBackDoc = $submission->getVerificationDocument('id_back');
                        }
                        
                        $idFrontImage = null;
                        $idBackImage = null;
                        
                        if ($idFrontDoc && $idFrontDoc->file_path) {
                            $imagePath = storage_path('app/public/' . $idFrontDoc->file_path);
                            if (file_exists($imagePath)) {
                                $imageData = file_get_contents($imagePath);
                                $mimeType = $this->getMimeType($idFrontDoc->file_path);
                                $idFrontImage = "data:{$mimeType};base64," . base64_encode($imageData);
                            }
                        }
                        
                        // Only load back image if not passport (passport only has front)
                        $idType = strtolower($associatedPerson->id_type ?? 'drivers_license');
                        if ($idType !== 'passport' && $idBackDoc && $idBackDoc->file_path) {
                            $imagePath = storage_path('app/public/' . $idBackDoc->file_path);
                            if (file_exists($imagePath)) {
                                $imageData = file_get_contents($imagePath);
                                $mimeType = $this->getMimeType($idBackDoc->file_path);
                                $idBackImage = "data:{$mimeType};base64," . base64_encode($imageData);
                            }
                        }
                        
                        $associatedPersonIdentifyingInfo = [];
                        if ($associatedPerson->ssn) {
                            $associatedPersonIdentifyingInfo[] = [
                                'type' => 'ssn',
                                'issuing_country' => 'usa',
                                'number' => $associatedPerson->ssn,
                            ];
                        }
                        $idInfo = [
                            'type' => $associatedPerson->id_type ?? 'drivers_license',
                            'issuing_country' => 'usa',
                            'number' => $associatedPerson->id_number ?? null,
                        ];
                        
                        // For passport, only image_front is required (no image_back)
                        // For other ID types, both image_front and image_back are needed
                        $idType = strtolower($associatedPerson->id_type ?? 'drivers_license');
                        if ($idType === 'passport') {
                            // Passport requires image_front - do NOT add if missing
                            if ($idFrontImage) {
                                $idInfo['image_front'] = $idFrontImage;
                                $associatedPersonIdentifyingInfo[] = $idInfo;
                            } else {
                                // If no image_front for passport, skip adding it (Bridge requires it)
                                Log::error('Passport image_front missing for associated person - skipping passport ID info', [
                                    'associated_person_id' => $associatedPerson->id,
                                    'id_number' => $associatedPerson->id_number,
                                ]);
                                // Don't add passport ID info if image_front is missing
                            }
                        } else {
                            // For other ID types (drivers_license, state_id, etc.), include both if available
                            if ($idFrontImage) {
                                $idInfo['image_front'] = $idFrontImage;
                            }
                            if ($idBackImage) {
                                $idInfo['image_back'] = $idBackImage;
                            }
                            // Only add ID info if we have at least front image
                            if ($idFrontImage) {
                                $associatedPersonIdentifyingInfo[] = $idInfo;
                            } else {
                                Log::warning('ID front image missing for associated person - skipping ID info', [
                                    'associated_person_id' => $associatedPerson->id,
                                    'id_type' => $idType,
                                ]);
                            }
                        }
                        
                        $bridgeAssociatedPersons[] = [
                            'first_name' => $associatedPerson->first_name,
                            'last_name' => $associatedPerson->last_name,
                            'email' => $associatedPerson->email,
                            'birth_date' => $associatedPerson->birth_date?->format('Y-m-d'),
                            'title' => $associatedPerson->title ?? 'Owner',
                            'ownership_percentage' => (int)($associatedPerson->ownership_percentage ?? 25),
                            'has_ownership' => ($associatedPerson->ownership_percentage ?? 0) >= 25,
                            'has_control' => true,
                            'is_signer' => true,
                            'residential_address' => [
                                'street_line_1' => $associatedPerson->street_line_1,
                                'city' => $associatedPerson->city,
                                'subdivision' => $associatedPerson->state,
                                'postal_code' => $associatedPerson->postal_code,
                                'country' => $associatedPerson->country ?? 'USA',
                            ],
                            'identifying_information' => $associatedPersonIdentifyingInfo,
                        ];
                    }
                }
                
                // Set associated_persons in bridgeCustomerData (control person is always included)
                if (!empty($bridgeAssociatedPersons)) {
                    $bridgeCustomerData['associated_persons'] = $bridgeAssociatedPersons;
                }

                // Prepare documents for Bridge API
                // Check which documents admin selected to send
                $documentsToSend = $customerData['documents_to_send'] ?? [];
                
                // If no documents_to_send specified, default to required documents
                if (empty($documentsToSend)) {
                    // Default required documents
                    $documentsToSend = ['business_formation', 'business_ownership', 'id_front'];
                    // Add id_back if not passport
                    $idType = strtolower($controlPerson['id_type'] ?? 'drivers_license');
                    if ($idType !== 'passport') {
                        $documentsToSend[] = 'id_back';
                    }
                }
                
                $documents = [];
                
                // Load business formation document (if selected)
                if (in_array('business_formation', $documentsToSend) && !empty($customerData['business_formation_document_path'])) {
                    $docPath = storage_path('app/public/' . $customerData['business_formation_document_path']);
                    if (file_exists($docPath)) {
                        $docData = file_get_contents($docPath);
                        $mimeType = $this->getMimeType($customerData['business_formation_document_path']);
                        $docBase64 = "data:{$mimeType};base64," . base64_encode($docData);
                        $documents[] = [
                            'purposes' => ['business_formation'],
                            'file' => $docBase64,
                        ];
                    }
                }
                
                // Load business ownership document (if selected)
                if (in_array('business_ownership', $documentsToSend) && !empty($customerData['business_ownership_document_path'])) {
                    $docPath = storage_path('app/public/' . $customerData['business_ownership_document_path']);
                    if (file_exists($docPath)) {
                        $docData = file_get_contents($docPath);
                        $mimeType = $this->getMimeType($customerData['business_ownership_document_path']);
                        $docBase64 = "data:{$mimeType};base64," . base64_encode($docData);
                        $documents[] = [
                            'purposes' => ['ownership_information'],
                            'file' => $docBase64,
                        ];
                    }
                }
                
                // Load proof of address document if available (if selected)
                if (in_array('proof_of_address', $documentsToSend) && !empty($customerData['proof_of_address_document_path'])) {
                    $docPath = storage_path('app/public/' . $customerData['proof_of_address_document_path']);
                    if (file_exists($docPath)) {
                        $docData = file_get_contents($docPath);
                        $mimeType = $this->getMimeType($customerData['proof_of_address_document_path']);
                        $docBase64 = "data:{$mimeType};base64," . base64_encode($docData);
                        $documents[] = [
                            'purposes' => ['proof_of_address'],
                            'file' => $docBase64,
                        ];
                    }
                }
                
                // Load 501c3 Determination Letter for Nonprofit Organizations (if selected)
                // According to Bridge docs: Nonprofits must provide Form 1023 or 1023-EZ in addition to formation documents
                if (in_array('determination_letter_501c3', $documentsToSend)) {
                    $entityType = strtolower($customerData['entity_type'] ?? $customerData['business_type'] ?? '');
                    $isNonprofit = in_array($entityType, ['nonprofit', 'nonprofit_organization', 'non-profit', 'non-profit_organization', '501c3', '501(c)(3)']);
                    
                    if ($isNonprofit && !empty($customerData['determination_letter_501c3_document_path'])) {
                        $docPath = storage_path('app/public/' . $customerData['determination_letter_501c3_document_path']);
                        if (file_exists($docPath)) {
                            $docData = file_get_contents($docPath);
                            $mimeType = $this->getMimeType($customerData['determination_letter_501c3_document_path']);
                            $docBase64 = "data:{$mimeType};base64," . base64_encode($docData);
                            // For nonprofits, the determination letter is sent as an additional business_formation document
                            // Bridge requires: Articles of Incorporation, Certificate of Incorporation, AND Form 1023/1023-EZ
                            $documents[] = [
                                'purposes' => ['business_formation'], // Same purpose as other formation documents
                                'file' => $docBase64,
                            ];
                            
                            Log::info('Including 501c3 Determination Letter for nonprofit organization', [
                                'submission_id' => $submission->id,
                                'entity_type' => $entityType,
                            ]);
                        }
                    }
                }
                
                // Add documents to customer data if we have any
                if (!empty($documents)) {
                    // Get existing documents from Bridge if customer exists
                    $existingDocuments = [];
                    if ($integration->bridge_customer_id) {
                        $customerResult = $this->bridgeService->getCustomer($integration->bridge_customer_id);
                        if ($customerResult['success'] && isset($customerResult['data']['documents'])) {
                            $existingDocuments = $customerResult['data']['documents'] ?? [];
                        }
                    }
                    $bridgeCustomerData['documents'] = array_merge($existingDocuments, $documents);
                }
                
                // Check if customer already exists
                if ($integration->bridge_customer_id) {
                    // Update existing customer (remove associated_persons if present)
                    $updateData = $bridgeCustomerData;
                    unset($updateData['associated_persons']); // Must use separate endpoint
                    unset($updateData['type']); // Type cannot be changed
                    
                    $result = $this->bridgeService->updateCustomer($integration->bridge_customer_id, $updateData);
                    
                    // If update successful and we have associated person data, add it separately
                    if ($result['success'] && !empty($bridgeCustomerData['associated_persons'])) {
                        // Get existing associated persons from Bridge to avoid duplicates
                        $existingBridgePersonsResult = $this->bridgeService->getAssociatedPersons($integration->bridge_customer_id);
                        $existingBridgePersons = [];
                        if ($existingBridgePersonsResult['success'] && is_array($existingBridgePersonsResult['data'])) {
                            $existingBridgePersons = $existingBridgePersonsResult['data'];
                        }
                        
                        // Get associated persons from database
                        $associatedPersons = $submission->associatedPersons;
                        
                        foreach ($bridgeCustomerData['associated_persons'] as $index => $associatedPersonData) {
                            // Try to find matching associated person from database by email
                            $associatedPersonModel = $associatedPersons->firstWhere('email', $associatedPersonData['email']);
                            
                            // If not found, check if this is the control person (by matching email with control person)
                            if (!$associatedPersonModel && $controlPersonModel && $controlPersonModel->email === $associatedPersonData['email']) {
                                // This is the control person - check if it already exists in associated_persons table
                                $associatedPersonModel = $associatedPersons->firstWhere('email', $controlPersonModel->email);
                            }
                            
                            // Check if person already exists in Bridge by email
                            $existingBridgePerson = null;
                            $personEmail = $associatedPersonData['email'] ?? null;
                            if ($personEmail) {
                                foreach ($existingBridgePersons as $existingPerson) {
                                    if (isset($existingPerson['email']) && strtolower(trim($existingPerson['email'])) === strtolower(trim($personEmail))) {
                                        $existingBridgePerson = $existingPerson;
                                        break;
                                    }
                                }
                            }
                            
                            // If person already exists in Bridge, use existing ID instead of creating new one
                            if ($existingBridgePerson && isset($existingBridgePerson['id'])) {
                                Log::info('Associated person already exists in Bridge - skipping creation', [
                                    'customer_id' => $integration->bridge_customer_id,
                                    'associated_person_id' => $existingBridgePerson['id'],
                                    'email' => $personEmail,
                                ]);
                                
                                // Use existing person data from Bridge response
                                $personResult = [
                                    'success' => true,
                                    'data' => $existingBridgePerson,
                                ];
                            } else {
                                // Check if person already has bridge_associated_person_id in database
                                if ($associatedPersonModel && $associatedPersonModel->bridge_associated_person_id) {
                                    $storedBridgeId = $associatedPersonModel->bridge_associated_person_id;
                                    
                                    Log::info('Associated person already has Bridge ID in database - verifying existence', [
                                        'customer_id' => $integration->bridge_customer_id,
                                        'stored_id' => $storedBridgeId,
                                        'email' => $personEmail,
                                    ]);
                                    
                                    // Try to get the person from Bridge to verify it exists
                                    $existingBridgePersonsResult = $this->bridgeService->getAssociatedPersons($integration->bridge_customer_id);
                                    $foundInBridge = false;
                                    if ($existingBridgePersonsResult['success'] && is_array($existingBridgePersonsResult['data'])) {
                                        foreach ($existingBridgePersonsResult['data'] as $existingPerson) {
                                            if (isset($existingPerson['id']) && $existingPerson['id'] === $storedBridgeId) {
                                                $personResult = [
                                                    'success' => true,
                                                    'data' => $existingPerson,
                                                ];
                                                $foundInBridge = true;
                                                break;
                                            }
                                        }
                                    }
                                    
                                    if (!$foundInBridge) {
                                        // ID exists in DB but not in Bridge - create it
                                        Log::warning('Associated person ID exists in DB but not in Bridge - creating new one', [
                                            'customer_id' => $integration->bridge_customer_id,
                                            'stored_id' => $storedBridgeId,
                                            'email' => $personEmail,
                                        ]);
                                        $personResult = $this->bridgeService->createAssociatedPerson($integration->bridge_customer_id, $associatedPersonData);
                                    }
                                } else {
                                    // Create associated person in Bridge
                                    $personResult = $this->bridgeService->createAssociatedPerson($integration->bridge_customer_id, $associatedPersonData);
                                }
                            }
                            
                            if ($personResult['success'] && isset($personResult['data']['id'])) {
                                $associatedPersonId = $personResult['data']['id'];
                                
                                // Save Bridge response to submission
                                $existingBridgeResponse = $submission->bridge_response ?? [];
                                if (!is_array($existingBridgeResponse)) {
                                    // If bridge_response is not an array (e.g., it's the customer response), convert it
                                    $existingBridgeResponse = [
                                        'customer' => $existingBridgeResponse,
                                    ];
                                }
                                
                                // Store associated person response
                                if (!isset($existingBridgeResponse['associated_persons'])) {
                                    $existingBridgeResponse['associated_persons'] = [];
                                }
                                
                                // Check if this associated person already exists in the response (by email or ID)
                                $existingIndex = null;
                                foreach ($existingBridgeResponse['associated_persons'] as $idx => $existingPerson) {
                                    if (isset($existingPerson['email']) && $existingPerson['email'] === $associatedPersonData['email']) {
                                        $existingIndex = $idx;
                                        break;
                                    }
                                    if (isset($existingPerson['bridge_associated_person_id']) && $existingPerson['bridge_associated_person_id'] === $associatedPersonId) {
                                        $existingIndex = $idx;
                                        break;
                                    }
                                }
                                
                                $personResponseData = [
                                    'email' => $associatedPersonData['email'],
                                    'bridge_associated_person_id' => $associatedPersonId,
                                    'response' => $personResult['data'],
                                    'created_at' => now()->toIso8601String(),
                                ];
                                
                                if ($existingIndex !== null) {
                                    // Update existing entry
                                    $existingBridgeResponse['associated_persons'][$existingIndex] = $personResponseData;
                                } else {
                                    // Add new entry
                                    $existingBridgeResponse['associated_persons'][] = $personResponseData;
                                }
                                
                                // Only store bridge_response if submission is approved
                                // Don't store until approved to allow re-sending after reject/refill
                                if ($submission->submission_status === 'approved') {
                                    $submission->bridge_response = $existingBridgeResponse;
                                    $submission->save();
                                }
                                
                                Log::info('Associated person created successfully in Bridge', [
                                    'customer_id' => $integration->bridge_customer_id,
                                    'associated_person_id' => $associatedPersonId,
                                    'email' => $associatedPersonData['email'],
                                ]);
                                
                                // Extract SSN, ID type, and ID number from identifying_information
                                $ssn = null;
                                $idType = null;
                                $idNumber = null;
                                if (!empty($associatedPersonData['identifying_information']) && is_array($associatedPersonData['identifying_information'])) {
                                    foreach ($associatedPersonData['identifying_information'] as $info) {
                                        if (isset($info['type']) && $info['type'] === 'ssn') {
                                            $ssn = $info['number'] ?? null;
                                        }
                                        if (isset($info['type']) && $info['type'] !== 'ssn' && !$idType) {
                                            $idType = $info['type'] ?? null;
                                            $idNumber = $info['number'] ?? null;
                                        }
                                    }
                                }
                                
                                // Update or create associated person in database
                                if ($associatedPersonModel) {
                                    $associatedPersonModel->bridge_associated_person_id = $associatedPersonId;
                                    // Update missing fields if they exist
                                    if ($ssn && !$associatedPersonModel->ssn) {
                                        $associatedPersonModel->ssn = $ssn;
                                    }
                                    if ($idType && !$associatedPersonModel->id_type) {
                                        $associatedPersonModel->id_type = $idType;
                                    }
                                    if ($idNumber && !$associatedPersonModel->id_number) {
                                        $associatedPersonModel->id_number = $idNumber;
                                    }
                                    $associatedPersonModel->save();
                                } else {
                                    // Create new associated person record (this includes control person if not already in table)
                                    $associatedPersonModel = \App\Models\AssociatedPerson::create([
                                        'bridge_kyc_kyb_submission_id' => $submission->id,
                                        'first_name' => $associatedPersonData['first_name'],
                                        'last_name' => $associatedPersonData['last_name'],
                                        'email' => $associatedPersonData['email'],
                                        'birth_date' => $associatedPersonData['birth_date'],
                                        'title' => $associatedPersonData['title'] ?? 'Owner',
                                        'ownership_percentage' => (int)($associatedPersonData['ownership_percentage'] ?? 25),
                                        'street_line_1' => $associatedPersonData['residential_address']['street_line_1'] ?? null,
                                        'city' => $associatedPersonData['residential_address']['city'] ?? null,
                                        'state' => $associatedPersonData['residential_address']['subdivision'] ?? null,
                                        'postal_code' => $associatedPersonData['residential_address']['postal_code'] ?? null,
                                        'country' => $associatedPersonData['residential_address']['country'] ?? 'USA',
                                        'ssn' => $ssn,
                                        'id_type' => $idType,
                                        'id_number' => $idNumber,
                                        'bridge_associated_person_id' => $associatedPersonId,
                                    ]);
                                }
                                
                                // If this is the control person, also update control_persons table
                                if ($controlPersonModel && $controlPersonModel->email === $associatedPersonData['email']) {
                                    $controlPersonModel->bridge_associated_person_id = $associatedPersonId;
                                    $controlPersonModel->save();
                                    
                                    Log::info('Updated control person with bridge_associated_person_id', [
                                        'control_person_id' => $controlPersonModel->id,
                                        'bridge_associated_person_id' => $associatedPersonId,
                                    ]);
                                }
                                
                                // Get KYC link for the customer (handles UBO/associated person verification including selfie)
                                $kycLinkResult = $this->bridgeService->getCustomerKycLink($integration->bridge_customer_id);
                                
                                if ($kycLinkResult['success'] && isset($kycLinkResult['data']['url'])) {
                                    $kycLink = $kycLinkResult['data']['url'];
                                    
                                    // Convert the KYC link for iframe embedding
                                    // Replace /verify with /widget for iframe use
                                    $iframeKycLink = str_replace('/verify', '/widget', $kycLink);
                                    
                                    // Add iframe-origin parameter
                                    $separator = strpos($iframeKycLink, '?') !== false ? '&' : '?';
                                    $iframeKycLink .= $separator . 'iframe-origin=' . urlencode(config('app.url'));
                                    
                                    // Store KYC link in integration
                                    $integration->kyc_link_url = $kycLink;
                                    $integration->save();
                                    
                                    // Update associated person with KYC links
                                    if ($associatedPersonModel) {
                                        $associatedPersonModel->kyc_link = $kycLink;
                                        $associatedPersonModel->iframe_kyc_link = $iframeKycLink;
                                        $associatedPersonModel->save();
                                        
                                        Log::info('Updated associated person with KYC links', [
                                            'associated_person_id' => $associatedPersonModel->id,
                                            'kyc_link' => $kycLink,
                                        ]);
                                    }
                                    
                                    // Store in submission data for reference
                                    $submissionData = $submission->submission_data ?? [];
                                    $submissionData['kyc_link'] = $kycLink;
                                    $submissionData['iframe_kyc_link'] = $iframeKycLink;
                                    $submissionData['associated_person_id'] = $associatedPersonId;
                                    $submission->submission_data = $submissionData;
                                    $submission->save();
                                    
                                    Log::info('KYC link generated for associated person verification', [
                                        'customer_id' => $integration->bridge_customer_id,
                                        'associated_person_id' => $associatedPersonId,
                                        'kyc_link' => $kycLink,
                                    ]);
                                } else {
                                    Log::warning('Failed to get KYC link for customer after creating associated person', [
                                        'customer_id' => $integration->bridge_customer_id,
                                        'error' => $kycLinkResult['error'] ?? 'Unknown error',
                                    ]);
                                }
                            } else {
                                Log::warning('Failed to add associated person after customer update', [
                                    'customer_id' => $integration->bridge_customer_id,
                                    'error' => $personResult['error'] ?? 'Unknown error',
                                ]);
                            }
                        }
                    }
                } else {
                    // Create new customer (without associated_persons - they must be added separately)
                    $customerDataForCreation = $bridgeCustomerData;
                    unset($customerDataForCreation['associated_persons']); // Remove before creation
                    
                    $result = $this->bridgeService->createBusinessCustomer($customerDataForCreation);
                    
                    if ($result['success'] && isset($result['data']['id'])) {
                        $integration->bridge_customer_id = $result['data']['id'];
                        $integration->save(); // Save immediately
                        
                        // Now add associated person separately
                        if (!empty($bridgeCustomerData['associated_persons'])) {
                            // Get existing associated persons from Bridge to avoid duplicates
                            $existingBridgePersonsResult = $this->bridgeService->getAssociatedPersons($integration->bridge_customer_id);
                            $existingBridgePersons = [];
                            if ($existingBridgePersonsResult['success'] && is_array($existingBridgePersonsResult['data'])) {
                                $existingBridgePersons = $existingBridgePersonsResult['data'];
                            }
                            
                            // Get associated persons from database
                            $associatedPersons = $submission->associatedPersons;
                            
                            foreach ($bridgeCustomerData['associated_persons'] as $index => $associatedPersonData) {
                                // Try to find matching associated person from database by email
                                $associatedPersonModel = $associatedPersons->firstWhere('email', $associatedPersonData['email']);
                                
                                // If not found, check if this is the control person (by matching email with control person)
                                if (!$associatedPersonModel && $controlPersonModel && $controlPersonModel->email === $associatedPersonData['email']) {
                                    // This is the control person - check if it already exists in associated_persons table
                                    $associatedPersonModel = $associatedPersons->firstWhere('email', $controlPersonModel->email);
                                }
                                
                                // Check if person already exists in Bridge by email
                                $existingBridgePerson = null;
                                $personEmail = $associatedPersonData['email'] ?? null;
                                if ($personEmail) {
                                    foreach ($existingBridgePersons as $existingPerson) {
                                        if (isset($existingPerson['email']) && strtolower(trim($existingPerson['email'])) === strtolower(trim($personEmail))) {
                                            $existingBridgePerson = $existingPerson;
                                            break;
                                        }
                                    }
                                }
                                
                                // If person already exists in Bridge, use existing ID instead of creating new one
                                if ($existingBridgePerson && isset($existingBridgePerson['id'])) {
                                    Log::info('Associated person already exists in Bridge - skipping creation', [
                                        'customer_id' => $integration->bridge_customer_id,
                                        'associated_person_id' => $existingBridgePerson['id'],
                                        'email' => $personEmail,
                                    ]);
                                    
                                    // Use existing person data from Bridge response
                                    $personResult = [
                                        'success' => true,
                                        'data' => $existingBridgePerson,
                                    ];
                                } else {
                                    // Check if person already has bridge_associated_person_id in database
                                    if ($associatedPersonModel && $associatedPersonModel->bridge_associated_person_id) {
                                        $storedBridgeId = $associatedPersonModel->bridge_associated_person_id;
                                        
                                        Log::info('Associated person already has Bridge ID in database - verifying existence', [
                                            'customer_id' => $integration->bridge_customer_id,
                                            'stored_id' => $storedBridgeId,
                                            'email' => $personEmail,
                                        ]);
                                        
                                        // Try to get the person from Bridge to verify it exists
                                        $existingBridgePersonsResult = $this->bridgeService->getAssociatedPersons($integration->bridge_customer_id);
                                        $foundInBridge = false;
                                        if ($existingBridgePersonsResult['success'] && is_array($existingBridgePersonsResult['data'])) {
                                            foreach ($existingBridgePersonsResult['data'] as $existingPerson) {
                                                if (isset($existingPerson['id']) && $existingPerson['id'] === $storedBridgeId) {
                                                    $personResult = [
                                                        'success' => true,
                                                        'data' => $existingPerson,
                                                    ];
                                                    $foundInBridge = true;
                                                    break;
                                                }
                                            }
                                        }
                                        
                                        if (!$foundInBridge) {
                                            // ID exists in DB but not in Bridge - create it
                                            Log::warning('Associated person ID exists in DB but not in Bridge - creating new one', [
                                                'customer_id' => $integration->bridge_customer_id,
                                                'stored_id' => $storedBridgeId,
                                                'email' => $personEmail,
                                            ]);
                                            $personResult = $this->bridgeService->createAssociatedPerson($integration->bridge_customer_id, $associatedPersonData);
                                        }
                                    } else {
                                        // Create associated person in Bridge FIRST
                                        $personResult = $this->bridgeService->createAssociatedPerson($integration->bridge_customer_id, $associatedPersonData);
                                    }
                                }
                                
                                if ($personResult['success'] && isset($personResult['data']['id'])) {
                                    $associatedPersonId = $personResult['data']['id'];
                                    
                                    // Save Bridge response to submission
                                    $existingBridgeResponse = $submission->bridge_response ?? [];
                                    if (!is_array($existingBridgeResponse)) {
                                        // If bridge_response is not an array (e.g., it's the customer response), convert it
                                        $existingBridgeResponse = [
                                            'customer' => $existingBridgeResponse,
                                        ];
                                    }
                                    
                                    // Store associated person response
                                    if (!isset($existingBridgeResponse['associated_persons'])) {
                                        $existingBridgeResponse['associated_persons'] = [];
                                    }
                                    
                                    // Check if this associated person already exists in the response (by email or ID)
                                    $existingIndex = null;
                                    foreach ($existingBridgeResponse['associated_persons'] as $idx => $existingPerson) {
                                        if (isset($existingPerson['email']) && $existingPerson['email'] === $associatedPersonData['email']) {
                                            $existingIndex = $idx;
                                            break;
                                        }
                                        if (isset($existingPerson['bridge_associated_person_id']) && $existingPerson['bridge_associated_person_id'] === $associatedPersonId) {
                                            $existingIndex = $idx;
                                            break;
                                        }
                                    }
                                    
                                    $personResponseData = [
                                        'email' => $associatedPersonData['email'],
                                        'bridge_associated_person_id' => $associatedPersonId,
                                        'response' => $personResult['data'],
                                        'created_at' => now()->toIso8601String(),
                                    ];
                                    
                                    if ($existingIndex !== null) {
                                        // Update existing entry
                                        $existingBridgeResponse['associated_persons'][$existingIndex] = $personResponseData;
                                    } else {
                                        // Add new entry
                                        $existingBridgeResponse['associated_persons'][] = $personResponseData;
                                    }
                                    
                                    // Only store bridge_response if submission is approved
                                    // Don't store until approved to allow re-sending after reject/refill
                                    if ($submission->submission_status === 'approved') {
                                        $submission->bridge_response = $existingBridgeResponse;
                                        $submission->save();
                                    }
                                    
                                    Log::info('Associated person created successfully in Bridge', [
                                        'customer_id' => $integration->bridge_customer_id,
                                        'associated_person_id' => $associatedPersonId,
                                        'email' => $associatedPersonData['email'],
                                    ]);
                                    
                                    // Extract SSN, ID type, and ID number from identifying_information
                                    $ssn = null;
                                    $idType = null;
                                    $idNumber = null;
                                    if (!empty($associatedPersonData['identifying_information']) && is_array($associatedPersonData['identifying_information'])) {
                                        foreach ($associatedPersonData['identifying_information'] as $info) {
                                            if (isset($info['type']) && $info['type'] === 'ssn') {
                                                $ssn = $info['number'] ?? null;
                                            }
                                            if (isset($info['type']) && $info['type'] !== 'ssn' && !$idType) {
                                                $idType = $info['type'] ?? null;
                                                $idNumber = $info['number'] ?? null;
                                            }
                                        }
                                    }
                                    
                                    // Update or create associated person in database
                                    if ($associatedPersonModel) {
                                        $associatedPersonModel->bridge_associated_person_id = $associatedPersonId;
                                        // Update missing fields if they exist
                                        if ($ssn && !$associatedPersonModel->ssn) {
                                            $associatedPersonModel->ssn = $ssn;
                                        }
                                        if ($idType && !$associatedPersonModel->id_type) {
                                            $associatedPersonModel->id_type = $idType;
                                        }
                                        if ($idNumber && !$associatedPersonModel->id_number) {
                                            $associatedPersonModel->id_number = $idNumber;
                                        }
                                        $associatedPersonModel->save();
                                    } else {
                                        // Create new associated person record (this includes control person if not already in table)
                                        $associatedPersonModel = \App\Models\AssociatedPerson::create([
                                            'bridge_kyc_kyb_submission_id' => $submission->id,
                                            'first_name' => $associatedPersonData['first_name'],
                                            'last_name' => $associatedPersonData['last_name'],
                                            'email' => $associatedPersonData['email'],
                                            'birth_date' => $associatedPersonData['birth_date'],
                                            'title' => $associatedPersonData['title'] ?? 'Owner',
                                            'ownership_percentage' => (int)($associatedPersonData['ownership_percentage'] ?? 25),
                                            'street_line_1' => $associatedPersonData['residential_address']['street_line_1'] ?? null,
                                            'city' => $associatedPersonData['residential_address']['city'] ?? null,
                                            'state' => $associatedPersonData['residential_address']['subdivision'] ?? null,
                                            'postal_code' => $associatedPersonData['residential_address']['postal_code'] ?? null,
                                            'country' => $associatedPersonData['residential_address']['country'] ?? 'USA',
                                            'ssn' => $ssn,
                                            'id_type' => $idType,
                                            'id_number' => $idNumber,
                                            'bridge_associated_person_id' => $associatedPersonId,
                                        ]);
                                    }
                                    
                                    // If this is the control person, also update control_persons table
                                    if ($controlPersonModel && $controlPersonModel->email === $associatedPersonData['email']) {
                                        $controlPersonModel->bridge_associated_person_id = $associatedPersonId;
                                        $controlPersonModel->save();
                                        
                                        Log::info('Updated control person with bridge_associated_person_id', [
                                            'control_person_id' => $controlPersonModel->id,
                                            'bridge_associated_person_id' => $associatedPersonId,
                                        ]);
                                    }
                                    
                                    // THEN get KYC link for the customer (handles UBO/associated person verification including selfie)
                                    $kycLinkResult = $this->bridgeService->getCustomerKycLink($integration->bridge_customer_id);
                                    
                                    if ($kycLinkResult['success'] && isset($kycLinkResult['data']['url'])) {
                                        $kycLink = $kycLinkResult['data']['url'];
                                        
                                        // Convert the KYC link for iframe embedding
                                        // Replace /verify with /widget for iframe use
                                        $iframeKycLink = str_replace('/verify', '/widget', $kycLink);
                                        
                                        // Add iframe-origin parameter
                                        $separator = strpos($iframeKycLink, '?') !== false ? '&' : '?';
                                        $iframeKycLink .= $separator . 'iframe-origin=' . urlencode(config('app.url'));
                                        
                                        // Store KYC link in integration
                                        $integration->kyc_link_url = $kycLink;
                                        $integration->save();
                                        
                                        // Update associated person with KYC links
                                        if ($associatedPersonModel) {
                                            $associatedPersonModel->kyc_link = $kycLink;
                                            $associatedPersonModel->iframe_kyc_link = $iframeKycLink;
                                            $associatedPersonModel->save();
                                            
                                            Log::info('Updated associated person with KYC links', [
                                                'associated_person_id' => $associatedPersonModel->id,
                                                'kyc_link' => $kycLink,
                                            ]);
                                        }
                                        
                                        // Store in submission data for reference
                                        $submissionData = $submission->submission_data ?? [];
                                        $submissionData['kyc_link'] = $kycLink;
                                        $submissionData['iframe_kyc_link'] = $iframeKycLink;
                                        $submissionData['associated_person_id'] = $associatedPersonId;
                                        $submission->submission_data = $submissionData;
                                        $submission->save();
                                        
                                        Log::info('KYC link generated for associated person verification', [
                                            'customer_id' => $integration->bridge_customer_id,
                                            'associated_person_id' => $associatedPersonId,
                                            'kyc_link' => $kycLink,
                                        ]);
                                    } else {
                                        Log::warning('Failed to get KYC link for customer after creating associated person', [
                                            'customer_id' => $integration->bridge_customer_id,
                                            'error' => $kycLinkResult['error'] ?? 'Unknown error',
                                        ]);
                                    }
                                } else {
                                    Log::error('Failed to create associated person after customer creation', [
                                        'customer_id' => $integration->bridge_customer_id,
                                        'error' => $personResult['error'] ?? 'Unknown error',
                                    ]);
                                    // Don't fail the entire approval - customer is created
                                }
                            }
                        }
                    }
                }

                if (!$result['success']) {
                    throw new \Exception($result['error'] ?? 'Failed to send KYB data to Bridge');
                }

                // Update submission with Bridge response
                $submission->bridge_customer_id = $integration->bridge_customer_id;
                
                // Check Bridge response status - if "active" or "approved", set to approved immediately
                // Only store bridge_response when status is approved
                $bridgeKybStatus = $result['data']['kyb_status'] ?? null;
                $bridgeCustomerStatus = $result['data']['status'] ?? null;
                
                // Bridge Customer statuses: not_started, active, under_review, rejected
                // Bridge KYB statuses: not_started, incomplete, under_review, awaiting_questionnaire, awaiting_ubo, approved, rejected, paused, offboarded
                // "active" customer status means approved, so map it to "approved"
                $isApproved = false;
                if ($bridgeKybStatus) {
                    $normalizedStatus = $this->normalizeStatus($bridgeKybStatus);
                    $isApproved = ($normalizedStatus === 'approved');
                } elseif ($bridgeCustomerStatus) {
                    // For customer status, "active" means approved
                    $isApproved = (strtolower($bridgeCustomerStatus) === 'active');
                }
                
                if ($isApproved) {
                    // Bridge returned active/approved status - update immediately
                    $submission->submission_status = 'approved';
                    $integration->kyb_status = 'approved';
                    
                    // NOW store bridge_response since it's approved
                    // Preserve associated persons responses if they exist
                    $existingBridgeResponse = $submission->bridge_response ?? [];
                    if (is_array($existingBridgeResponse) && isset($existingBridgeResponse['associated_persons'])) {
                        // Merge customer response with existing associated persons responses
                        $submission->bridge_response = array_merge(
                            ['customer' => $result['data']],
                            ['associated_persons' => $existingBridgeResponse['associated_persons']]
                        );
                    } else {
                        // No associated persons yet, just save customer response
                        $submission->bridge_response = $result['data'];
                    }
                    
                    Log::info('KYB submission approved immediately from Bridge response', [
                        'submission_id' => $submission->id,
                        'customer_id' => $integration->bridge_customer_id,
                        'bridge_kyb_status' => $bridgeKybStatus,
                        'bridge_customer_status' => $bridgeCustomerStatus,
                    ]);
                    
                    // Auto-create wallet, virtual account, and card account when approved instantly
                    if ($integration->bridge_customer_id) {
                        try {
                            $webhookController = new \App\Http\Controllers\BridgeWebhookController($this->bridgeService);
                            $webhookController->createWalletVirtualAccountAndCardAccount($integration, $integration->bridge_customer_id);
                            
                            Log::info('Wallet, virtual account, and card account created for instant approval', [
                                'integration_id' => $integration->id,
                                'customer_id' => $integration->bridge_customer_id,
                            ]);
                        } catch (\Exception $e) {
                            Log::error('Failed to create wallet/virtual account/card account on instant approval', [
                                'integration_id' => $integration->id,
                                'customer_id' => $integration->bridge_customer_id,
                                'error' => $e->getMessage(),
                                'trace' => $e->getTraceAsString(),
                            ]);
                        }
                    }
                } else {
                    // Bridge returned other status - move into review
                $submission->submission_status = 'under_review';
                    $integration->kyb_status = $this->normalizeStatus($bridgeKybStatus) ?: 'under_review';
                    
                    Log::info('KYB submission sent to Bridge - status under review', [
                        'submission_id' => $submission->id,
                        'customer_id' => $integration->bridge_customer_id,
                        'bridge_kyb_status' => $bridgeKybStatus,
                        'bridge_customer_status' => $bridgeCustomerStatus,
                    ]);
                }
                
                $submission->save();
                $integration->save();

                // Verify webhook is configured and log webhook info
                $this->verifyWebhookConfiguration();

                // Fetch latest customer status from Bridge to ensure we have the most up-to-date status
                // This helps catch any status changes that might have happened after document upload
                try {
                    $customerResult = $this->bridgeService->getCustomer($integration->bridge_customer_id);
                    if ($customerResult['success'] && isset($customerResult['data'])) {
                        $latestCustomerData = $customerResult['data'];
                        $latestKybStatus = $latestCustomerData['kyb_status'] ?? null;
                        $latestCustomerStatus = $latestCustomerData['status'] ?? null;
                        
                        // Check if status is active/approved
                        $isApproved = false;
                        $normalizedStatus = null;
                        
                        if ($latestKybStatus) {
                            $normalizedStatus = $this->normalizeStatus($latestKybStatus);
                            $isApproved = ($normalizedStatus === 'approved');
                        } elseif ($latestCustomerStatus) {
                            $isApproved = (strtolower($latestCustomerStatus) === 'active');
                            $normalizedStatus = 'approved'; // Map active to approved
                        }
                        
                        if ($isApproved && $integration->kyb_status !== 'approved') {
                            // Status changed to approved - update both submission and integration
                            $submission->submission_status = 'approved';
                            $integration->kyb_status = 'approved';
                            $submission->save();
                $integration->save();
                            
                            Log::info('KYB status changed to approved after document approval - updating integration and submission', [
                                'customer_id' => $integration->bridge_customer_id,
                                'old_status' => $integration->kyb_status,
                                'new_status' => 'approved',
                                'bridge_kyb_status' => $latestKybStatus,
                                'bridge_customer_status' => $latestCustomerStatus,
                            ]);
                            
                            // Auto-create wallet, virtual account, and card account when approved instantly
                            if ($integration->bridge_customer_id) {
                                try {
                                    $webhookController = new \App\Http\Controllers\BridgeWebhookController($this->bridgeService);
                                    $webhookController->createWalletVirtualAccountAndCardAccount($integration, $integration->bridge_customer_id);
                                    
                                    Log::info('Wallet, virtual account, and card account created for instant approval (after status fetch)', [
                                        'integration_id' => $integration->id,
                                        'customer_id' => $integration->bridge_customer_id,
                                    ]);
                                } catch (\Exception $e) {
                                    Log::error('Failed to create wallet/virtual account/card account on instant approval (after status fetch)', [
                                        'integration_id' => $integration->id,
                                        'customer_id' => $integration->bridge_customer_id,
                                        'error' => $e->getMessage(),
                                        'trace' => $e->getTraceAsString(),
                                    ]);
                                }
                            }
                        } elseif ($latestKybStatus && $latestKybStatus !== $integration->kyb_status) {
                            // Status changed but not to approved
                            $integration->kyb_status = $normalizedStatus ?: $this->normalizeStatus($latestKybStatus);
                            $integration->save();
                            
                            Log::info('KYB status changed after document approval - updating integration', [
                                'customer_id' => $integration->bridge_customer_id,
                                'old_status' => $integration->kyb_status,
                                'new_status' => $normalizedStatus,
                                'bridge_kyb_status' => $latestKybStatus,
                            ]);
                        }
                        
                        Log::info('Fetched latest customer status from Bridge', [
                            'customer_id' => $integration->bridge_customer_id,
                            'kyb_status' => $latestKybStatus ?? 'unknown',
                            'kyc_status' => $latestCustomerData['kyc_status'] ?? 'unknown',
                            'customer_status' => $latestCustomerStatus ?? 'unknown',
                            'is_approved' => $isApproved,
                        ]);
                    }
                } catch (\Exception $e) {
                    Log::warning('Failed to fetch latest customer status from Bridge', [
                        'customer_id' => $integration->bridge_customer_id,
                        'error' => $e->getMessage(),
                    ]);
                }

                Log::info('KYB submission sent to Bridge and in_review', [
                    'submission_id' => $submission->id,
                    'customer_id' => $integration->bridge_customer_id,
                    'admin_id' => $request->user()->id,
                    'bridge_kyb_status' => $result['data']['kyb_status'] ?? 'unknown',
                    'webhook_url' => config('app.url') . '/webhooks/bridge',
                    'webhook_configured' => $this->isWebhookConfigured(),
                ]);
            } else {
                // Already sent to Bridge, fetch latest status and update accordingly
                // Get integration from submission
                $integration = $submission->bridgeIntegration;
                if (!$integration) {
                    Log::warning('KYB submission bridge integration not found (already sent)', [
                        'submission_id' => $submission->id,
                    ]);
                    DB::commit();
                    return redirect()->back()->with('error', 'Bridge integration not found.');
                }
                
                try {
                    $customerResult = $this->bridgeService->getCustomer($integration->bridge_customer_id);
                    if ($customerResult['success'] && isset($customerResult['data'])) {
                        $customerData = $customerResult['data'];
                        $bridgeKybStatus = $customerData['kyb_status'] ?? null;
                        $bridgeCustomerStatus = $customerData['status'] ?? null;
                        
                        // Check if status is active/approved
                        $isApproved = false;
                        if ($bridgeKybStatus) {
                            $normalizedStatus = $this->normalizeStatus($bridgeKybStatus);
                            $isApproved = ($normalizedStatus === 'approved');
                        } elseif ($bridgeCustomerStatus) {
                            $isApproved = (strtolower($bridgeCustomerStatus) === 'active');
                        }
                        
                        if ($isApproved) {
                            $submission->submission_status = 'approved';
                            $integration->kyb_status = 'approved';
                            
                            Log::info('KYB submission approved from Bridge status check (already sent)', [
                                'submission_id' => $submission->id,
                                'customer_id' => $integration->bridge_customer_id,
                                'bridge_kyb_status' => $bridgeKybStatus,
                                'bridge_customer_status' => $bridgeCustomerStatus,
                            ]);
                        } else {
                            $submission->submission_status = 'under_review';
                            $integration->kyb_status = $this->normalizeStatus($bridgeKybStatus) ?: 'under_review';

                Log::info('KYB submission in_review (already sent to Bridge)', [
                    'submission_id' => $submission->id,
                                'customer_id' => $integration->bridge_customer_id,
                                'bridge_kyb_status' => $bridgeKybStatus,
                                'bridge_customer_status' => $bridgeCustomerStatus,
                            ]);
                        }
                    } else {
                        // Fallback if can't fetch from Bridge
                        $submission->submission_status = 'under_review';
                        $integration->kyb_status = 'under_review';
                        
                        Log::warning('Failed to fetch customer status from Bridge (already sent)', [
                            'submission_id' => $submission->id,
                            'customer_id' => $integration->bridge_customer_id,
                            'error' => $customerResult['error'] ?? 'Unknown error',
                        ]);
                    }
                } catch (\Exception $e) {
                    // Fallback on error
                    $submission->submission_status = 'under_review';
                    $integration->kyb_status = 'under_review';
                    
                    Log::error('Exception while checking Bridge status (already sent)', [
                        'submission_id' => $submission->id,
                        'customer_id' => $integration->bridge_customer_id,
                        'error' => $e->getMessage(),
                    ]);
                }
                
                $submission->save();
                $integration->save();
            }

            DB::commit();

            return redirect()->back()->with('success', 'KYB submission approved and sent to Bridge successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to approve KYB submission', [
                'submission_id' => $submission->id,
                'error' => $e->getMessage(),
            ]);

            return redirect()->back()->with('error', 'Failed to approve KYB submission: ' . $e->getMessage());
        }
    }

    /**
     * Update direct Bridge submission setting
     */
    public function updateDirectBridgeSetting(Request $request)
    {
        $request->validate([
            'enabled' => 'required|boolean',
        ]);

        \App\Models\AdminSetting::set('kyb_direct_bridge_submission', $request->enabled, 'boolean');

        // Get the updated value to return and verify
        $updatedValue = \App\Models\AdminSetting::get('kyb_direct_bridge_submission', false);

        Log::info('KYB direct Bridge submission setting updated', [
            'enabled' => $request->enabled,
            'stored_value' => $updatedValue,
            'admin_id' => $request->user()->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Setting updated successfully',
            'enabled' => $updatedValue,
        ]);
    }

    /**
     * Reject a KYB submission
     */
    public function reject(Request $request, $id)
    {
        $request->validate([
            'rejection_reason' => 'required|string|max:1000',
        ]);

        $submission = BridgeKycKybSubmission::where('type', 'kyb')->findOrFail($id);
        
        // Permission is checked via middleware

        DB::beginTransaction();
        try {
            $submission->submission_status = 'rejected';
            
            // Clear bridge_response when rejecting so it can be sent again after refill
            $submission->bridge_response = null;
            
            // Store rejection reason in submission_data
            $submissionData = $submission->submission_data ?? [];
            $submissionData['rejection_reason'] = $request->rejection_reason;
            $submissionData['rejected_at'] = now()->toDateTimeString();
            $submissionData['rejected_by'] = $request->user()->id;
            $submission->submission_data = $submissionData;
            
            $submission->save();

            // Update Bridge integration status if exists
            if ($submission->bridgeIntegration) {
                $submission->bridgeIntegration->kyb_status = 'rejected';
                $submission->bridgeIntegration->save();
            }

            Log::info('KYB submission rejected by admin', [
                'submission_id' => $submission->id,
                'admin_id' => $request->user()->id,
                'business_name' => $submission->business_name,
                'rejection_reason' => $request->rejection_reason,
            ]);

            DB::commit();

            return redirect()->back()->with('success', 'KYB submission rejected successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to reject KYB submission', [
                'submission_id' => $submission->id,
                'error' => $e->getMessage(),
            ]);

            return redirect()->back()->with('error', 'Failed to reject KYB submission.');
        }
    }

    /**
     * Approve a specific document in a KYB submission
     */
    public function approveDocument(Request $request, $id, $documentType)
    {
        $request->validate([
            'approval_notes' => 'nullable|string|max:1000',
        ]);

        $validDocumentTypes = ['business_formation', 'business_ownership', 'proof_of_address', 'determination_letter_501c3', 'id_front', 'id_back'];
        
        if (!in_array($documentType, $validDocumentTypes)) {
            return redirect()->back()->with('error', 'Invalid document type.');
        }

        $submission = BridgeKycKybSubmission::where('type', 'kyb')->findOrFail($id);
        
        // Permission is checked via middleware

        DB::beginTransaction();
        try {
            // Find or create the verification document
            $verificationDoc = VerificationDocument::firstOrCreate(
                [
                    'bridge_kyc_kyb_submission_id' => $submission->id,
                    'document_type' => $documentType,
                ],
                [
                    'file_path' => $this->getDocumentPath($submission, $documentType),
                    'status' => 'pending',
                ]
            );
            
            // Update document status to approved
            $verificationDoc->status = 'approved';
            $verificationDoc->approved_at = now();
            $verificationDoc->approved_by = $request->user()->id;
            
            // Store approval notes if provided
            if ($request->filled('approval_notes')) {
                $verificationDoc->approval_notes = $request->approval_notes;
            }
            
            // Remove rejection info
            $verificationDoc->rejection_reason = null;
            $verificationDoc->rejected_at = null;
            $verificationDoc->rejected_by = null;
            
            $verificationDoc->save();

            Log::info('KYB document approved by admin', [
                'submission_id' => $submission->id,
                'document_type' => $documentType,
                'admin_id' => $request->user()->id,
                'verification_document_id' => $verificationDoc->id,
            ]);

            DB::commit();

            return redirect()->back()->with('success', ucfirst(str_replace('_', ' ', $documentType)) . ' document approved successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to approve KYB document', [
                'submission_id' => $submission->id,
                'document_type' => $documentType,
                'error' => $e->getMessage(),
            ]);

            return redirect()->back()->with('error', 'Failed to approve document.');
        }
    }

    /**
     * Reject a specific document in a KYB submission
     */
    public function rejectDocument(Request $request, $id, $documentType)
    {
        $request->validate([
            'rejection_reason' => 'required|string|max:1000',
        ]);

        $validDocumentTypes = ['business_formation', 'business_ownership', 'proof_of_address', 'determination_letter_501c3', 'id_front', 'id_back'];
        
        if (!in_array($documentType, $validDocumentTypes)) {
            return redirect()->back()->with('error', 'Invalid document type.');
        }

        $submission = BridgeKycKybSubmission::where('type', 'kyb')->findOrFail($id);
        
        // Permission is checked via middleware

        DB::beginTransaction();
        try {
            // Find or create the verification document
            $verificationDoc = VerificationDocument::firstOrCreate(
                [
                    'bridge_kyc_kyb_submission_id' => $submission->id,
                    'document_type' => $documentType,
                ],
                [
                    'file_path' => $this->getDocumentPath($submission, $documentType),
                    'status' => 'pending',
                ]
            );
            
            // Update document status to rejected
            $verificationDoc->status = 'rejected';
            $verificationDoc->rejected_at = now();
            $verificationDoc->rejected_by = $request->user()->id;
            $verificationDoc->rejection_reason = $request->rejection_reason;
            
            // Remove approval info
            $verificationDoc->approval_notes = null;
            $verificationDoc->approved_at = null;
            $verificationDoc->approved_by = null;
            
            $verificationDoc->save();
            
            // Update submission status to needs_more_info if it was not_started or under_review
            // Bridge KYC/KYB statuses: not_started, incomplete, under_review, awaiting_questionnaire, awaiting_ubo, approved, rejected, paused, offboarded
            if (in_array($submission->submission_status, ['not_started', 'under_review', 'incomplete'])) {
                $submission->submission_status = 'needs_more_info'; // Internal status for rejected documents
                $submission->save();
            }

            Log::info('KYB document rejected by admin', [
                'submission_id' => $submission->id,
                'document_type' => $documentType,
                'admin_id' => $request->user()->id,
                'rejection_reason' => $request->rejection_reason,
                'verification_document_id' => $verificationDoc->id,
            ]);

            DB::commit();

            return redirect()->back()->with('success', ucfirst(str_replace('_', ' ', $documentType)) . ' document rejected. User will need to re-upload it.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to reject KYB document', [
                'submission_id' => $submission->id,
                'document_type' => $documentType,
                'error' => $e->getMessage(),
            ]);

            return redirect()->back()->with('error', 'Failed to reject document.');
        }
    }

    /**
     * Request re-fill of specific fields
     */
    public function requestRefill(Request $request, $id)
    {
        $request->validate([
            'requested_fields' => 'required|array',
            'requested_fields.*' => 'string',
            'message' => 'nullable|string|max:1000',
        ]);

        $submission = BridgeKycKybSubmission::where('type', 'kyb')->findOrFail($id);
        
        DB::beginTransaction();
        try {
            $submissionData = $submission->submission_data ?? [];
            if (is_string($submissionData)) {
                $submissionData = json_decode($submissionData, true) ?? [];
            }
            
            // Store requested fields and message
            $submissionData['requested_fields'] = $request->requested_fields;
            if ($request->filled('message')) {
                $submissionData['refill_message'] = $request->message;
            }
            $submissionData['refill_requested_at'] = now()->toIso8601String();
            $submissionData['refill_requested_by'] = $request->user()->id;
            
            // Update submission status to needs_more_info
            $submission->submission_status = 'needs_more_info';
            
            // Clear bridge_response when requesting refill so it can be sent again
            $submission->bridge_response = null;
            
            $submission->submission_data = $submissionData;
            $submission->save();

            Log::info('KYB re-fill requested by admin', [
                'submission_id' => $submission->id,
                'requested_fields' => $request->requested_fields,
                'admin_id' => $request->user()->id,
            ]);

            DB::commit();

            return redirect()->back()->with('success', 'Re-fill request sent successfully. User will see only the requested fields.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to request KYB re-fill', [
                'submission_id' => $submission->id,
                'error' => $e->getMessage(),
            ]);

            return redirect()->back()->with('error', 'Failed to request re-fill.');
        }
    }

    /**
     * Update documents to send to Bridge
     */
    public function updateDocumentsToSend(Request $request, $id)
    {
        $request->validate([
            'documents_to_send' => 'required|array',
            'documents_to_send.*' => 'string|in:business_formation,business_ownership,proof_of_address,determination_letter_501c3,id_front,id_back',
        ]);

        $submission = BridgeKycKybSubmission::where('type', 'kyb')->findOrFail($id);
        
        DB::beginTransaction();
        try {
            $submissionData = $submission->submission_data ?? [];
            if (is_string($submissionData)) {
                $submissionData = json_decode($submissionData, true) ?? [];
            }
            
            // Store documents to send
            $submissionData['documents_to_send'] = $request->documents_to_send;
            $submissionData['documents_to_send_updated_at'] = now()->toIso8601String();
            $submissionData['documents_to_send_updated_by'] = $request->user()->id;
            
            $submission->submission_data = $submissionData;
            $submission->save();

            Log::info('KYB documents to send updated by admin', [
                'submission_id' => $submission->id,
                'documents_to_send' => $request->documents_to_send,
                'admin_id' => $request->user()->id,
            ]);

            DB::commit();

            return redirect()->back()->with('success', 'Documents to send updated successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update documents to send', [
                'submission_id' => $submission->id,
                'error' => $e->getMessage(),
            ]);

            return redirect()->back()->with('error', 'Failed to update documents to send.');
        }
    }

    /**
     * Get document path from submission (for backward compatibility)
     */
    protected function getDocumentPath(BridgeKycKybSubmission $submission, string $documentType): ?string
    {
        // First check VerificationDocument table
        $verificationDoc = VerificationDocument::where('bridge_kyc_kyb_submission_id', $submission->id)
            ->where('document_type', $documentType)
            ->first();
        
        if ($verificationDoc && $verificationDoc->file_path) {
            return $verificationDoc->file_path;
        }
        
        // Fallback to submission_data for backward compatibility
        $submissionData = $submission->submission_data ?? [];
        if (is_string($submissionData)) {
            $submissionData = json_decode($submissionData, true) ?? [];
        }
        
        switch ($documentType) {
            case 'business_formation':
                return $submissionData['business_formation_document_path'] ?? null;
            case 'business_ownership':
                return $submissionData['business_ownership_document_path'] ?? null;
            case 'proof_of_address':
                return $submissionData['proof_of_address_document_path'] ?? null;
            case 'id_front':
                return $submission->id_front_image_path ?? null;
            case 'id_back':
                return $submission->id_back_image_path ?? null;
            default:
                return null;
        }
    }

    /**
     * Verify webhook configuration and log status
     */
    private function verifyWebhookConfiguration(): void
    {
        try {
            $webhookUrl = config('app.url') . '/webhooks/bridge';
            $webhooksResult = $this->bridgeService->getWebhooks();
            
            $webhookConfigured = false;
            $webhookActive = false;
            $webhookId = null;
            $eventCategories = [];
            
            if ($webhooksResult['success'] && isset($webhooksResult['data']['data'])) {
                foreach ($webhooksResult['data']['data'] as $webhook) {
                    if (isset($webhook['url']) && $webhook['url'] === $webhookUrl) {
                        $webhookConfigured = true;
                        $webhookActive = ($webhook['status'] ?? '') === 'active';
                        $webhookId = $webhook['id'] ?? null;
                        $eventCategories = $webhook['event_categories'] ?? [];
                        break;
                    }
                }
            }
            
            Log::info('Webhook configuration check', [
                'webhook_url' => $webhookUrl,
                'webhook_configured' => $webhookConfigured,
                'webhook_active' => $webhookActive,
                'webhook_id' => $webhookId,
                'event_categories' => $eventCategories,
                'has_customer_category' => in_array('customer', $eventCategories),
                'has_kyc_link_category' => in_array('kyc_link', $eventCategories),
            ]);
            
            if (!$webhookConfigured || !$webhookActive) {
                Log::warning('Bridge webhook is not properly configured or not active', [
                    'webhook_url' => $webhookUrl,
                    'configured' => $webhookConfigured,
                    'active' => $webhookActive,
                ]);
            }
            
            if ($webhookConfigured && !in_array('customer', $eventCategories)) {
                Log::warning('Bridge webhook missing customer event category - webhooks for customer status updates may not be received', [
                    'webhook_id' => $webhookId,
                    'current_categories' => $eventCategories,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Failed to verify webhook configuration', [
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Check if webhook is configured
     */
    private function isWebhookConfigured(): bool
    {
        try {
            $webhookUrl = config('app.url') . '/webhooks/bridge';
            $webhooksResult = $this->bridgeService->getWebhooks();
            
            if ($webhooksResult['success'] && isset($webhooksResult['data']['data'])) {
                foreach ($webhooksResult['data']['data'] as $webhook) {
                    if (isset($webhook['url']) && $webhook['url'] === $webhookUrl) {
                        return ($webhook['status'] ?? '') === 'active';
                    }
                }
            }
        } catch (\Exception $e) {
            Log::error('Failed to check webhook configuration', [
                'error' => $e->getMessage(),
            ]);
        }
        
        return false;
    }

    /**
     * Normalize Bridge status values
     */
    private function normalizeStatus(?string $status): string
    {
        if (!$status) {
            return 'not_started';
        }

        $status = strtolower(trim($status));

        $validStatuses = [
            'not_started',
            'incomplete',
            'under_review',
            'awaiting_questionnaire',
            'awaiting_ubo',
            'approved',
            'rejected',
            'paused',
            'offboarded',
        ];

        if (in_array($status, $validStatuses)) {
            return $status;
        }

        $legacyStatusMap = [
            'active' => 'approved',
            'verified' => 'approved',
            'pending' => 'under_review',
            'manual_review' => 'under_review',
            'in_review' => 'under_review',
            'submitted' => 'under_review',
        ];

        return $legacyStatusMap[$status] ?? 'not_started';
    }
}

