@extends('emails.layout')

@section('title', 'Donation Confirmed')
@section('header-title', '💜 Thank You for Your Donation!')

@section('content')
    <div class="greeting">
        Hello {{ $donor->name }},
    </div>

    <div class="content">
        Your generous donation has been received. Thank you for supporting {{ $recipientLabel }} through {{ config('app.name') }}.
    </div>

    <div class="highlight-box">
        <h3 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 18px;">🧾 Donation Details</h3>
        <div class="info-row">
            <span class="info-label">Recipient:</span>
            <span class="info-value"><strong>{{ $recipientLabel }}</strong></span>
        </div>
        <div class="info-row">
            <span class="info-label">Amount:</span>
            <span class="info-value"><strong>${{ number_format((float) $donation->amount, 2) }}</strong></span>
        </div>
        <div class="info-row">
            <span class="info-label">Date:</span>
            <span class="info-value">{{ $donation->donation_date?->format('F j, Y g:i A') ?? now()->format('F j, Y g:i A') }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Frequency:</span>
            <span class="info-value">{{ $donation->frequency === 'one-time' ? 'One-time' : ucfirst(str_replace('-', ' ', (string) $donation->frequency)) }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Payment method:</span>
            <span class="info-value">{{ $donation->payment_method === 'believe_points' ? 'Believe Points' : ucfirst(str_replace('_', ' ', (string) $donation->payment_method)) }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Believe Reward Points:</span>
            <span class="info-value"><strong>+{{ $brpAmount }} BRP</strong></span>
        </div>
        @if($donation->transaction_id)
        <div class="info-row">
            <span class="info-label">Reference:</span>
            <span class="info-value">{{ $donation->transaction_id }}</span>
        </div>
        @endif
    </div>

    @if($donation->message)
    <div class="content">
        <strong>Your message:</strong><br>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-top: 10px;">
            {{ $donation->message }}
        </div>
    </div>
    @endif

    <div class="content">
        This email confirms your donation was processed successfully. You can view your donation history anytime in your Believe account.
    </div>

    <div class="button-container">
        <a href="{{ $successUrl }}" class="cta-button">
            View Donation Receipt
        </a>
    </div>

    <div class="divider"></div>

    <div class="content" style="font-size: 14px; color: #666666;">
        Questions about your donation? Reply to this email or visit your profile donations page for more details.
    </div>
@endsection
