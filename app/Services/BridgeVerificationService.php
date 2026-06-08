<?php

namespace App\Services;

use App\Models\BridgeKycKybSubmission;
use App\Models\Organization;

class BridgeVerificationService
{
    /**
     * Nonprofit wallet is ready only after Bridge KYB + control-person KYC are approved and a wallet exists.
     *
     * @return array{initialized: bool, kyb_status: string, kyc_status: string, requires_verification: bool, has_wallet: bool, is_verified: bool}
     */
    public static function payloadForOrganization(?Organization $organization): array
    {
        $default = [
            'initialized' => false,
            'kyb_status' => 'not_started',
            'kyc_status' => 'not_started',
            'requires_verification' => true,
            'has_wallet' => false,
            'is_verified' => false,
        ];

        if ($organization === null) {
            return $default;
        }

        $organization->loadMissing(['bridgeIntegration.primaryWallet']);
        $integration = $organization->bridgeIntegration;

        if ($integration === null || empty($integration->bridge_customer_id)) {
            return $default;
        }

        $kybStatus = trim((string) ($integration->kyb_status ?? '')) ?: 'not_started';
        $kycStatus = trim((string) ($integration->kyc_status ?? '')) ?: 'not_started';

        $primaryWallet = $integration->primaryWallet;
        $hasWallet = ! empty($integration->bridge_wallet_id)
            || ($primaryWallet !== null && ! empty($primaryWallet->bridge_wallet_id));

        $kybApproved = in_array($kybStatus, ['approved', 'verified'], true);
        $kycApproved = in_array($kycStatus, ['approved', 'verified'], true);

        $submission = BridgeKycKybSubmission::query()
            ->where('bridge_integration_id', $integration->id)
            ->where('type', 'kyb')
            ->latest()
            ->first();
        $submissionStatus = trim((string) ($submission?->submission_status ?? ''));
        if ($submissionStatus !== '' && ! in_array($submissionStatus, ['approved'], true)) {
            $kycApproved = false;
        }

        $isVerified = $kybApproved && $kycApproved && $hasWallet;

        return [
            'initialized' => true,
            'kyb_status' => $kybStatus,
            'kyc_status' => $kycStatus,
            'requires_verification' => ! $isVerified,
            'has_wallet' => $hasWallet,
            'is_verified' => $isVerified,
        ];
    }
}
