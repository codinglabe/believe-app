<?php

namespace App\Http\Controllers;

use App\Models\FundraiseLead;
use App\Models\InvestmentClick;
use Illuminate\Http\Request;

class InvestController extends Controller
{
    /**
     * Redirect to Wefunder project URL and log the click for analytics.
     * Route: GET /invest/redirect/{lead}
     */
    public function redirect(Request $request, FundraiseLead $lead)
    {
        if (empty($lead->wefunder_project_url)) {
            return redirect()->back()->with('error', 'This project is not yet open for investment.');
        }

        $user = $request->user();

        InvestmentClick::create([
            'user_id' => $user?->id,
            'fundraise_lead_id' => $lead->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'clicked_at' => now(),
        ]);

        $url = $lead->wefunder_project_url;
        if (strpos($url, '?') !== false) {
            $url .= '&utm_source=believeinunity&utm_medium=biu_invest';
        } else {
            $url .= '?utm_source=believeinunity&utm_medium=biu_invest';
        }

        return redirect()->away($url);
    }
}
