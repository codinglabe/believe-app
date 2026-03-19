<?php

namespace App\Http\Controllers;

use App\Models\KioskActivityLog;
use App\Models\KioskCategory;
use App\Models\KioskUserContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class KioskDashboardController extends Controller
{
    public function index(): RedirectResponse
    {
        $first = KioskCategory::active()->orderBy('sort_order')->first();

        if ($first) {
            return redirect()->route('kiosk.dashboard.show', $first->slug);
        }

        return redirect()->route('kiosk.index');
    }

    public function show(string $category_slug): Response|RedirectResponse
    {
        $category = KioskCategory::where('slug', $category_slug)->where('is_active', true)->firstOrFail();

        $actions = config('kiosk_actions.' . $category_slug, config('kiosk_actions.pay-bills'));
        $redirectUrl = $category->redirect_url ? trim($category->redirect_url) : null;

        foreach ($actions as &$action) {
            if (! empty($action['use_redirect_url']) && $redirectUrl) {
                $action['url'] = $redirectUrl;
            } else {
                $action['url'] = null;
            }
        }

        $user = Auth::user();
        $context = KioskUserContext::firstOrCreate(
            ['user_id' => $user->id, 'category_slug' => $category_slug],
            ['provider_linked' => false]
        );
        $context->update(['last_accessed_at' => now()]);

        KioskActivityLog::create([
            'user_id' => $user->id,
            'category_slug' => $category_slug,
            'action_key' => 'opened_dashboard',
        ]);

        $allCategories = KioskCategory::active()->orderBy('sort_order')->get()->map(fn ($c) => [
            'slug' => $c->slug,
            'title' => $c->title,
        ]);

        return Inertia::render('frontend/kiosk/Dashboard', [
            'category' => [
                'slug' => $category->slug,
                'title' => $category->title,
                'keywords' => $category->keywords ?? '',
            ],
            'actions' => $actions,
            'context' => [
                'provider_linked' => $context->provider_linked,
                'last_accessed_at' => $context->last_accessed_at?->toIso8601String(),
                'next_suggested_action' => $context->next_suggested_action,
                'status' => $context->status,
            ],
            'allCategories' => $allCategories,
        ]);
    }

    public function logAction(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'category_slug' => 'required|string|max:64',
            'action_key' => 'required|string|max:64',
            'metadata' => 'nullable|string|max:500',
        ]);

        KioskActivityLog::create([
            'user_id' => Auth::id(),
            'category_slug' => $validated['category_slug'],
            'action_key' => $validated['action_key'],
            'metadata' => $validated['metadata'] ?? null,
        ]);

        return back();
    }

    public function updateContext(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'category_slug' => 'required|string|max:64',
            'provider_linked' => 'nullable|boolean',
            'next_suggested_action' => 'nullable|string|max:255',
            'status' => 'nullable|string|max:100',
        ]);

        $context = KioskUserContext::firstOrCreate(
            ['user_id' => Auth::id(), 'category_slug' => $validated['category_slug']],
            ['provider_linked' => false]
        );

        $context->update(array_filter([
            'provider_linked' => $validated['provider_linked'] ?? null,
            'next_suggested_action' => $validated['next_suggested_action'] ?? null,
            'status' => $validated['status'] ?? null,
        ], fn ($v) => $v !== null));

        return back();
    }
}
