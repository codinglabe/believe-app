<?php

namespace App\Http\Controllers;

use App\Models\FeedbackCampaign;
use App\Models\FeedbackCampaignResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class FeedbackCampaignBrowserController extends Controller
{
    /**
     * Browse active feedback campaigns on the main app.
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        $query = FeedbackCampaign::query()
            ->where('status', 'active')
            ->with(['merchant:id,business_name,name'])
            ->withCount('questions');

        if ($request->filled('search')) {
            $search = trim((string) $request->string('search'));
            $query->where(function ($builder) use ($search) {
                $builder->where('title', 'like', "%{$search}%")
                    ->orWhereHas('merchant', function ($merchantQuery) use ($search) {
                        $merchantQuery->where('business_name', 'like', "%{$search}%")
                            ->orWhere('name', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('type') && $request->string('type')->toString() !== 'all') {
            $query->where('type', $request->string('type')->toString());
        }

        $sort = $request->string('sort')->toString() ?: 'newest';
        match ($sort) {
            'reward_high' => $query->orderByDesc('reward_per_response_brp')->orderByDesc('created_at'),
            'reward_low' => $query->orderBy('reward_per_response_brp')->orderByDesc('created_at'),
            'popular' => $query->orderByDesc('responses_count')->orderByDesc('created_at'),
            default => $query->orderByDesc('created_at'),
        };

        $campaigns = $query->paginate(12)->withQueryString();

        $respondedIds = $user
            ? FeedbackCampaign::query()
                ->whereIn('id', $campaigns->getCollection()->pluck('id'))
                ->whereHas('responses', fn ($responseQuery) => $responseQuery->where('supporter_id', $user->id))
                ->pluck('id')
                ->all()
            : [];

        $typeOptions = [
            ['value' => 'all', 'label' => 'All Campaigns'],
            ['value' => 'quick_vote', 'label' => 'Quick Vote'],
            ['value' => 'short_feedback', 'label' => 'Short Feedback'],
            ['value' => 'standard_survey', 'label' => 'Standard Survey'],
            ['value' => 'deep_feedback', 'label' => 'Deep Feedback'],
        ];

        return Inertia::render('frontend/feedback-campaigns/Index', [
            'campaigns' => $campaigns->through(function (FeedbackCampaign $campaign) use ($respondedIds) {
                return [
                    'id' => $campaign->id,
                    'uuid' => $campaign->uuid,
                    'title' => $campaign->title,
                    'type' => $campaign->type,
                    'merchant_name' => $campaign->merchant->business_name ?? $campaign->merchant->name,
                    'reward_per_response_brp' => $campaign->reward_per_response_brp,
                    'reward_dollars' => FeedbackCampaign::brpToDollars($campaign->reward_per_response_brp),
                    'estimated_time' => FeedbackCampaign::estimatedTimeForType($campaign->type),
                    'responses_count' => $campaign->responses_count,
                    'questions_count' => $campaign->questions_count,
                    'already_responded' => in_array($campaign->id, $respondedIds, true),
                    'created_at' => optional($campaign->created_at)?->toISOString(),
                ];
            }),
            'filters' => [
                'search' => $request->string('search')->toString(),
                'type' => $request->string('type')->toString() ?: 'all',
                'sort' => $sort,
            ],
            'typeOptions' => $typeOptions,
            'stats' => [
                'active_campaigns' => FeedbackCampaign::where('status', 'active')->count(),
                'completed_by_user' => $user
                    ? FeedbackCampaignResponse::where('supporter_id', $user->id)->where('status', 'completed')->count()
                    : 0,
            ],
        ]);
    }
}
