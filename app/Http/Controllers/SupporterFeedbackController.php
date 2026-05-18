<?php

namespace App\Http\Controllers;

use App\Models\FeedbackCampaign;
use App\Services\FeedbackCampaignService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class SupporterFeedbackController extends Controller
{
    protected FeedbackCampaignService $campaignService;

    public function __construct(FeedbackCampaignService $campaignService)
    {
        $this->campaignService = $campaignService;
    }

    /**
     * Show the feedback form for a campaign.
     */
    public function show(string $uuid)
    {
        $campaign = FeedbackCampaign::where('uuid', $uuid)
            ->with('questions.options', 'merchant:id,business_name,name', 'organization:id,name')
            ->firstOrFail();

        $user = Auth::user();
        $alreadyResponded = false;

        if ($user) {
            $alreadyResponded = $campaign->responses()
                ->where('supporter_id', $user->id)
                ->exists();
        }

        if ($campaign->status !== 'active' && ! $alreadyResponded) {
            abort(404);
        }

        return Inertia::render('merchant/Feedback/Show', [
            'campaign' => [
                'uuid' => $campaign->uuid,
                'title' => $campaign->title,
                'type' => $campaign->type,
                'reward_per_response_brp' => $campaign->reward_per_response_brp,
                'reward_dollars' => FeedbackCampaign::brpToDollars($campaign->reward_per_response_brp),
                // Display BP (0.03 / 0.10 / …) — stored amount is US cents; 1 BP = $1.00
                'reward_bp_display' => round($campaign->reward_per_response_brp / 100, 2),
                'estimated_time' => FeedbackCampaign::estimatedTimeForType($campaign->type),
                'merchant_name' => $campaign->merchant?->business_name
                    ?? $campaign->merchant?->name
                    ?? $campaign->organization?->name
                    ?? 'Unknown',
                'questions' => $campaign->questions->map(function ($q) {
                    return [
                        'id' => $q->id,
                        'question_text' => $q->question_text,
                        'question_type' => $q->question_type,
                        'options' => $q->options->map(function ($o) {
                            return [
                                'id' => $o->id,
                                'option_text' => $o->option_text,
                            ];
                        }),
                    ];
                }),
            ],
            'alreadyResponded' => $alreadyResponded,
        ]);
    }

    /**
     * Submit a feedback response.
     */
    public function submit(Request $request, string $uuid)
    {
        $campaign = FeedbackCampaign::where('uuid', $uuid)
            ->where('status', 'active')
            ->with('questions.options')
            ->firstOrFail();

        $user = Auth::user();

        $validated = $request->validate([
            'answers' => 'required|array|min:1',
            'answers.*.question_id' => 'required|integer|exists:feedback_campaign_questions,id',
            'answers.*.answer_text' => 'required|string|max:500',
            'answers.*.option_id' => 'nullable|integer|exists:feedback_campaign_question_options,id',
        ]);

        try {
            if ($campaign->organization_id) {
                $this->campaignService->submitResponseForOrg($campaign, $user->id, $validated['answers']);
            } else {
                $this->campaignService->submitResponse($campaign, $user->id, $validated['answers']);
            }

            $earnedUsd = FeedbackCampaign::brpToDollars($campaign->reward_per_response_brp);

            return redirect()->back()
                ->with('success', 'Thank you! You earned $'.number_format($earnedUsd, 2).' to your wallet.');
        } catch (\Exception $e) {
            Log::error('Feedback submission error: ' . $e->getMessage());

            return redirect()->back()
                ->with('error', $e->getMessage());
        }
    }
}
