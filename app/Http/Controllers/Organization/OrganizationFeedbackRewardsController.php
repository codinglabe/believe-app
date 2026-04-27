<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Models\FeedbackCampaign;
use App\Models\Organization;
use App\Services\FeedbackCampaignService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class OrganizationFeedbackRewardsController extends Controller
{
    private const PLATFORM_FEE_RATE = 0.045;

    private const PROCESSING_FEE_RATE = 0.035;

    /** USD cost per response for each internal campaign type (displayed as 0.03 / 0.10 / 0.25 / 0.50 BP). */
    private const CAMPAIGN_TYPE_COST_USD = [
        'quick_vote' => 0.03,
        'short_feedback' => 0.10,
        'standard_survey' => 0.25,
        'deep_feedback' => 0.50,
    ];

    private const CAMPAIGN_TYPE_DEFAULT_REWARD_BP = [
        'quick_vote' => 3,
        'short_feedback' => 10,
        'standard_survey' => 25,
        'deep_feedback' => 50,
    ];

    protected FeedbackCampaignService $campaignService;

    public function __construct(FeedbackCampaignService $campaignService)
    {
        $this->campaignService = $campaignService;
    }

    /**
     * Resolve the authenticated user's organisation (or abort 403).
     */
    protected function resolveOrg(): Organization
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        if (! $user) {
            abort(403, 'Unauthenticated.');
        }

        $org = Organization::forAuthUser($user);

        if (! $org) {
            abort(403, 'No organisation linked to your account.');
        }

        return $org;
    }

    /**
     * List all feedback campaigns for the organisation.
     */
    public function index(Request $request)
    {
        $org = $this->resolveOrg();

        $query = FeedbackCampaign::where('organization_id', $org->id)
            ->withCount('responses');

        if ($request->has('status') && $request->status !== '') {
            $query->where('status', $request->status);
        }

        if ($request->has('search') && $request->search) {
            $query->where('title', 'like', "%{$request->search}%");
        }

        $matchingCampaigns = (clone $query)->get();
        $totalResponsesForFilter = $matchingCampaigns->sum('responses_count');
        $filteredCampaignCount = $matchingCampaigns->count();
        $completedInFilter = $matchingCampaigns->where('status', 'completed')->count();

        $activeCampaignsForOrg = FeedbackCampaign::where('organization_id', $org->id)
            ->where('status', 'active')
            ->count();

        $campaigns = (clone $query)->orderBy('created_at', 'desc')
            ->paginate(15)
            ->withQueryString();

        $owner = $org->user;
        $bpBalance = $owner ? (float) ($owner->believe_points ?? 0) : 0.0;

        // spent_budget_brp stored as US-cent integers; divide by 100 for BP display
        $spentCents = FeedbackCampaign::where('organization_id', $org->id)->sum('spent_budget_brp');
        $sentBp = round($spentCents / 100, 2);

        return Inertia::render('Organization/FeedbackRewards/Index', [
            'campaigns' => $campaigns,
            'stats' => [
                'active_campaigns' => $activeCampaignsForOrg,
                'total_responses' => $totalResponsesForFilter,
                'filtered_campaigns' => $filteredCampaignCount,
                'completed_in_filter' => $completedInFilter,
            ],
            'wallet' => [
                'balance_brp'      => $bpBalance,
                'reserved_brp'     => 0,
                'spent_brp'        => $sentBp,
                'available_brp'    => $bpBalance,
                'balance_dollars'  => $bpBalance,
                'available_dollars' => $bpBalance,
                'reserved_dollars' => 0.0,
                'sent_bp'          => $sentBp,
                'sent_dollars'     => $sentBp,
            ],
            'organization' => [
                'id' => $org->id,
                'name' => $org->name,
            ],
            'filters' => [
                'search' => $request->search ?? '',
                'status' => $request->status ?? '',
                'view'   => $request->view ?? 'campaigns',
            ],
        ]);
    }

    /**
     * Show the create campaign form.
     * Same fee + live-calculation model as the merchant create flow; GET params for Inertia partial reloads.
     */
    public function create(Request $request)
    {
        $org = $this->resolveOrg();
        $owner = $org->user;
        $bpBalance = $owner ? (float) ($owner->believe_points ?? 0) : 0.0;

        $budgetBp = (int) ($request->get('fee_preview_budget_bp') ?? 0);
        $budgetBp = max(0, $budgetBp);
        $budgetUsd = round((float) $budgetBp, 2);
        $budgetCents = (int) round($budgetUsd * 100);
        $platformFeeUsd = $budgetUsd > 0 ? round($budgetUsd * self::PLATFORM_FEE_RATE, 2) : 0.0;
        $processingFeeUsd = $budgetUsd > 0 ? round($budgetUsd * self::PROCESSING_FEE_RATE, 2) : 0.0;
        $totalUsd = round($budgetUsd + $platformFeeUsd + $processingFeeUsd, 2);

        $previewType = (string) $request->get('fee_preview_type', 'short_feedback');
        if (! array_key_exists($previewType, self::CAMPAIGN_TYPE_COST_USD)) {
            $previewType = 'short_feedback';
        }
        $cprPreviewUsd = self::CAMPAIGN_TYPE_COST_USD[$previewType];
        $defaultRewardBp = self::CAMPAIGN_TYPE_DEFAULT_REWARD_BP[$previewType];
        $rewardInput = $request->get('fee_preview_reward_bp');
        $rewardForPreview = (is_numeric($rewardInput) && (int) $rewardInput > 0)
            ? (int) $rewardInput
            : $defaultRewardBp;

        $liveCalculation = null;
        if ($budgetBp > 0) {
            $maxByType = $cprPreviewUsd > 0 ? (int) round($budgetUsd / $cprPreviewUsd) : 0;
            $maxByCustom = $rewardForPreview > 0 ? (int) floor($budgetCents / $rewardForPreview) : 0;
            $liveCalculation = [
                'per_response_bp_display' => round($cprPreviewUsd, 2),
                'max_responses' => $maxByType,
                'reward_matches_type_default' => $rewardForPreview === $defaultRewardBp,
                'custom_max_responses' => $maxByCustom,
                'budget_usd' => $budgetUsd,
                'platform_fee_usd' => $platformFeeUsd,
                'processing_fee_usd' => $processingFeeUsd,
                'total_usd' => $totalUsd,
                'sufficient_bp' => $bpBalance >= $budgetBp,
            ];
        }

        return Inertia::render('Organization/FeedbackRewards/Create', [
            'wallet' => [
                'balance_brp'    => $bpBalance,
                'available_brp'  => $bpBalance,
            ],
            'organization' => [
                'id' => $org->id,
                'name' => $org->name,
            ],
            'campaignTypes' => [
                ['value' => 'quick_vote', 'label' => 'Quick Vote', 'default_reward' => 3, 'est_time' => '~10 sec', 'per_response_bp_display' => 0.03],
                ['value' => 'short_feedback', 'label' => 'Short Feedback', 'default_reward' => 10, 'est_time' => '~1 min', 'per_response_bp_display' => 0.10],
                ['value' => 'standard_survey', 'label' => 'Standard Survey', 'default_reward' => 25, 'est_time' => '~3 min', 'per_response_bp_display' => 0.25],
                ['value' => 'deep_feedback', 'label' => 'Deep Feedback', 'default_reward' => 50, 'est_time' => '~5 min', 'per_response_bp_display' => 0.50],
            ],
            'liveCalculation' => $liveCalculation,
        ]);
    }

    /**
     * Store a new campaign.
     */
    public function store(Request $request)
    {
        $org = $this->resolveOrg();

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'type' => 'required|in:quick_vote,short_feedback,standard_survey,deep_feedback',
            'reward_per_response_brp' => 'required|integer|min:1',
            'total_budget_brp' => 'required|integer|min:1',
            'question_text' => 'required|string|max:1000',
            'question_type' => 'required|in:yes_no,true_false,multiple_choice',
            'options' => 'required_if:question_type,multiple_choice|array|min:2|max:6',
            'options.*' => 'required_if:question_type,multiple_choice|nullable|string|max:255',
            'starts_at' => 'nullable|date',
            'ends_at' => 'nullable|date|after_or_equal:starts_at',
        ], [
            'title.required' => 'Campaign title is required.',
            'type.required' => 'Please select a campaign type.',
            'reward_per_response_brp.required' => 'Reward per response is required.',
            'reward_per_response_brp.min' => 'Reward must be at least 1 BP.',
            'total_budget_brp.required' => 'Total budget is required.',
            'total_budget_brp.min' => 'Budget must be at least 1 BP.',
            'question_text.required' => 'Please enter a question.',
            'question_type.required' => 'Please select a question type.',
            'options.required_if' => 'Multiple choice questions require at least 2 options.',
            'options.min' => 'Multiple choice questions require at least 2 options.',
            'options.max' => 'Maximum 6 options allowed.',
        ]);

        if ($validated['total_budget_brp'] < $validated['reward_per_response_brp']) {
            return redirect()->back()
                ->withInput()
                ->withErrors(['total_budget_brp' => 'Budget must be at least equal to reward per response.']);
        }

        try {
            $campaign = $this->campaignService->createCampaignForOrg($org->id, $validated);

            return redirect()->route('org.feedback-rewards.show', $campaign->id)
                ->with('success', 'Campaign created successfully!');
        } catch (\Exception $e) {
            Log::error('Org campaign creation error: ' . $e->getMessage());

            return redirect()->back()
                ->withInput()
                ->with('error', 'Failed to create campaign: ' . $e->getMessage());
        }
    }

    /**
     * Show the edit form for a draft campaign.
     */
    public function edit(FeedbackCampaign $campaign)
    {
        $org = $this->resolveOrg();

        if ($campaign->organization_id !== $org->id) {
            abort(403, 'Unauthorized access.');
        }

        $campaign->load('questions.options');
        $owner = $org->user;
        $bpBalance = $owner ? (float) ($owner->believe_points ?? 0) : 0.0;
        $question = $campaign->questions->first();

        return Inertia::render('Organization/FeedbackRewards/Edit', [
            'campaign' => [
                'id' => $campaign->id,
                'title' => $campaign->title,
                'type' => $campaign->type,
                'reward_per_response_brp' => $campaign->reward_per_response_brp,
                'total_budget_brp' => $campaign->total_budget_brp,
                'starts_at' => $campaign->starts_at?->format('Y-m-d'),
                'ends_at' => $campaign->ends_at?->format('Y-m-d'),
                'question_text' => $question?->question_text ?? '',
                'question_type' => $question?->question_type ?? 'multiple_choice',
                'options' => $question && $question->question_type === 'multiple_choice'
                    ? $question->options->pluck('option_text')->toArray()
                    : ['', ''],
            ],
            'wallet' => [
                'balance_brp'  => $bpBalance,
                'available_brp' => $bpBalance,
            ],
            'organization' => [
                'id' => $org->id,
                'name' => $org->name,
            ],
            'campaignTypes' => [
                ['value' => 'quick_vote', 'label' => 'Quick Vote', 'default_reward' => 3, 'est_time' => '~10 sec', 'per_response_bp_display' => 0.03],
                ['value' => 'short_feedback', 'label' => 'Short Feedback', 'default_reward' => 10, 'est_time' => '~1 min', 'per_response_bp_display' => 0.10],
                ['value' => 'standard_survey', 'label' => 'Standard Survey', 'default_reward' => 25, 'est_time' => '~3 min', 'per_response_bp_display' => 0.25],
                ['value' => 'deep_feedback', 'label' => 'Deep Feedback', 'default_reward' => 50, 'est_time' => '~5 min', 'per_response_bp_display' => 0.50],
            ],
        ]);
    }

    /**
     * Update a draft campaign.
     */
    public function update(Request $request, FeedbackCampaign $campaign)
    {
        $org = $this->resolveOrg();

        if ($campaign->organization_id !== $org->id) {
            abort(403, 'Unauthorized access.');
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'type' => 'required|in:quick_vote,short_feedback,standard_survey,deep_feedback',
            'reward_per_response_brp' => 'required|integer|min:1',
            'total_budget_brp' => 'required|integer|min:1',
            'question_text' => 'required|string|max:1000',
            'question_type' => 'required|in:yes_no,true_false,multiple_choice',
            'options' => 'required_if:question_type,multiple_choice|array|min:2|max:6',
            'options.*' => 'required_if:question_type,multiple_choice|nullable|string|max:255',
            'starts_at' => 'nullable|date',
            'ends_at' => 'nullable|date|after_or_equal:starts_at',
        ]);

        if ($validated['total_budget_brp'] < $validated['reward_per_response_brp']) {
            return redirect()->back()
                ->withInput()
                ->withErrors(['total_budget_brp' => 'Budget must be at least equal to reward per response.']);
        }

        try {
            $this->campaignService->updateCampaignForOrg($campaign, $validated);

            return redirect()->route('org.feedback-rewards.show', $campaign->id)
                ->with('success', 'Campaign updated successfully!');
        } catch (\Exception $e) {
            Log::error('Org campaign update error: ' . $e->getMessage());

            return redirect()->back()
                ->withInput()
                ->with('error', 'Failed to update campaign: ' . $e->getMessage());
        }
    }

    /**
     * Show campaign details with insights.
     */
    public function show(FeedbackCampaign $campaign)
    {
        $org = $this->resolveOrg();

        if ($campaign->organization_id !== $org->id) {
            abort(403, 'Unauthorized access.');
        }

        $campaign->load('questions.options');
        $insights = $this->campaignService->getCampaignInsights($campaign);

        $recentResponses = $campaign->responses()
            ->with('supporter:id,name,email')
            ->latest()
            ->take(20)
            ->get();

        return Inertia::render('Organization/FeedbackRewards/Show', [
            'campaign' => $campaign,
            'insights' => $insights,
            'recentResponses' => $recentResponses,
            'organization' => [
                'id' => $org->id,
                'name' => $org->name,
            ],
        ]);
    }

    /**
     * Launch a draft campaign.
     */
    public function launch(FeedbackCampaign $campaign)
    {
        $org = $this->resolveOrg();

        if ($campaign->organization_id !== $org->id) {
            abort(403, 'Unauthorized access.');
        }

        try {
            $this->campaignService->launchCampaignForOrg($campaign);

            return redirect()->route('org.feedback-rewards.show', $campaign->id)
                ->with('success', 'Campaign launched successfully! BP has been reserved.');
        } catch (\Exception $e) {
            return redirect()->back()
                ->with('error', $e->getMessage());
        }
    }

    /**
     * End an active campaign.
     */
    public function end(FeedbackCampaign $campaign)
    {
        $org = $this->resolveOrg();

        if ($campaign->organization_id !== $org->id) {
            abort(403, 'Unauthorized access.');
        }

        try {
            $this->campaignService->endCampaignForOrg($campaign);

            return redirect()->route('org.feedback-rewards.show', $campaign->id)
                ->with('success', 'Campaign ended. Unused BP has been returned to your wallet.');
        } catch (\Exception $e) {
            return redirect()->back()
                ->with('error', $e->getMessage());
        }
    }
}
