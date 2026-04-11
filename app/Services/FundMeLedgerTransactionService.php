<?php

namespace App\Services;

use App\Models\FundMeDonation;
use App\Models\Transaction;
use App\Models\User;

/**
 * Persists Believe FundMe (Support a project → Give) payments into {@see Transaction} for admin ledger / BIU unified rows.
 */
class FundMeLedgerTransactionService
{
    public function ensureTransactionForSucceededDonation(FundMeDonation $donation): void
    {
        if ($donation->user_id === null || (int) $donation->user_id < 1) {
            return;
        }

        $exists = Transaction::query()
            ->where('related_type', FundMeDonation::class)
            ->where('related_id', $donation->id)
            ->exists();

        if ($exists) {
            return;
        }

        $user = User::query()->find((int) $donation->user_id);
        if ($user === null) {
            return;
        }

        $donation->loadMissing(['campaign:id,title,slug', 'organization:id,name']);

        $campaignTitle = $donation->campaign?->title ?? 'Campaign';
        $orgName = $donation->organization?->name;

        $user->recordTransaction([
            'type' => 'fundme_donation',
            'amount' => $donation->amountDollars(),
            'payment_method' => 'stripe',
            'status' => 'completed',
            'related_id' => $donation->id,
            'related_type' => FundMeDonation::class,
            'transaction_id' => $donation->payment_reference,
            'meta' => array_filter([
                'fundme_donation_id' => $donation->id,
                'fundme_campaign_id' => $donation->fundme_campaign_id,
                'campaign_title' => $campaignTitle,
                'campaign_slug' => $donation->campaign?->slug,
                'organization_id' => $donation->organization_id,
                'organization_name' => $orgName,
                'receipt_number' => $donation->receipt_number,
                'entry_source' => 'support_a_project',
                'description' => 'Support a project — '.$campaignTitle,
            ], fn ($v) => $v !== null && $v !== ''),
        ]);
    }
}
