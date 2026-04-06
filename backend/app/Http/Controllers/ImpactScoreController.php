<?php

namespace App\Http\Controllers;

use App\Services\ImpactScoreService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ImpactScoreController extends Controller
{
    protected $impactScoreService;

    public function __construct(ImpactScoreService $impactScoreService)
    {
        $this->impactScoreService = $impactScoreService;
    }

    /**
     * Get user's impact score.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $period = $request->get('period', 'monthly'); // monthly, quarterly, annual

        $score = $this->impactScoreService->calculateImpactScore($user, $period);
        $breakdown = $this->impactScoreService->getPointsBreakdown($user, $period);

        return response()->json([
            'score' => $score,
            'breakdown' => $breakdown,
        ]);
    }

    /**
     * Show impact score dashboard page.
     */
    public function show(Request $request)
    {
        $user = $request->user();
        $period = $request->get('period', 'monthly');

        $score = $this->impactScoreService->calculateImpactScore($user, $period);
        $breakdown = $this->impactScoreService->getPointsBreakdown($user, $period);

        return Inertia::render('frontend/user-profile/impact-score', [
            'score' => $score,
            'breakdown' => $breakdown,
            'period' => $period,
        ]);
    }
}
