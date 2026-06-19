@extends('emails.layout')

@section('title', 'Donation Not Verified')
@section('header-title', 'Donation could not be verified')

@section('content')
    <div class="greeting">
        Hello {{ $donor->name }},
    </div>

    <div class="content">
        We were unable to verify your manual payment to {{ $recipientLabel }}. Your donation has not been completed.
    </div>

    <div class="highlight-box">
        <h3 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 18px;">Donation details</h3>
        <div class="info-row">
            <span class="info-label">Recipient:</span>
            <span class="info-value"><strong>{{ $recipientLabel }}</strong></span>
        </div>
        <div class="info-row">
            <span class="info-label">Amount:</span>
            <span class="info-value"><strong>${{ number_format((float) $donation->amount, 2) }}</strong></span>
        </div>
        <div class="info-row">
            <span class="info-label">Payment method:</span>
            <span class="info-value">{{ ucfirst(str_replace('_', ' ', (string) $donation->payment_method)) }}</span>
        </div>
        @if($reviewNotes)
        <div class="info-row">
            <span class="info-label">Note:</span>
            <span class="info-value">{{ $reviewNotes }}</span>
        </div>
        @endif
    </div>

    <div class="content">
        If you believe this was a mistake, please contact {{ $recipientLabel }} or try donating again with a different payment method.
    </div>

    <div class="button-container">
        <a href="{{ route('donate') }}" class="cta-button">
            Donate Again
        </a>
    </div>

    <div class="divider"></div>

    <div class="content" style="font-size: 14px; color: #666666;">
        Questions? Reply to this email for assistance.
    </div>
@endsection
