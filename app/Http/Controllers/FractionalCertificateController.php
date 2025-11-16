<?php

namespace App\Http\Controllers;

use App\Models\FractionalOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class FractionalCertificateController extends Controller
{
    public function show($orderId)
    {
        $order = FractionalOrder::with(['offering.asset', 'user'])
            ->where('id', $orderId)
            ->where('user_id', Auth::id())
            ->where('status', 'paid')
            ->firstOrFail();

        return Inertia::render('frontend/fractional/Certificate', [
            'order' => $order,
        ]);
    }

    public function download($orderId)
    {
        $order = FractionalOrder::with(['offering.asset', 'user'])
            ->where('id', $orderId)
            ->where('user_id', Auth::id())
            ->where('status', 'paid')
            ->firstOrFail();

        // Return the order data for frontend PDF generation
        return Inertia::render('frontend/fractional/CertificateDownload', [
            'order' => $order,
        ]);
    }
}
