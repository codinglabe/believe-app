<?php

namespace App\Http\Controllers;

use App\Models\FundMeCampaign;
use App\Models\FundMeCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FundMeController extends Controller
{
    /**
     * Public listing of live Believe FundMe campaigns.
     */
    public function index(Request $request): Response
    {
        $categoryId = $request->get('category');
        $sort = $request->get('sort', 'newest');
        $perPage = (int) $request->get('per_page', 12);

        $query = FundMeCampaign::live()
            ->with(['organization:id,name,registered_user_image', 'category:id,name,slug']);

        if ($categoryId) {
            $query->where('fundme_category_id', $categoryId);
        }

        if ($sort === 'goal_percent') {
            $query->orderByRaw('(raised_amount * 100.0 / NULLIF(goal_amount, 0)) DESC');
        } elseif ($sort === 'raised') {
            $query->orderByDesc('raised_amount');
        } else {
            $query->orderByDesc('created_at');
        }

        $campaigns = $query->paginate($perPage, ['*'], 'page', $request->get('page', 1))
            ->withQueryString();

        $campaigns->getCollection()->transform(function (FundMeCampaign $c) {
            return [
                'id' => $c->id,
                'title' => $c->title,
                'slug' => $c->slug,
                'goal_amount' => $c->goal_amount,
                'raised_amount' => $c->raised_amount,
                'goal_amount_dollars' => $c->goalAmountDollars(),
                'raised_amount_dollars' => $c->raisedAmountDollars(),
                'progress_percent' => $c->progressPercent(),
                'cover_image' => $c->cover_image ? asset('storage/' . $c->cover_image) : null,
                'organization' => $c->organization ? [
                    'id' => $c->organization->id,
                    'name' => $c->organization->name,
                    'image' => $c->organization->registered_user_image
                        ? asset('storage/' . $c->organization->registered_user_image)
                        : null,
                ] : null,
                'category' => $c->category ? ['id' => $c->category->id, 'name' => $c->category->name, 'slug' => $c->category->slug] : null,
                'created_at' => $c->created_at->toIso8601String(),
            ];
        });

        $categories = FundMeCategory::active()->orderBy('sort_order')->get(['id', 'name', 'slug']);

        return Inertia::render('frontend/fundme/Index', [
            'campaigns' => $campaigns,
            'categories' => $categories,
            'filters' => [
                'category' => $categoryId,
                'sort' => $sort,
                'per_page' => $perPage,
            ],
            'sortOptions' => [
                'newest' => 'Newest',
                'goal_percent' => 'Closest to goal',
                'raised' => 'Most raised',
            ],
        ]);
    }

    /**
     * Public campaign detail page by slug.
     */
    public function show(Request $request, string $slug): Response|\Illuminate\Http\RedirectResponse
    {
        $campaign = FundMeCampaign::live()
            ->with(['organization:id,name,registered_user_image,description,mission', 'category:id,name,slug'])
            ->where('slug', $slug)
            ->first();

        if (!$campaign) {
            abort(404, 'Campaign not found.');
        }

        $payload = [
            'id' => $campaign->id,
            'title' => $campaign->title,
            'slug' => $campaign->slug,
            'goal_amount' => $campaign->goal_amount,
            'raised_amount' => $campaign->raised_amount,
            'goal_amount_dollars' => $campaign->goalAmountDollars(),
            'raised_amount_dollars' => $campaign->raisedAmountDollars(),
            'progress_percent' => $campaign->progressPercent(),
            'cover_image' => $campaign->cover_image ? asset('storage/' . $campaign->cover_image) : null,
            'helps_who' => $campaign->helps_who,
            'fund_usage' => $campaign->fund_usage,
            'expected_impact' => $campaign->expected_impact,
            'organization' => $campaign->organization ? [
                'id' => $campaign->organization->id,
                'name' => $campaign->organization->name,
                'description' => $campaign->organization->description,
                'mission' => $campaign->organization->mission,
                'image' => $campaign->organization->registered_user_image
                    ? asset('storage/' . $campaign->organization->registered_user_image)
                    : null,
            ] : null,
            'category' => $campaign->category ? ['id' => $campaign->category->id, 'name' => $campaign->category->name, 'slug' => $campaign->category->slug] : null,
        ];

        return Inertia::render('frontend/fundme/Show', [
            'campaign' => $payload,
        ]);
    }
}
