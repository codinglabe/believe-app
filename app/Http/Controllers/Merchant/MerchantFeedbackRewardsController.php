<?php

namespace App\Http\Controllers\Merchant;

use App\Http\Controllers\Controller;
use App\Models\FeedbackCampaign;
use App\Services\BrpWalletService;
use App\Services\FeedbackCampaignService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class MerchantFeedbackRewardsController extends Controller
{
    protected FeedbackCampaignService $campaignService;
    protected BrpWalletService $walletService;

    public function __construct(FeedbackCampaignService $campaignService, BrpWalletService $walletService)
    {
        $this->campaignService = $campaignService;
        $this->walletService = $walletService;
    }

    /**
     * List all feedback campaigns for the merchant.
     */
    public function index(Request $request)
    {
        $merchant = Auth::guard('merchant')->user();

        $query = FeedbackCampaign::where('merchant_id', $merchant->id)
            ->withCount('responses');

        if ($request->has('status') && $request->status !== '') {
            $query->where('status', $request->status);
        }

        if ($request->has('search') && $request->search) {
            $query->where('title', 'like', "%{$request->search}%");
        }

        $campaigns = $query->orderBy('created_at', 'desc')
            ->paginate(15)
            ->withQueryString();

        $wallet = $this->walletService->getOrCreateMerchantWallet($merchant->id);

        return Inertia::render('merchant/FeedbackRewards/Index', [
            'campaigns' => $campaigns,
            'wallet' => [
                'balance_brp' => $wallet->balance_brp,
                'reserved_brp' => $wallet->reserved_brp,
                'spent_brp' => $wallet->spent_brp,
                'available_brp' => $wallet->available_brp,
            ],
            'filters' => [
                'search' => $request->search ?? '',
                'status' => $request->status ?? '',
            ],
        ]);
    }

    /**
     * Show the create campaign form.
     */
    public function create()
    {
        $merchant = Auth::guard('merchant')->user();
        $wallet = $this->walletService->getOrCreateMerchantWallet($merchant->id);

        return Inertia::render('merchant/FeedbackRewards/Create', [
            'wallet' => [
                'balance_brp' => $wallet->balance_brp,
                'available_brp' => $wallet->available_brp,
            ],
            'campaignTypes' => [
                ['value' => 'quick_vote', 'label' => 'Quick Vote', 'default_reward' => 3, 'est_time' => '~10 sec'],
                ['value' => 'short_feedback', 'label' => 'Short Feedback', 'default_reward' => 10, 'est_time' => '~1 min'],
                ['value' => 'standard_survey', 'label' => 'Standard Survey', 'default_reward' => 25, 'est_time' => '~3 min'],
                ['value' => 'deep_feedback', 'label' => 'Deep Feedback', 'default_reward' => 50, 'est_time' => '~5 min'],
            ],
        ]);
    }

    /**
     * Store a new campaign.
     */
    public function store(Request $request)
    {
        $merchant = Auth::guard('merchant')->user();

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'type' => 'required|in:quick_vote,short_feedback,standard_survey,deep_feedback',
            'reward_per_response_brp' => 'required|integer|min:1',
            'total_budget_brp' => 'required|integer|min:1',
            'question_text' => 'required|string|max:1000',
            'question_type' => 'required|in:yes_no,true_false,multiple_choice',
            'options' => 'required_if:question_type,multiple_choice|array|min:2|max:6',
            'options.*' => 'required_if:question_type,multiple_choice|string|max:255',
        ], [
            'title.required' => 'Campaign title is required.',
            'type.required' => 'Please select a campaign type.',
            'reward_per_response_brp.required' => 'Reward per response is required.',
            'reward_per_response_brp.min' => 'Reward must be at least 1 BP.',
            'total_budget_brp.required' => 'Total budget is required.',
            'total_budget_brp.min' => 'Budget must be at least 1 BRP.',
            'question_text.required' => 'Please enter a question.',
            'question_type.required' => 'Please select a question type.',
            'options.required_if' => 'Multiple choice questions require at least 2 options.',
            'options.min' => 'Multiple choice questions require at least 2 options.',
            'options.max' => 'Maximum 6 options allowed.',
        ]);

        // Validate budget >= reward
        if ($validated['total_budget_brp'] < $validated['reward_per_response_brp']) {
            return redirect()->back()
                ->withInput()
                ->withErrors(['total_budget_brp' => 'Budget must be at least equal to reward per response.']);
        }

        try {
            $campaign = $this->campaignService->createCampaign($merchant->id, $validated);

            return redirect()->route('feedback-rewards.show', $campaign->id)
                ->with('success', 'Campaign created successfully!');
        } catch (\Exception $e) {
            Log::error('Campaign creation error: ' . $e->getMessage());

            return redirect()->back()
                ->withInput()
                ->with('error', 'Failed to create campaign: ' . $e->getMessage());
        }
    }

    /**
     * Show campaign details with insights.
     */
    public function show(FeedbackCampaign $campaign)
    {
        $merchant = Auth::guard('merchant')->user();

        if ($campaign->merchant_id !== $merchant->id) {
            abort(403, 'Unauthorized access.');
        }

        $campaign->load('questions.options');
        $insights = $this->campaignService->getCampaignInsights($campaign);

        $recentResponses = $campaign->responses()
            ->with('supporter:id,name,email')
            ->latest()
            ->take(20)
            ->get();

        return Inertia::render('merchant/FeedbackRewards/Show', [
            'campaign' => $campaign,
            'insights' => $insights,
            'recentResponses' => $recentResponses,
        ]);
    }

    /**
     * Launch a draft campaign.
     */
    public function launch(FeedbackCampaign $campaign)
    {
        $merchant = Auth::guard('merchant')->user();

        if ($campaign->merchant_id !== $merchant->id) {
            abort(403, 'Unauthorized access.');
        }

        try {
            $this->campaignService->launchCampaign($campaign);

            return redirect()->route('feedback-rewards.show', $campaign->id)
                ->with('success', 'Campaign launched successfully! BRP has been reserved.');
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
        $merchant = Auth::guard('merchant')->user();

        if ($campaign->merchant_id !== $merchant->id) {
            abort(403, 'Unauthorized access.');
        }

        try {
            $this->campaignService->endCampaign($campaign);

            return redirect()->route('feedback-rewards.show', $campaign->id)
                ->with('success', 'Campaign ended. Unused BRP has been released to your wallet.');
        } catch (\Exception $e) {
            return redirect()->back()
                ->with('error', $e->getMessage());
        }
    }
}
