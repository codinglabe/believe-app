<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BridgeKycKybSubmission;
use App\Models\BridgeIntegration;
use App\Services\BridgeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class AdminKycVerificationController extends Controller
{
    protected BridgeService $bridgeService;

    public function __construct(BridgeService $bridgeService)
    {
        $this->bridgeService = $bridgeService;
    }

    /**
     * Helper function for MIME types (by file extension)
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
     * Display a listing of KYC submissions
     */
    public function index(Request $request)
    {
        // Permission is checked via middleware

        $query = BridgeKycKybSubmission::with(['bridgeIntegration.integratable'])
            ->where('type', 'kyc')
            ->orderBy('created_at', 'desc');

        // Apply status filter
        $status = $request->get('status', $request->get('tab', 'all'));
        if ($status && $status !== 'all') {
            if ($status === 'pending' || $status === 'in_review') {
                $query->whereIn('submission_status', ['pending', 'in_review', 'submitted']);
            } else {
                $query->where('submission_status', $status);
            }
        }

        // Apply search filter
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('bridge_customer_id', 'like', "%{$search}%");
            });
        }

        $submissions = $query->paginate(15);

        // Calculate stats
        $stats = [
            'total' => BridgeKycKybSubmission::where('type', 'kyc')->count(),
            'pending' => BridgeKycKybSubmission::where('type', 'kyc')
                ->whereIn('submission_status', ['pending', 'in_review', 'submitted'])
                ->count(),
            'approved' => BridgeKycKybSubmission::where('type', 'kyc')
                ->whereIn('submission_status', ['approved', 'verified'])
                ->count(),
            'rejected' => BridgeKycKybSubmission::where('type', 'kyc')
                ->where('submission_status', 'rejected')
                ->count(),
            'not_submitted' => BridgeKycKybSubmission::where('type', 'kyc')
                ->where('submission_status', 'not_submitted')
                ->count(),
        ];

        return inertia('admin/kyc-verification/Index', [
            'submissions' => $submissions,
            'stats' => $stats,
            'filters' => [
                'status' => $status,
                'search' => $request->search,
            ],
        ]);
    }

    /**
     * Display the specified KYC submission
     */
    public function show($id)
    {
        $submission = BridgeKycKybSubmission::with([
            'bridgeIntegration.integratable'
        ])->where('type', 'kyc')->findOrFail($id);

        // Permission is checked via middleware

        return inertia('admin/kyc-verification/Show', [
            'submission' => $submission,
        ]);
    }

    /**
     * Approve a KYC submission and send to Bridge
     */
    public function approve(Request $request, $id)
    {
        $request->validate([
            'notes' => 'nullable|string|max:1000',
        ]);

        $submission = BridgeKycKybSubmission::where('type', 'kyc')->findOrFail($id);
        
        // Permission is checked via middleware

        DB::beginTransaction();
        try {
            // If submission hasn't been sent to Bridge yet, or was rejected/needs refill, send it now
            // Only check bridge_response if status is approved (don't store until approved)
            $hasBeenSent = !empty($submission->bridge_response) && $submission->submission_status === 'approved';
            if (!$submission->bridge_customer_id || !$hasBeenSent) {
                Log::info('Sending KYC submission to Bridge upon approval', [
                    'submission_id' => $submission->id,
                    'has_customer_id' => !empty($submission->bridge_customer_id),
                ]);

                // Ensure we have the integration
                $integration = $submission->bridgeIntegration;
                if (!$integration) {
                    throw new \Exception('Bridge integration not found for this submission');
                }

                // Build customer data for Bridge API
                $residentialAddress = $submission->residential_address ?? [];
                
                // Ensure residential_address has correct structure
                if (is_array($residentialAddress)) {
                    $residentialAddress = array_filter([
                        'street_line_1' => $residentialAddress['street_line_1'] ?? null,
                        'street_line_2' => $residentialAddress['street_line_2'] ?? null,
                        'city' => $residentialAddress['city'] ?? null,
                        'subdivision' => $residentialAddress['subdivision'] ?? $residentialAddress['state'] ?? null,
                        'postal_code' => $residentialAddress['postal_code'] ?? null,
                        'country' => $residentialAddress['country'] ?? 'USA',
                    ]);
                }

                // Load ID images from storage if available
                $idFrontImage = null;
                $idBackImage = null;
                
                if ($submission->id_front_image_path) {
                    $imagePath = storage_path('app/public/' . $submission->id_front_image_path);
                    if (file_exists($imagePath)) {
                        $imageData = file_get_contents($imagePath);
                        $mimeType = $this->getMimeType($submission->id_front_image_path);
                        $idFrontImage = "data:{$mimeType};base64," . base64_encode($imageData);
                    }
                }
                
                if ($submission->id_back_image_path) {
                    $imagePath = storage_path('app/public/' . $submission->id_back_image_path);
                    if (file_exists($imagePath)) {
                        $imageData = file_get_contents($imagePath);
                        $mimeType = $this->getMimeType($submission->id_back_image_path);
                        $idBackImage = "data:{$mimeType};base64," . base64_encode($imageData);
                    }
                }

                // Get identifying information
                $identifyingInfo = $submission->identifying_information ?? [];
                $ssn = null;
                $idType = 'drivers_license';
                $idNumber = null;

                if (is_array($identifyingInfo)) {
                    foreach ($identifyingInfo as $info) {
                        if (isset($info['type']) && $info['type'] === 'ssn') {
                            $ssn = $info['number'] ?? null;
                        }
                        if (isset($info['type']) && in_array($info['type'], ['drivers_license', 'passport', 'state_id'])) {
                            $idType = $info['type'];
                            $idNumber = $info['number'] ?? null;
                        }
                    }
                }

                $bridgeCustomerData = [
                    'type' => 'individual',
                    'first_name' => $submission->first_name,
                    'last_name' => $submission->last_name,
                    'email' => $submission->email,
                    'birth_date' => $submission->birth_date ? $submission->birth_date->format('Y-m-d') : null,
                    'residential_address' => $residentialAddress,
                    'identifying_information' => array_filter([
                        $ssn ? [
                            'type' => 'ssn',
                            'issuing_country' => 'usa',
                            'number' => $ssn,
                        ] : null,
                        $idNumber ? [
                            'type' => $idType,
                            'issuing_country' => 'usa',
                            'number' => $idNumber,
                            'image_front' => $idFrontImage,
                            'image_back' => $idBackImage,
                        ] : null,
                    ]),
                ];
                
                // Add signed_agreement_id if available in integration metadata
                if ($integration->bridge_metadata) {
                    $metadata = is_array($integration->bridge_metadata) 
                        ? $integration->bridge_metadata 
                        : json_decode($integration->bridge_metadata, true);
                    if (!empty($metadata['signed_agreement_id'])) {
                        $bridgeCustomerData['signed_agreement_id'] = $metadata['signed_agreement_id'];
                    }
                }

                // Check if customer already exists
                if ($integration->bridge_customer_id) {
                    // Update existing customer
                    $result = $this->bridgeService->updateCustomer($integration->bridge_customer_id, $bridgeCustomerData);
                } else {
                    // Create new customer
                    $result = $this->bridgeService->createCustomer($bridgeCustomerData);
                    
                    if ($result['success'] && isset($result['data']['id'])) {
                        $integration->bridge_customer_id = $result['data']['id'];
                        $integration->save();
                    }
                }

                if (!$result['success']) {
                    throw new \Exception($result['error'] ?? 'Failed to send KYC data to Bridge');
                }

                // Update submission with Bridge response
                $submission->bridge_customer_id = $integration->bridge_customer_id;
                
                // Check Bridge response status - if "active" or "approved", set to approved immediately
                // Only store bridge_response when status is approved
                $bridgeKycStatus = $result['data']['kyc_status'] ?? null;
                $bridgeCustomerStatus = $result['data']['status'] ?? null;
                
                // Bridge Customer statuses: not_started, active, under_review, rejected
                // Bridge KYC statuses: not_started, incomplete, under_review, awaiting_questionnaire, approved, rejected, paused, offboarded
                // "active" customer status means approved, so map it to "approved"
                $isApproved = false;
                if ($bridgeKycStatus) {
                    $normalizedStatus = $this->normalizeStatus($bridgeKycStatus);
                    $isApproved = ($normalizedStatus === 'approved');
                } elseif ($bridgeCustomerStatus) {
                    // For customer status, "active" means approved
                    $isApproved = (strtolower($bridgeCustomerStatus) === 'active');
                }
                
                if ($isApproved) {
                    $submission->submission_status = 'approved';
                    $integration->kyc_status = 'approved';
                    
                    // NOW store bridge_response since it's approved
                    $submission->bridge_response = $result['data'];
                    
                    Log::info('KYC submission approved immediately from Bridge response', [
                        'submission_id' => $submission->id,
                        'customer_id' => $integration->bridge_customer_id,
                        'bridge_kyc_status' => $bridgeKycStatus,
                        'bridge_customer_status' => $bridgeCustomerStatus,
                    ]);
                    
                    // Auto-create wallet, virtual account, and card account when approved instantly
                    if ($integration->bridge_customer_id) {
                        try {
                            $webhookController = new \App\Http\Controllers\BridgeWebhookController($this->bridgeService);
                            $webhookController->createWalletVirtualAccountAndCardAccount($integration, $integration->bridge_customer_id);
                            
                            Log::info('Wallet, virtual account, and card account created for instant KYC approval', [
                                'integration_id' => $integration->id,
                                'customer_id' => $integration->bridge_customer_id,
                            ]);
                        } catch (\Exception $e) {
                            Log::error('Failed to create wallet/virtual account/card account on instant KYC approval', [
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
                    $integration->kyc_status = $this->normalizeStatus($bridgeKycStatus) ?: 'under_review';
                    
                    Log::info('KYC submission sent to Bridge - status under review', [
                        'submission_id' => $submission->id,
                        'customer_id' => $integration->bridge_customer_id,
                        'bridge_kyc_status' => $bridgeKycStatus,
                        'bridge_customer_status' => $bridgeCustomerStatus,
                    ]);
                }
                
                // Store approval notes if provided
                $submissionData = $submission->submission_data ?? [];
                if ($request->filled('notes')) {
                    $submissionData['approval_notes'] = $request->notes;
                }
                $submissionData['approved_at'] = now()->toDateTimeString();
                $submissionData['approved_by'] = $request->user()->id;
                $submission->submission_data = $submissionData;
                
                $submission->save();
                $integration->save();

                Log::info('KYC submission sent to Bridge and approved', [
                    'submission_id' => $submission->id,
                    'customer_id' => $integration->bridge_customer_id,
                    'admin_id' => $request->user()->id,
                ]);
            } else {
                // Already sent to Bridge, check current status and update
                $integration = $submission->bridgeIntegration;
                if ($integration && $integration->bridge_customer_id) {
                    // Fetch latest customer status from Bridge
                    try {
                        $customerResult = $this->bridgeService->getCustomer($integration->bridge_customer_id);
                        if ($customerResult['success'] && isset($customerResult['data'])) {
                            $latestCustomerData = $customerResult['data'];
                            $latestKycStatus = $latestCustomerData['kyc_status'] ?? null;
                            $latestCustomerStatus = $latestCustomerData['status'] ?? null;
                            
                            // Check if status is active/approved
                            $isApproved = false;
                            if ($latestKycStatus) {
                                $normalizedStatus = $this->normalizeStatus($latestKycStatus);
                                $isApproved = ($normalizedStatus === 'approved');
                            } elseif ($latestCustomerStatus) {
                                $isApproved = (strtolower($latestCustomerStatus) === 'active');
                            }
                            
                            if ($isApproved) {
                                $submission->submission_status = 'approved';
                                $integration->kyc_status = 'approved';
                                
                                // Auto-create wallet, virtual account, and card account when approved
                                try {
                                    $webhookController = new \App\Http\Controllers\BridgeWebhookController($this->bridgeService);
                                    $webhookController->createWalletVirtualAccountAndCardAccount($integration, $integration->bridge_customer_id);
                                    
                                    Log::info('Wallet, virtual account, and card account created for KYC approval (already sent to Bridge)', [
                                        'integration_id' => $integration->id,
                                        'customer_id' => $integration->bridge_customer_id,
                                    ]);
                                } catch (\Exception $e) {
                                    Log::error('Failed to create wallet/virtual account/card account on KYC approval (already sent to Bridge)', [
                                        'integration_id' => $integration->id,
                                        'customer_id' => $integration->bridge_customer_id,
                                        'error' => $e->getMessage(),
                                    ]);
                                }
                            } else {
                                $submission->submission_status = 'approved'; // Admin approved
                                $integration->kyc_status = $this->normalizeStatus($latestKycStatus) ?: 'approved';
                            }
                        } else {
                            // Couldn't fetch status, just mark as approved by admin
                            $submission->submission_status = 'approved';
                            if ($integration) {
                                $integration->kyc_status = 'approved';
                            }
                        }
                    } catch (\Exception $e) {
                        Log::warning('Failed to fetch latest customer status from Bridge', [
                            'customer_id' => $integration->bridge_customer_id,
                            'error' => $e->getMessage(),
                        ]);
                        // Fallback: mark as approved by admin
                        $submission->submission_status = 'approved';
                        if ($integration) {
                            $integration->kyc_status = 'approved';
                        }
                    }
                } else {
                    // No integration or customer ID, just mark as approved by admin
                    $submission->submission_status = 'approved';
                    if ($submission->bridgeIntegration) {
                        $submission->bridgeIntegration->kyc_status = 'approved';
                        $submission->bridgeIntegration->save();
                    }
                }
                
                // Store approval notes if provided
                $submissionData = $submission->submission_data ?? [];
                if ($request->filled('notes')) {
                    $submissionData['approval_notes'] = $request->notes;
                }
                $submissionData['approved_at'] = now()->toDateTimeString();
                $submissionData['approved_by'] = $request->user()->id;
                $submission->submission_data = $submissionData;
                
                $submission->save();
                if ($integration) {
                    $integration->save();
                }

                Log::info('KYC submission approved (already sent to Bridge)', [
                    'submission_id' => $submission->id,
                    'admin_id' => $request->user()->id,
                ]);
            }

            DB::commit();

            return redirect()->back()->with('success', 'KYC submission approved and sent to Bridge successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to approve KYC submission', [
                'submission_id' => $submission->id,
                'error' => $e->getMessage(),
            ]);

            return redirect()->back()->with('error', 'Failed to approve KYC submission: ' . $e->getMessage());
        }
    }

    /**
     * Reject a KYC submission
     */
    public function reject(Request $request, $id)
    {
        $request->validate([
            'rejection_reason' => 'required|string|max:1000',
            'notes' => 'nullable|string|max:1000',
        ]);

        $submission = BridgeKycKybSubmission::where('type', 'kyc')->findOrFail($id);
        
        // Permission is checked via middleware

        DB::beginTransaction();
        try {
            $submission->submission_status = 'rejected';
            
            // Store rejection reason in submission_data
            $submissionData = $submission->submission_data ?? [];
            $submissionData['rejection_reason'] = $request->rejection_reason;
            if ($request->filled('notes')) {
                $submissionData['rejection_notes'] = $request->notes;
            }
            $submissionData['rejected_at'] = now()->toDateTimeString();
            $submissionData['rejected_by'] = $request->user()->id;
            $submission->submission_data = $submissionData;
            
            $submission->save();

            // Update Bridge integration status if exists
            if ($submission->bridgeIntegration) {
                $submission->bridgeIntegration->kyc_status = 'rejected';
                $submission->bridgeIntegration->save();
            }

            Log::info('KYC submission rejected by admin', [
                'submission_id' => $submission->id,
                'admin_id' => $request->user()->id,
                'email' => $submission->email,
                'rejection_reason' => $request->rejection_reason,
            ]);

            DB::commit();

            return redirect()->back()->with('success', 'KYC submission rejected successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to reject KYC submission', [
                'submission_id' => $submission->id,
                'error' => $e->getMessage(),
            ]);

            return redirect()->back()->with('error', 'Failed to reject KYC submission.');
        }
    }

    /**
     * Request KYC verification from customer
     */
    public function request(Request $request, $customerId)
    {
        $request->validate([
            'message' => 'required|string|max:1000',
        ]);

        // Find the bridge integration for this customer
        $integration = BridgeIntegration::where('integratable_id', $customerId)
            ->where('integratable_type', 'App\Models\User')
            ->first();

        if (!$integration) {
            return redirect()->back()->with('error', 'Bridge integration not found for this customer.');
        }

        // Create a KYC link if not exists
        try {
            if (!$integration->kyc_link_id) {
                $result = $this->bridgeService->createKYCLink($integration->bridge_customer_id ?? null);
                
                if ($result['success'] && isset($result['data']['id'])) {
                    $integration->kyc_link_id = $result['data']['id'];
                    $integration->kyc_link_url = $result['data']['url'] ?? null;
                    $integration->save();
                }
            }

            // Create a submission record with not_submitted status
            $submission = BridgeKycKybSubmission::create([
                'bridge_integration_id' => $integration->id,
                'type' => 'kyc',
                'submission_status' => 'not_submitted',
                'email' => $integration->integratable->email ?? null,
                'submission_data' => [
                    'request_message' => $request->message,
                    'requested_at' => now()->toDateTimeString(),
                    'requested_by' => $request->user()->id,
                ],
            ]);

            Log::info('KYC verification requested from customer', [
                'customer_id' => $customerId,
                'submission_id' => $submission->id,
                'admin_id' => $request->user()->id,
            ]);

            return redirect()->back()->with('success', 'KYC verification request sent to customer.');
        } catch (\Exception $e) {
            Log::error('Failed to request KYC verification', [
                'customer_id' => $customerId,
                'error' => $e->getMessage(),
            ]);

            return redirect()->back()->with('error', 'Failed to request KYC verification.');
        }
    }

    /**
     * Normalize KYC/KYB status values to Bridge's documented statuses
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
            'active', // Customer status
        ];

        if (in_array($status, $validStatuses)) {
            // Map 'active' to 'approved' for consistency
            return $status === 'active' ? 'approved' : $status;
        }

        $legacyStatusMap = [
            'verified' => 'approved',
            'pending' => 'under_review',
            'manual_review' => 'under_review',
            'in_review' => 'under_review',
            'submitted' => 'under_review',
        ];

        return $legacyStatusMap[$status] ?? 'not_started';
    }
}

