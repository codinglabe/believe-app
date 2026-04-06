@extends('emails.layout')

@section('title', 'Order Completed')
@section('header-title', '✅ Order Completed!')

@section('content')
    <div class="greeting">
        Hello {{ $order->buyer->name }},
    </div>

    <div class="content">
        We're excited to inform you that your order has been completed successfully! The seller has delivered the work and you have accepted it.
    </div>

    <div class="highlight-box" style="background-color: #d1fae5; border-left: 4px solid #10b981;">
        <h3 style="margin: 0 0 10px 0; color: #065f46; font-size: 18px;">🎉 Order Completed Successfully</h3>
        <p style="margin: 0; color: #047857;">Your order has been marked as completed. Thank you for using our platform!</p>
    </div>

    <div class="highlight-box">
        <h3 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 18px;">📦 Order Summary</h3>
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
            <span class="info-label">Seller:</span>
            <span class="info-value">{{ $order->seller->name }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Total Amount:</span>
            <span class="info-value">${{ number_format($order->amount + $order->platform_fee, 2) }}</span>
        </div>
        @if($order->completed_at)
        <div class="info-row">
            <span class="info-label">Completed Date:</span>
            <span class="info-value">{{ $order->completed_at->format('F j, Y g:i A') }}</span>
        </div>
        @endif
        <div class="info-row">
            <span class="info-label">Status:</span>
            <span class="info-value" style="color: #10b981; font-weight: 600;">Completed</span>
        </div>
    </div>

    @if($order->deliverables && count($order->deliverables) > 0)
    <div class="content">
        <strong>Deliverables:</strong><br>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-top: 10px;">
            @foreach($order->deliverables as $deliverable)
                <div style="margin-bottom: 10px;">
                    <strong>{{ $deliverable['name'] ?? 'File' }}</strong>
                    @if(isset($deliverable['url']))
                        <a href="{{ $deliverable['url'] }}" style="color: #667eea; text-decoration: none; margin-left: 10px;">Download</a>
                    @endif
                </div>
            @endforeach
        </div>
    </div>
    @endif

    <div class="content">
        <strong>What's Next?</strong><br>
        You can now leave a review for the seller to help other buyers make informed decisions. Your feedback is valuable to our community!
    </div>

    <div class="button-container">
        <a href="{{ $orderUrl }}" class="cta-button">
            View Order & Leave Review
        </a>
    </div>

    <div class="divider"></div>

    <div class="content" style="font-size: 14px; color: #666666;">
        <strong>Important Notes:</strong><br>
        • All deliverables are available in your order details<br>
        • You can download the files anytime from your order page<br>
        • Consider leaving a review to help the seller and other buyers<br>
        • If you have any issues, please contact our support team
    </div>

    <div class="content" style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 4px; margin-top: 30px;">
        <p style="margin: 0; color: #1e40af;">
            <strong>💡 Tip:</strong> Leaving a review helps the seller build their reputation and helps other buyers find quality services. Your feedback makes a difference!
        </p>
    </div>
@endsection

