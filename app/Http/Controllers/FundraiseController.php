<?php

namespace App\Http\Controllers;

use App\Models\FundMeCampaign;
use App\Models\FundraiseLead;
use App\Services\SeoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class FundraiseController extends Controller
{
    private const WEFUNDER_URL = 'https://wefunder.com/raise?utm_source=believeinunity&utm_medium=partner&utm_campaign=qualified_founders';

    /**
     * Public branded funnel (Option 3): Step 1 Explain → Step 2 Qualify form → Step 3 Redirect to Wefunder.
     * Captures leads; no login required.
     */
    public function index()
    {
        return Inertia::render('frontend/Fundraise', [
            'seo' => SeoService::forPage('fundraise'),
            'wefunderUrl' => self::WEFUNDER_URL,
        ]);
    }

    /**
     * Org-only: Support Community Projects (Donation vs Investment cards, Wefunder).
     */
    public function communityProjects(Request $request)
    {
        $user = $request->user();
        $org = $user?->organization;
        if (!$org) {
            abort(403, 'Organization accounts only. No organization associated with your account.');
        }

        $projects = FundMeCampaign::forOrganization($org->id)
            ->orderByDesc('updated_at')
            ->get(['id', 'title', 'slug', 'status'])
            ->map(fn ($c) => [
                'id' => $c->id,
                'title' => $c->title,
                'slug' => $c->slug,
                'status' => $c->status,
            ]);

        return Inertia::render('frontend/FundraiseCommunityProjects', [
            'seo' => array_merge(SeoService::forPage('fundraise'), ['title' => 'Support Community Projects']),
            'wefunderUrl' => self::WEFUNDER_URL,
            'projects' => $projects,
            'fundMeCreateUrl' => route('fundme.campaigns.create'),
            'fundMeIndexUrl' => route('fundme.index'),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'company' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'project_summary' => 'required|string|max:2000',
        ]);

        try {
            FundraiseLead::create($validated);
            Log::info('Fundraise lead captured', [
                'email' => $validated['email'],
                'company' => $validated['company'],
            ]);
        } catch (\Exception $e) {
            Log::error('Fundraise lead save failed', [
                'error' => $e->getMessage(),
                'data' => $validated,
            ]);
        }

        return Inertia::location(self::WEFUNDER_URL);
    }
}
