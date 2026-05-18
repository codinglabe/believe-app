<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BridgeIntegration;
use App\Models\BridgeKycKybSubmission;
use App\Models\VerificationDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class KycController extends Controller
{
    /**
     * Get current user's KYC status and latest submission info.
     */
    public function status(Request $request)
    {
        $user = $request->user();
        $integration = BridgeIntegration::where('integratable_id', $user->id)
            ->where('integratable_type', $user->getMorphClass())
            ->first();

        $status = 'not_started';
        $message = null;
        $submission = null;

        if ($integration) {
            $status = $integration->kyc_status ?? 'not_started';
            $submission = BridgeKycKybSubmission::where('bridge_integration_id', $integration->id)
                ->where('type', 'kyc')
                ->latest()
                ->first();

            if ($submission) {
                $message = match ($submission->submission_status) {
                    'approved', 'verified' => 'Your identity has been verified.',
                    'rejected' => $submission->submission_data['rejection_reason'] ?? 'Your submission was not approved.',
                    default => 'Your documents are under review. We will notify you once verified.',
                };
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'kyc_status' => $status,
                'message' => $message,
                'submission' => $submission ? [
                    'id' => $submission->id,
                    'submission_status' => $submission->submission_status,
                    'submitted_at' => $submission->created_at?->toIso8601String(),
                    'submission_data' => $submission->submission_data,
                ] : null,
            ],
        ]);
    }

    /**
     * Submit KYC documents (document type, ID document front/back, selfie, address).
     * For id-card and driving-license both front and back are required; for passport only front.
     */
    public function submit(Request $request)
    {
        $user = $request->user();

        $rules = [
            'document_type' => 'required|in:id-card,passport,driving-license',
            'document' => 'required|file|mimes:jpeg,jpg,png,pdf|max:10240',
            'document_back' => 'nullable|file|mimes:jpeg,jpg,png,pdf|max:10240',
            'selfie' => 'required|file|mimes:jpeg,jpg,png|max:5120',
            'street' => 'required|string|max:255',
            'city' => 'required|string|max:100',
            'state' => 'required|string|max:100',
            'zipCode' => 'required|string|max:20',
            'country' => 'required|string|max:100',
        ];

        $documentType = $request->input('document_type');
        if (in_array($documentType, ['id-card', 'driving-license'], true)) {
            $rules['document_back'] = 'required|file|mimes:jpeg,jpg,png,pdf|max:10240';
        }

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $integration = BridgeIntegration::firstOrCreate(
            [
                'integratable_id' => $user->id,
                'integratable_type' => $user->getMorphClass(),
            ],
            [
                'kyc_status' => 'not_started',
            ]
        );

        // If already approved, do not allow resubmission without admin action
        if ($integration->kyc_status === 'approved') {
            return response()->json([
                'success' => false,
                'message' => 'Your identity is already verified.',
            ], 422);
        }

        // If there is a pending submission, optionally allow resubmission (new submission)
        $existingPending = BridgeKycKybSubmission::where('bridge_integration_id', $integration->id)
            ->where('type', 'kyc')
            ->whereIn('submission_status', ['submitted', 'pending', 'in_review'])
            ->exists();

        if ($existingPending) {
            return response()->json([
                'success' => false,
                'message' => 'You already have a submission under review. Please wait for the result.',
            ], 422);
        }

        try {
            DB::beginTransaction();

            $submissionData = [
                'document_type' => $request->document_type,
                'address' => [
                    'street' => $request->street,
                    'city' => $request->city,
                    'state' => $request->state,
                    'zipCode' => $request->zipCode,
                    'country' => $request->country,
                ],
                'submitted_via' => 'api',
            ];

            $submission = BridgeKycKybSubmission::create([
                'bridge_integration_id' => $integration->id,
                'type' => 'kyc',
                'submission_status' => 'submitted',
                'submission_data' => $submissionData,
            ]);

            $basePath = 'kyc/' . $user->id . '/' . $submission->id;

            $documentFile = $request->file('document');
            $docPath = $documentFile->store($basePath, 'public');
            VerificationDocument::create([
                'bridge_kyc_kyb_submission_id' => $submission->id,
                'document_type' => 'id_front',
                'file_path' => $docPath,
                'status' => 'pending',
            ]);

            $documentBackFile = $request->file('document_back');
            $docBackPath = null;
            if ($documentBackFile) {
                $docBackPath = $documentBackFile->store($basePath, 'public');
                VerificationDocument::create([
                    'bridge_kyc_kyb_submission_id' => $submission->id,
                    'document_type' => 'id_back',
                    'file_path' => $docBackPath,
                    'status' => 'pending',
                ]);
            }

            $selfieFile = $request->file('selfie');
            $selfiePath = $selfieFile->store($basePath, 'public');
            VerificationDocument::create([
                'bridge_kyc_kyb_submission_id' => $submission->id,
                'document_type' => 'selfie',
                'file_path' => $selfiePath,
                'status' => 'pending',
            ]);

            $integration->update(['kyc_status' => 'under_review']);

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            if (isset($docPath) && Storage::disk('public')->exists($docPath)) {
                Storage::disk('public')->delete($docPath);
            }
            if (isset($docBackPath) && $docBackPath && Storage::disk('public')->exists($docBackPath)) {
                Storage::disk('public')->delete($docBackPath);
            }
            if (isset($selfiePath) && Storage::disk('public')->exists($selfiePath)) {
                Storage::disk('public')->delete($selfiePath);
            }
            report($e);
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit documents. Please try again.',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Your verification documents have been submitted successfully. We will review them within 24–48 hours.',
            'data' => [
                'submission_id' => $submission->id,
                'kyc_status' => $integration->kyc_status,
                'submitted_at' => $submission->created_at->toIso8601String(),
            ],
        ]);
    }
}
