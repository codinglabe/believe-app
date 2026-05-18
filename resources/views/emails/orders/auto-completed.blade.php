@component('mail::message')
# Order Automatically Completed

@if($isBuyer)
Your order **#{{ $order->order_number }}** for "{{ $order->gig->title }}" has been automatically marked as completed.

**Reason:** You didn't accept or reject the delivery within 48 hours, so the system has automatically completed the order.

@else
Order **#{{ $order->order_number }}** for "{{ $order->gig->title }}" has been automatically completed.

**Reason:** The buyer didn't accept or reject the delivery within 48 hours, so the system has automatically completed the order and released your earnings.

**Your Earnings:** ${{ number_format($order->seller_earnings, 2) }}
@endif

@component('mail::button', ['url' => route('service-hub.order.detail', $order->id)])
View Order Details
@endcomponent

Thanks,<br>
{{ config('app.name') }}
@endcomponent
