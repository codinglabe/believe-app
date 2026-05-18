@extends('emails.layout')

@section('title', 'New Order Received')
@section('header-title', '🎉 New Order Received!')

@section('content')
    <div class="greeting">
        Hello {{ $order->seller->name }},
    </div>

    <div class="content">
        Great news! You have received a new order for your service. A buyer has placed an order and is waiting for your approval.
    </div>

    <div class="highlight-box">
        <h3 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 18px;">📦 Order Details</h3>
        <div class="info-row">
            <span class="info-label">Order Number:</span>
            <span class="info-value"><strong>{{ $order->order_number }}</strong></span>
        </div>
        <div class="info-row">
            <span class="info-label">Service:</span>
            <span class="info-value"><strong>{{ $order->gig->title }}</strong></span>
        </div>
        <div class="info-row">
            <span class="info-label">Package:</span>
            <span class="info-value">{{ $order->package_type ?? 'Standard' }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Buyer:</span>
            <span class="info-value">{{ $order->buyer->name }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Order Amount:</span>
            <span class="info-value">${{ number_format($order->amount, 2) }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Your Earnings:</span>
            <span class="info-value" style="color: #10b981; font-weight: 600;">${{ number_format($order->seller_earnings, 2) }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Order Date:</span>
            <span class="info-value">{{ $order->created_at->format('F j, Y g:i A') }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Status:</span>
            <span class="info-value" style="color: #f59e0b; font-weight: 600;">Pending Approval</span>
        </div>
    </div>

    @if($order->requirements)
    <div class="content">
        <strong>Requirements:</strong><br>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-top: 10px;">
            {{ $order->requirements }}
        </div>
    </div>
    @endif

    @if($order->special_instructions)
    <div class="content">
        <strong>Special Instructions:</strong><br>
        <div style="background-color: #f0f9ff; padding: 15px; border-left: 4px solid #3b82f6; border-radius: 4px; margin-top: 10px;">
            {{ $order->special_instructions }}
        </div>
    </div>
    @endif

    <div class="content">
        <strong>What's Next?</strong><br>
        Please review the order details and requirements. You can approve or reject this order from your seller dashboard. Once approved, you can start working on the order.
    </div>

    <div class="button-container">
        <a href="{{ $orderUrl }}" class="cta-button">
            View & Manage Order
        </a>
    </div>

    <div class="divider"></div>

    <div class="content" style="font-size: 14px; color: #666666;">
        <strong>Important Notes:</strong><br>
        • Please review the order requirements carefully before approving<br>
        • You have the option to reject the order if it doesn't meet your criteria<br>
        • Once approved, the order status will change to "In Progress"<br>
        • Make sure to deliver the order within the agreed timeframe
    </div>
@endsection

