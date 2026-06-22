@extends('emails.layout')

@section('title', $headline)
@section('header-title', $headline)

@section('content')
    <div class="greeting">
        Hello {{ $user->name }},
    </div>

    <div class="content">
        {{ $message }}
    </div>

    <div class="highlight-box">
        <h3 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 18px;">Transaction details</h3>
        <div class="info-row">
            <span class="info-label">Type:</span>
            <span class="info-value">{{ ucfirst(str_replace('_', ' ', (string) $transaction->type)) }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Amount:</span>
            <span class="info-value" style="color: #10b981; font-weight: 600;">${{ number_format((float) $transaction->amount, 2) }}</span>
        </div>
        @if((float) ($transaction->fee ?? 0) > 0)
        <div class="info-row">
            <span class="info-label">Fee:</span>
            <span class="info-value">${{ number_format((float) $transaction->fee, 2) }}</span>
        </div>
        @endif
        <div class="info-row">
            <span class="info-label">Reference:</span>
            <span class="info-value">{{ $transaction->transaction_id }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Date:</span>
            <span class="info-value">{{ ($transaction->processed_at ?? $transaction->created_at)?->format('F j, Y g:i A') }}</span>
        </div>
    </div>

    <div class="button-container">
        <a href="{{ $walletUrl }}" class="cta-button">
            View Wallet Activity
        </a>
    </div>

    <div class="divider"></div>

    <div class="content" style="font-size: 14px; color: #666;">
        If you did not authorize this transaction, please contact support immediately.
    </div>
@endsection
