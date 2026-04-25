<?php

namespace App\Services;

use App\Models\FeedbackCampaign;
use App\Models\FeedbackCampaignQuestion;
use App\Models\FeedbackCampaignQuestionOption;
use App\Models\FeedbackCampaignResponse;
use App\Models\FeedbackCampaignResponseAnswer;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class FeedbackCampaignService
{
    protected BrpWalletService $walletService;

    public function __construct(BrpWalletService $walletService)
    {
        $this->walletService = $walletService;
    }

    /**
     * Create a feedback campaign with questions and options.
     */
    public function createCampaign(int $merchantId, array $data): FeedbackCampaign
    {
        return DB::transaction(function () use ($merchantId, $data) {
            $rewardPerResponse = (int) $data['reward_per_response_brp'];
            $totalBudget = (int) $data['total_budget_brp'];
            $maxResponses = $rewardPerResponse > 0 ? intdiv($totalBudget, $rewardPerResponse) : 0;

            $campaign = FeedbackCampaign::create([
                'merchant_id' => $merchantId,
                'title' => $data['title'],
                'type' => $data['type'],
                'reward_per_response_brp' => $rewardPerResponse,
                'total_budget_brp' => $totalBudget,
                'remaining_budget_brp' => $totalBudget,
                'max_responses' => $maxResponses,
                'status' => 'draft',
            ]);

            // Create question
            if (!empty($data['question_text'])) {
                $question = FeedbackCampaignQuestion::create([
                    'campaign_id' => $campaign->id,
                    'question_text' => $data['question_text'],
                    'question_type' => $data['question_type'],
                    'sort_order' => 0,
                ]);

                // Create options for multiple choice
                if ($data['question_type'] === 'multiple_choice' && !empty($data['options'])) {
                    foreach ($data['options'] as $index => $optionText) {
                        if (!empty(trim($optionText))) {
                            FeedbackCampaignQuestionOption::create([
                                'question_id' => $question->id,
                                'option_text' => trim($optionText),
                                'sort_order' => $index,
                            ]);
                        }
                    }
                }
            }

            Log::info("Campaign created: id={$campaign->id}, merchant={$merchantId}");

            return $campaign->load('questions.options');
        });
    }

    /**
     * Launch a campaign: validate wallet, reserve BRP, set active.
     */
    public function launchCampaign(FeedbackCampaign $campaign): FeedbackCampaign
    {
        if ($campaign->status !== 'draft') {
            throw new \Exception('Only draft campaigns can be launched.');
        }

        if ($campaign->questions()->count() === 0) {
            throw new \Exception('Campaign must have at least one question.');
        }

        return DB::transaction(function () use ($campaign) {
            // Campaign budget is stored in US-cent integer (e.g. 5000 = $50.00). Wallet is whole BP: 1 BP = $1.
            $bpToReserve = intdiv($campaign->total_budget_brp, 100);
            if ($bpToReserve < 1) {
                throw new \Exception('Invalid campaign budget for wallet reserve.');
            }
            $this->walletService->reserveBrp(
                $campaign->merchant_id,
                $bpToReserve,
                'feedback_campaign',
                $campaign->id
            );

            $campaign->update([
                'status' => 'active',
                'reserved_budget_brp' => $campaign->total_budget_brp,
                'remaining_budget_brp' => $campaign->total_budget_brp,
            ]);

            Log::info("Campaign launched: id={$campaign->id}");

            return $campaign->fresh();
        });
    }

    /**
     * End a campaign: release unused BRP, set completed.
     */
    public function endCampaign(FeedbackCampaign $campaign): FeedbackCampaign
    {
        if (!in_array($campaign->status, ['active', 'paused'])) {
            throw new \Exception('Only active or paused campaigns can be ended.');
        }

        return DB::transaction(function () use ($campaign) {
            $unusedBrp = $campaign->remaining_budget_brp;

            if ($unusedBrp > 0) {
                $bpToRelease = intdiv($unusedBrp, 100);
                if ($bpToRelease > 0) {
                    $this->walletService->releaseBrp(
                        $campaign->merchant_id,
                        $bpToRelease,
                        $campaign->id
                    );
                }
            }

            $campaign->update([
                'status' => 'completed',
                'reserved_budget_brp' => 0,
                'remaining_budget_brp' => 0,
            ]);

            Log::info("Campaign ended: id={$campaign->id}, released={$unusedBrp} BRP");

            return $campaign->fresh();
        });
    }

    /**
     * Submit a response: validate, save answers, payout BRP.
     */
    public function submitResponse(FeedbackCampaign $campaign, int $userId, array $answers): FeedbackCampaignResponse
    {
        // Validate campaign is active
        if ($campaign->status !== 'active') {
            throw new \Exception('This campaign is not currently active.');
        }

        // Check budget remaining
        if ($campaign->remaining_budget_brp < $campaign->reward_per_response_brp) {
            throw new \Exception('Campaign budget exhausted.');
        }

        // Check max responses
        if ($campaign->responses_count >= $campaign->max_responses) {
            throw new \Exception('Maximum responses reached for this campaign.');
        }

        // Check one response per user
        $existing = FeedbackCampaignResponse::where('campaign_id', $campaign->id)
            ->where('supporter_id', $userId)
            ->exists();

        if ($existing) {
            throw new \Exception('You have already submitted a response to this campaign.');
        }

        return DB::transaction(function () use ($campaign, $userId, $answers) {
            // Create response
            $response = FeedbackCampaignResponse::create([
                'supporter_id' => $userId,
                'campaign_id' => $campaign->id,
                'reward_brp' => $campaign->reward_per_response_brp,
                'status' => 'completed',
            ]);

            // Save answers
            foreach ($answers as $answer) {
                FeedbackCampaignResponseAnswer::create([
                    'response_id' => $response->id,
                    'question_id' => $answer['question_id'],
                    'answer_text' => $answer['answer_text'],
                    'option_id' => $answer['option_id'] ?? null,
                ]);
            }

            // Payout BRP
            $this->walletService->payoutBrp(
                $campaign->merchant_id,
                $userId,
                $campaign->reward_per_response_brp,
                $campaign->id
            );

            // Update campaign counters
            $campaign->increment('responses_count');
            $campaign->increment('spent_budget_brp', $campaign->reward_per_response_brp);
            $campaign->decrement('remaining_budget_brp', $campaign->reward_per_response_brp);

            // Auto-end if budget exhausted or max responses reached
            $campaign->refresh();
            if ($campaign->remaining_budget_brp < $campaign->reward_per_response_brp
                || $campaign->responses_count >= $campaign->max_responses) {
                $this->endCampaign($campaign);
            }

            Log::info("Response submitted: campaign={$campaign->id}, user={$userId}");

            return $response->load('answers');
        });
    }

    /**
     * Get campaign insights (answer breakdowns).
     */
    public function getCampaignInsights(FeedbackCampaign $campaign): array
    {
        $questions = $campaign->questions()->with('options')->get();
        $insights = [];

        foreach ($questions as $question) {
            $totalAnswers = $question->answers()->count();

            if ($totalAnswers === 0) {
                $insights[] = [
                    'question' => $question->question_text,
                    'type' => $question->question_type,
                    'total' => 0,
                    'breakdown' => [],
                ];
                continue;
            }

            $breakdown = [];

            if (in_array($question->question_type, ['yes_no', 'true_false'])) {
                $groups = $question->answers()
                    ->selectRaw('answer_text, COUNT(*) as count')
                    ->groupBy('answer_text')
                    ->pluck('count', 'answer_text')
                    ->toArray();

                foreach ($groups as $answer => $count) {
                    $breakdown[] = [
                        'label' => $answer,
                        'count' => $count,
                        'percentage' => round(($count / $totalAnswers) * 100, 1),
                    ];
                }
            } elseif ($question->question_type === 'multiple_choice') {
                foreach ($question->options as $option) {
                    $count = $question->answers()->where('option_id', $option->id)->count();
                    $breakdown[] = [
                        'label' => $option->option_text,
                        'count' => $count,
                        'percentage' => round(($count / $totalAnswers) * 100, 1),
                    ];
                }
            }

            $insights[] = [
                'question' => $question->question_text,
                'type' => $question->question_type,
                'total' => $totalAnswers,
                'breakdown' => $breakdown,
            ];
        }

        return $insights;
    }

    // ─── Organisation-specific campaign methods ───────────────────────────────

    /**
     * Create a feedback campaign for an organisation.
     */
    public function createCampaignForOrg(int $orgId, array $data): FeedbackCampaign
    {
        return DB::transaction(function () use ($orgId, $data) {
            $rewardPerResponse = (int) $data['reward_per_response_brp'];
            $totalBudget = (int) $data['total_budget_brp'];
            $maxResponses = $rewardPerResponse > 0 ? intdiv($totalBudget, $rewardPerResponse) : 0;

            $campaign = FeedbackCampaign::create([
                'organization_id' => $orgId,
                'title' => $data['title'],
                'type' => $data['type'],
                'reward_per_response_brp' => $rewardPerResponse,
                'total_budget_brp' => $totalBudget,
                'remaining_budget_brp' => $totalBudget,
                'max_responses' => $maxResponses,
                'status' => 'draft',
            ]);

            if (!empty($data['question_text'])) {
                $question = FeedbackCampaignQuestion::create([
                    'campaign_id' => $campaign->id,
                    'question_text' => $data['question_text'],
                    'question_type' => $data['question_type'],
                    'sort_order' => 0,
                ]);

                if ($data['question_type'] === 'multiple_choice' && !empty($data['options'])) {
                    foreach ($data['options'] as $index => $optionText) {
                        if (!empty(trim($optionText))) {
                            FeedbackCampaignQuestionOption::create([
                                'question_id' => $question->id,
                                'option_text' => trim($optionText),
                                'sort_order' => $index,
                            ]);
                        }
                    }
                }
            }

            Log::info("Campaign created (org): id={$campaign->id}, org={$orgId}");

            return $campaign->load('questions.options');
        });
    }

    /**
     * Launch a campaign owned by an organisation.
     */
    public function launchCampaignForOrg(FeedbackCampaign $campaign): FeedbackCampaign
    {
        if ($campaign->status !== 'draft') {
            throw new \Exception('Only draft campaigns can be launched.');
        }

        if ($campaign->questions()->count() === 0) {
            throw new \Exception('Campaign must have at least one question.');
        }

        return DB::transaction(function () use ($campaign) {
            $this->walletService->reserveBrpForOrg(
                $campaign->organization_id,
                $campaign->total_budget_brp,
                'feedback_campaign',
                $campaign->id
            );

            $campaign->update([
                'status' => 'active',
                'reserved_budget_brp' => $campaign->total_budget_brp,
                'remaining_budget_brp' => $campaign->total_budget_brp,
            ]);

            Log::info("Campaign launched (org): id={$campaign->id}");

            return $campaign->fresh();
        });
    }

    /**
     * End a campaign owned by an organisation: release unused BRP, set completed.
     */
    public function endCampaignForOrg(FeedbackCampaign $campaign): FeedbackCampaign
    {
        if (!in_array($campaign->status, ['active', 'paused'])) {
            throw new \Exception('Only active or paused campaigns can be ended.');
        }

        return DB::transaction(function () use ($campaign) {
            $unusedBrp = $campaign->remaining_budget_brp;

            if ($unusedBrp > 0) {
                $this->walletService->releaseBrpForOrg(
                    $campaign->organization_id,
                    $unusedBrp,
                    $campaign->id
                );
            }

            $campaign->update([
                'status' => 'completed',
                'reserved_budget_brp' => 0,
                'remaining_budget_brp' => 0,
            ]);

            Log::info("Campaign ended (org): id={$campaign->id}, released={$unusedBrp} BRP");

            return $campaign->fresh();
        });
    }

    /**
     * Submit a response for an organisation-owned campaign.
     */
    public function submitResponseForOrg(FeedbackCampaign $campaign, int $userId, array $answers): FeedbackCampaignResponse
    {
        if ($campaign->status !== 'active') {
            throw new \Exception('This campaign is not currently active.');
        }

        if ($campaign->remaining_budget_brp < $campaign->reward_per_response_brp) {
            throw new \Exception('Campaign budget exhausted.');
        }

        if ($campaign->responses_count >= $campaign->max_responses) {
            throw new \Exception('Maximum responses reached for this campaign.');
        }

        $existing = FeedbackCampaignResponse::where('campaign_id', $campaign->id)
            ->where('supporter_id', $userId)
            ->exists();

        if ($existing) {
            throw new \Exception('You have already submitted a response to this campaign.');
        }

        return DB::transaction(function () use ($campaign, $userId, $answers) {
            $response = FeedbackCampaignResponse::create([
                'supporter_id' => $userId,
                'campaign_id' => $campaign->id,
                'reward_brp' => $campaign->reward_per_response_brp,
                'status' => 'completed',
            ]);

            foreach ($answers as $answer) {
                FeedbackCampaignResponseAnswer::create([
                    'response_id' => $response->id,
                    'question_id' => $answer['question_id'],
                    'answer_text' => $answer['answer_text'],
                    'option_id' => $answer['option_id'] ?? null,
                ]);
            }

            $this->walletService->payoutBrpFromOrg(
                $campaign->organization_id,
                $userId,
                $campaign->reward_per_response_brp,
                $campaign->id
            );

            $campaign->increment('responses_count');
            $campaign->increment('spent_budget_brp', $campaign->reward_per_response_brp);
            $campaign->decrement('remaining_budget_brp', $campaign->reward_per_response_brp);

            $campaign->refresh();
            if ($campaign->remaining_budget_brp < $campaign->reward_per_response_brp
                || $campaign->responses_count >= $campaign->max_responses) {
                $this->endCampaignForOrg($campaign);
            }

            Log::info("Response submitted (org): campaign={$campaign->id}, user={$userId}");

            return $response->load('answers');
        });
    }
}

