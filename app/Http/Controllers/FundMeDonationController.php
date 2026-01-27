<?php

namespace App\Http\Controllers;

use App\Models\FundMeCampaign;
use App\Models\FundMeDonation;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FundMeDonationController extends Controller
{
    /**
     * Process a Believe FundMe donation (creates record; payment can be wired later).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'fundme_campaign_id' => 'required|exists:fundme_campaigns,id',
            'amount' => 'required|numeric|min:1',
            'donor_name' => 'nullable|string|max:255',
            'donor_email' => 'required|email',
            'anonymous' => 'boolean',
        ]);

        $campaign = FundMeCampaign::live()->find($validated['fundme_campaign_id']);
        if (!$campaign) {
            return back()->withErrors(['campaign' => 'Campaign not found or not accepting donations.']);
        }

        $amountCents = (int) round((float) $validated['amount'] * 100);
        if ($amountCents < 100) {
            return back()->withErrors(['amount' => 'Minimum donation is $1.00.']);
        }

        $donation = FundMeDonation::create([
            'fundme_campaign_id' => $campaign->id,
            'organization_id' => $campaign->organization_id,
            'user_id' => $request->user()?->id,
            'amount' => $amountCents,
            'donor_name' => $validated['donor_name'] ?? null,
            'donor_email' => $validated['donor_email'],
            'anonymous' => (bool) ($validated['anonymous'] ?? false),
            'status' => FundMeDonation::STATUS_PENDING,
            'receipt_number' => FundMeDonation::generateReceiptNumber(),
        ]);

        // TODO: Create Stripe payment intent / checkout; on success set status=succeeded and increment campaign.raised_amount.
        // For MVP we mark as succeeded and increment for demo/testing. In production, do this in a webhook.
        $donation->update(['status' => FundMeDonation::STATUS_SUCCEEDED, 'payment_reference' => 'pending_' . $donation->id]);
        $campaign->increment('raised_amount', $amountCents);

        return redirect()->route('fundme.show', ['slug' => $campaign->slug])
            ->with('success', 'Thank you for your donation! A receipt will be sent to ' . $donation->donor_email . '.');
    }
}
