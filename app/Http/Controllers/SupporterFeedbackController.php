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
            ->with('questions.options', 'merchant:id,business_name,name')
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
                'estimated_time' => FeedbackCampaign::estimatedTimeForType($campaign->type),
                'merchant_name' => $campaign->merchant->business_name ?? $campaign->merchant->name,
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
            $this->campaignService->submitResponse($campaign, $user->id, $validated['answers']);

            return redirect()->back()
                ->with('success', "Thank you! You earned {$campaign->reward_per_response_brp} BP.");
        } catch (\Exception $e) {
            Log::error('Feedback submission error: ' . $e->getMessage());

            return redirect()->back()
                ->with('error', $e->getMessage());
        }
    }
}
