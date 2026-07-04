@extends('emails.layout')

@section('title', 'Payment Under Review')
@section('header-title', 'Payment confirmation received')

@section('content')
    <div class="greeting">
        Hello {{ $donor->name }},
    </div>

    <div class="content">
        Thank you for confirming your manual payment to {{ $recipientLabel }}. Your donation is now pending verification by the organization.
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
        <div class="info-row">
            <span class="info-label">Status:</span>
            <span class="info-value">Pending verification</span>
        </div>
    </div>

    <div class="content">
        Once the organization verifies your payment, you will receive a confirmation email and push notification, plus +{{ $brpAmount }} BRP (Believe Reward Points).
    </div>

    <div class="divider"></div>

    <div class="content" style="font-size: 14px; color: #666666;">
        Questions? Reply to this email or contact {{ $recipientLabel }} directly.
    </div>
@endsection
