<?php

namespace App\Services;

use App\Models\MerchantBrpTransaction;
use App\Models\MerchantBrpWallet;
use App\Models\OrganizationBrpTransaction;
use App\Models\OrganizationBrpWallet;
use App\Models\SupporterBrpTransaction;
use App\Models\SupporterBrpWallet;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BrpWalletService
{
    /**
     * Get or create a merchant BRP wallet.
     */
    public function getOrCreateMerchantWallet(int $merchantId): MerchantBrpWallet
    {
        return MerchantBrpWallet::firstOrCreate(
            ['merchant_id' => $merchantId],
            ['balance_brp' => 0, 'reserved_brp' => 0, 'spent_brp' => 0]
        );
    }

    /**
     * Get or create a supporter BRP wallet.
     */
    public function getOrCreateSupporterWallet(int $userId): SupporterBrpWallet
    {
        return SupporterBrpWallet::firstOrCreate(
            ['user_id' => $userId],
            ['balance_brp' => 0]
        );
    }

    /**
     * Purchase BRP for a merchant (after Stripe payment).
     */
    public function purchaseBrp(int $merchantId, int $amountBrp, ?string $stripePaymentId = null): MerchantBrpWallet
    {
        return DB::transaction(function () use ($merchantId, $amountBrp, $stripePaymentId) {
            $wallet = $this->getOrCreateMerchantWallet($merchantId);

            $wallet->increment('balance_brp', $amountBrp);

            MerchantBrpTransaction::create([
                'merchant_id' => $merchantId,
                'type' => 'purchase',
                'amount_brp' => $amountBrp,
                'description' => "Purchased {$amountBrp} BRP",
                'stripe_payment_id' => $stripePaymentId,
            ]);

            Log::info("BRP Purchase: merchant={$merchantId}, amount={$amountBrp}");

            return $wallet->fresh();
        });
    }

    /**
     * Reserve BRP from a merchant wallet for a campaign.
     */
    public function reserveBrp(int $merchantId, int $amountBrp, ?string $referenceType = null, ?int $referenceId = null): MerchantBrpWallet
    {
        return DB::transaction(function () use ($merchantId, $amountBrp, $referenceType, $referenceId) {
            $wallet = $this->getOrCreateMerchantWallet($merchantId);

            if ($wallet->available_brp < $amountBrp) {
                throw new \Exception("Insufficient BRP balance. Available: {$wallet->available_brp}, Required: {$amountBrp}");
            }

            $wallet->increment('reserved_brp', $amountBrp);

            MerchantBrpTransaction::create([
                'merchant_id' => $merchantId,
                'type' => 'reserve',
                'amount_brp' => $amountBrp,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'description' => "Reserved {$amountBrp} BRP for campaign",
            ]);

            return $wallet->fresh();
        });
    }

    /**
     * Payout BRP: move from merchant reserved → spent, credit supporter.
     */
    public function payoutBrp(int $merchantId, int $supporterId, int $amountBrp, int $campaignId): void
    {
        DB::transaction(function () use ($merchantId, $supporterId, $amountBrp, $campaignId) {
            // Debit merchant reserved → spent
            $merchantWallet = $this->getOrCreateMerchantWallet($merchantId);
            $merchantWallet->decrement('reserved_brp', $amountBrp);
            $merchantWallet->increment('spent_brp', $amountBrp);

            MerchantBrpTransaction::create([
                'merchant_id' => $merchantId,
                'type' => 'payout',
                'amount_brp' => $amountBrp,
                'reference_type' => 'feedback_campaign',
                'reference_id' => $campaignId,
                'description' => "Payout {$amountBrp} BRP for feedback response",
            ]);

            // Credit supporter wallet
            $supporterWallet = $this->getOrCreateSupporterWallet($supporterId);
            $supporterWallet->increment('balance_brp', $amountBrp);

            SupporterBrpTransaction::create([
                'user_id' => $supporterId,
                'type' => 'reward',
                'amount_brp' => $amountBrp,
                'reference_type' => 'feedback_campaign',
                'reference_id' => $campaignId,
                'description' => "Earned {$amountBrp} BRP for feedback",
            ]);

            Log::info("BRP Payout: merchant={$merchantId}, supporter={$supporterId}, amount={$amountBrp}, campaign={$campaignId}");
        });
    }

    /**
     * Release unused reserved BRP back to the merchant's available balance.
     */
    public function releaseBrp(int $merchantId, int $amountBrp, ?int $campaignId = null): MerchantBrpWallet
    {
        return DB::transaction(function () use ($merchantId, $amountBrp, $campaignId) {
            $wallet = $this->getOrCreateMerchantWallet($merchantId);
            $wallet->decrement('reserved_brp', $amountBrp);

            MerchantBrpTransaction::create([
                'merchant_id' => $merchantId,
                'type' => 'release',
                'amount_brp' => $amountBrp,
                'reference_type' => $campaignId ? 'feedback_campaign' : null,
                'reference_id' => $campaignId,
                'description' => "Released {$amountBrp} unused BRP",
            ]);

            return $wallet->fresh();
        });
    }

    /**
     * Get available balance for a merchant.
     */
    public function getAvailableBalance(int $merchantId): int
    {
        $wallet = $this->getOrCreateMerchantWallet($merchantId);
        return $wallet->available_brp;
    }

    // ─── Organisation BRP methods ────────────────────────────────────────────

    /**
     * Get or create an organisation BRP wallet.
     */
    public function getOrCreateOrganizationWallet(int $orgId): OrganizationBrpWallet
    {
        return OrganizationBrpWallet::firstOrCreate(
            ['organization_id' => $orgId],
            ['balance_brp' => 0, 'reserved_brp' => 0, 'spent_brp' => 0]
        );
    }

    /**
     * Purchase BRP for an organisation (after Stripe payment).
     */
    public function purchaseBrpForOrg(int $orgId, int $amountBrp, ?string $stripePaymentId = null): OrganizationBrpWallet
    {
        return DB::transaction(function () use ($orgId, $amountBrp, $stripePaymentId) {
            $wallet = $this->getOrCreateOrganizationWallet($orgId);
            $wallet->increment('balance_brp', $amountBrp);

            OrganizationBrpTransaction::create([
                'organization_id' => $orgId,
                'type' => 'purchase',
                'amount_brp' => $amountBrp,
                'description' => "Purchased {$amountBrp} BRP",
                'stripe_payment_id' => $stripePaymentId,
            ]);

            Log::info("BRP Purchase (org): org={$orgId}, amount={$amountBrp}");

            return $wallet->fresh();
        });
    }

    /**
     * Reserve BRP from an organisation wallet for a campaign.
     */
    public function reserveBrpForOrg(int $orgId, int $amountBrp, ?string $referenceType = null, ?int $referenceId = null): OrganizationBrpWallet
    {
        return DB::transaction(function () use ($orgId, $amountBrp, $referenceType, $referenceId) {
            $wallet = $this->getOrCreateOrganizationWallet($orgId);

            if ($wallet->available_brp < $amountBrp) {
                throw new \Exception("Insufficient BRP balance. Available: {$wallet->available_brp}, Required: {$amountBrp}");
            }

            $wallet->increment('reserved_brp', $amountBrp);

            OrganizationBrpTransaction::create([
                'organization_id' => $orgId,
                'type' => 'reserve',
                'amount_brp' => $amountBrp,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'description' => "Reserved {$amountBrp} BRP for campaign",
            ]);

            return $wallet->fresh();
        });
    }

    /**
     * Payout BRP from an organisation: org reserved → spent, credit supporter.
     */
    public function payoutBrpFromOrg(int $orgId, int $supporterId, int $amountBrp, int $campaignId): void
    {
        DB::transaction(function () use ($orgId, $supporterId, $amountBrp, $campaignId) {
            // Debit org reserved → spent
            $orgWallet = $this->getOrCreateOrganizationWallet($orgId);
            $orgWallet->decrement('reserved_brp', $amountBrp);
            $orgWallet->increment('spent_brp', $amountBrp);

            OrganizationBrpTransaction::create([
                'organization_id' => $orgId,
                'type' => 'payout',
                'amount_brp' => $amountBrp,
                'reference_type' => 'feedback_campaign',
                'reference_id' => $campaignId,
                'description' => "Payout {$amountBrp} BRP for feedback response",
            ]);

            // Credit supporter wallet
            $supporterWallet = $this->getOrCreateSupporterWallet($supporterId);
            $supporterWallet->increment('balance_brp', $amountBrp);

            SupporterBrpTransaction::create([
                'user_id' => $supporterId,
                'type' => 'reward',
                'amount_brp' => $amountBrp,
                'reference_type' => 'feedback_campaign',
                'reference_id' => $campaignId,
                'description' => "Earned {$amountBrp} BRP for feedback",
            ]);

            Log::info("BRP Payout (org): org={$orgId}, supporter={$supporterId}, amount={$amountBrp}, campaign={$campaignId}");
        });
    }

    /**
     * Release unused reserved BRP back to an organisation's available balance.
     */
    public function releaseBrpForOrg(int $orgId, int $amountBrp, ?int $campaignId = null): OrganizationBrpWallet
    {
        return DB::transaction(function () use ($orgId, $amountBrp, $campaignId) {
            $wallet = $this->getOrCreateOrganizationWallet($orgId);
            $wallet->decrement('reserved_brp', $amountBrp);

            OrganizationBrpTransaction::create([
                'organization_id' => $orgId,
                'type' => 'release',
                'amount_brp' => $amountBrp,
                'reference_type' => $campaignId ? 'feedback_campaign' : null,
                'reference_id' => $campaignId,
                'description' => "Released {$amountBrp} unused BRP",
            ]);

            return $wallet->fresh();
        });
    }

    /**
     * Get available balance for an organisation.
     */
    public function getAvailableBalanceForOrg(int $orgId): int
    {
        $wallet = $this->getOrCreateOrganizationWallet($orgId);
        return $wallet->available_brp;
    }
}

