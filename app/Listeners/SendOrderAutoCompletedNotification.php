<?php

namespace App\Listeners;

use App\Events\OrderAutoCompleted;
use App\Mail\OrderAutoCompletedNotification;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class SendOrderAutoCompletedNotification
{
    /**
     * Create the event listener.
     */
    public function __construct()
    {
        //
    }

    /**
     * Handle the event.
     */
    public function handle(OrderAutoCompleted $event): void
    {
        try {
            $order = $event->order;
            $order->load(['seller', 'buyer']);

            // Send email to buyer
            Mail::to($order->buyer->email)
                ->send(new OrderAutoCompletedNotification($order));

            // Send email to seller
            Mail::to($order->seller->email)
                ->send(new OrderAutoCompletedNotification($order));

        } catch (\Exception $e) {
            Log::error('Failed to send auto-completion notification', [
                'order_id' => $event->order->id,
                'error' => $e->getMessage()
            ]);
        }
    }
}
