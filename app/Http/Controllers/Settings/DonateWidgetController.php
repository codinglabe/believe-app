<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Support\DonateWidgetEmbed;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DonateWidgetController extends Controller
{
    public function edit(Request $request): Response
    {
        abort_unless($request->user()?->role === 'organization', 403);

        return Inertia::render('settings/donate-widget', [
            'donateWidget' => DonateWidgetEmbed::payloadForUser($request->user()),
        ]);
    }
}
