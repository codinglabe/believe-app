@extends('emails.layout')

@section('title', 'New Donation Received')
@section('header-title', '🎉 New Donation Received!')

@section('content')
    <div class="greeting">
        Hello {{ $orgUser->name }},
    </div>

    <div class="content">
        Great news! A supporter just made a donation to your organization on {{ config('app.name') }}.
    </div>

    <div class="highlight-box">
        <h3 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 18px;">💝 Donation Details</h3>
        <div class="info-row">
            <span class="info-label">Donor:</span>
            <span class="info-value"><strong>{{ $donorName }}</strong></span>
        </div>
        <div class="info-row">
            <span class="info-label">Amount:</span>
            <span class="info-value" style="color: #10b981; font-weight: 600;">${{ number_format((float) $donation->amount, 2) }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Date:</span>
            <span class="info-value">{{ $donationDateFormatted }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Frequency:</span>
            <span class="info-value">{{ $donation->frequency === 'one-time' ? 'One-time' : ucfirst(str_replace('-', ' ', (string) $donation->frequency)) }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Payment method:</span>
            <span class="info-value">{{ $donation->payment_method === 'believe_points' ? 'Believe Points' : ucfirst(str_replace('_', ' ', (string) $donation->payment_method)) }}</span>
        </div>
    </div>

    @if($donation->message)
    <div class="content">
        <strong>Donor message:</strong><br>
        <div style="background-color: #f0f9ff; padding: 15px; border-left: 4px solid #3b82f6; border-radius: 4px; margin-top: 10px;">
            {{ $donation->message }}
        </div>
    </div>
    @endif

    <div class="content">
        <strong>What's next?</strong><br>
        Review this donation in your dashboard to see donor details and manage your organization's giving activity.
    </div>

    <div class="button-container">
        <a href="{{ $donationsUrl }}" class="cta-button">
            View Donations
        </a>
    </div>

    <div class="divider"></div>

    <div class="content" style="font-size: 14px; color: #666666;">
        Thank you for the work you do in the community. We're honored to help connect you with supporters who believe in your mission.
    </div>
@endsection
