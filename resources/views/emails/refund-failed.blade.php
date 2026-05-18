<x-mail::message>
# Refund Failed

A refund attempt for order **#{{ $order->order_number }}** has failed.

**Order Details:**
- Order Number: {{ $order->order_number }}
- Service: {{ $order->gig->title ?? 'N/A' }}
- Buyer: {{ $order->buyer->name ?? 'N/A' }}
- Seller: {{ $order->seller->name ?? 'N/A' }}
- Amount: ${{ number_format($order->amount, 2) }}
- Payment Method: {{ ucfirst(str_replace('_', ' ', $order->payment_method)) }}

**Error Message:**
{{ $errorMessage }}

**Action Required:**
Please manually review and process the refund through the admin panel.

<x-mail::button :url="route('admin.orders.show', $order->id)">
View Order in Admin Panel
</x-mail::button>

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
