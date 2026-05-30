<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\View\View;

class DonateWidgetEmbedController extends Controller
{
    /** @var list<string> */
    private const RESERVED_SLUGS = [
        'about', 'admin', 'api', 'auth', 'believe-fundme', 'care-alliance', 'cart', 'chat',
        'checkout', 'contact', 'courses', 'dashboard', 'donate', 'donation', 'embed', 'events',
        'fractional', 'frontend', 'gift-cards', 'jobs', 'livestock', 'login', 'logout',
        'marketplace', 'merchant', 'merchant-hub', 'nonprofit-news', 'oauth', 'organizations',
        'plans', 'profile', 'register', 'reset-password', 'search', 'settings', 'social-feed',
        'stripe', 'verify-email', 'volunteer-opportunities', 'wallet', 'webhook', 'forgot-password',
    ];

    public function show(Request $request, string $orgSlug): View|RedirectResponse|Response
    {
        $organization = $this->resolveApprovedOrganizationBySlug($orgSlug);

        if ($organization === null) {
            return response()
                ->view('embed.donate-widget-not-found', [], Response::HTTP_NOT_FOUND);
        }

        if ($request->filled('method')) {
            return redirect()->route('donate', array_filter([
                'search' => $organization->name,
                'method' => $request->string('method')->toString(),
            ]));
        }

        return view('embed.donate-widget', [
            'orgSlug' => $organization->user?->slug ?? $orgSlug,
        ]);
    }

    private function resolveApprovedOrganizationBySlug(string $orgSlug): ?Organization
    {
        if ($orgSlug === '' || in_array(strtolower($orgSlug), self::RESERVED_SLUGS, true)) {
            return null;
        }

        $user = User::query()
            ->where('slug', $orgSlug)
            ->select('id', 'slug')
            ->first();

        if ($user === null) {
            return null;
        }

        return Organization::query()
            ->where('user_id', $user->id)
            ->where('registration_status', 'approved')
            ->excludingCareAllianceHubs()
            ->with('user:id,slug,name')
            ->first();
    }
}
