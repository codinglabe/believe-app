<?php

namespace App\Http\Controllers;

use App\Models\FundMeCampaign;
use App\Models\FundMeCategory;
use App\Models\FundMeDonation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class FundMeCampaignController extends BaseController
{
    /**
     * Min characters for narrative sections (~50 words).
     */
    protected const NARRATIVE_MIN_LENGTH = 300;

    /**
     * Display Believe FundMe campaigns for the organization.
     */
    public function index(Request $request): Response
    {
        $org = $request->user()?->organization;
        if (!$org) {
            abort(403, 'No organization associated with your account.');
        }

        $perPage = (int) $request->get('per_page', 10);
        $status = $request->get('status', '');

        $query = FundMeCampaign::forOrganization($org->id)
            ->with('category:id,name,slug')
            ->orderByDesc('updated_at');

        if ($status && in_array($status, ['draft', 'in_review', 'live', 'rejected', 'frozen'])) {
            $query->where('status', $status);
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
                'status' => $c->status,
                'cover_image' => $c->cover_image ? asset('storage/' . $c->cover_image) : null,
                'category' => $c->category ? ['id' => $c->category->id, 'name' => $c->category->name, 'slug' => $c->category->slug] : null,
                'submitted_at' => $c->submitted_at?->toIso8601String(),
                'approved_at' => $c->approved_at?->toIso8601String(),
                'created_at' => $c->created_at->toIso8601String(),
                'updated_at' => $c->updated_at->toIso8601String(),
            ];
        });

        // Calculate total donations received across all campaigns for this organization
        $totalDonationsCents = FundMeDonation::where('organization_id', $org->id)
            ->where('status', FundMeDonation::STATUS_SUCCEEDED)
            ->sum('amount');
        $totalDonationsDollars = round($totalDonationsCents / 100, 2);

        return Inertia::render('fundme/campaigns/Index', [
            'campaigns' => $campaigns,
            'totalDonations' => [
                'cents' => $totalDonationsCents,
                'dollars' => $totalDonationsDollars,
            ],
            'filters' => [
                'per_page' => $perPage,
                'status' => $status,
            ],
            'statusOptions' => [
                'draft' => 'Draft',
                'in_review' => 'In Review',
                'live' => 'Live',
                'rejected' => 'Rejected',
                'frozen' => 'Frozen',
            ],
        ]);
    }

    /**
     * Show the form for creating a new Believe FundMe campaign.
     */
    public function create(Request $request): Response
    {
        $org = $request->user()?->organization;
        if (!$org) {
            abort(403, 'No organization associated with your account.');
        }

        $categories = FundMeCategory::active()->orderBy('sort_order')->get(['id', 'name', 'slug', 'description']);

        return Inertia::render('fundme/campaigns/Create', [
            'categories' => $categories,
            'narrativeMinLength' => self::NARRATIVE_MIN_LENGTH,
            'narrativeMinWords' => 50,
        ]);
    }

    /**
     * Store a newly created Believe FundMe campaign.
     */
    public function store(Request $request)
    {
        $org = $request->user()?->organization;
        if (!$org) {
            abort(403, 'No organization associated with your account.');
        }

        $rules = [
            'title' => 'required|string|max:120',
            'fundme_category_id' => 'required|exists:fundme_categories,id',
            'goal_amount' => 'required|numeric|min:1',
            'cover_image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'helps_who' => 'required|string|min:' . self::NARRATIVE_MIN_LENGTH,
            'fund_usage' => 'required|string|min:' . self::NARRATIVE_MIN_LENGTH,
            'expected_impact' => 'required|string|min:' . self::NARRATIVE_MIN_LENGTH,
            'use_of_funds_confirmation' => 'required|accepted',
            'status' => 'nullable|in:draft,in_review',
        ];
        $messages = [
            'helps_who.min' => 'Who this helps must be at least ' . self::NARRATIVE_MIN_LENGTH . ' characters.',
            'fund_usage.min' => 'What funds will be used for must be at least ' . self::NARRATIVE_MIN_LENGTH . ' characters.',
            'expected_impact.min' => 'Expected impact must be at least ' . self::NARRATIVE_MIN_LENGTH . ' characters.',
        ];
        $validated = $request->validate($rules, $messages);

        $goalAmount = (int) round((float) $validated['goal_amount'] * 100);
        $coverPath = $request->file('cover_image')->store('fundme-covers', 'public');

        $isPublish = ($validated['status'] ?? '') === 'in_review';

        $campaign = FundMeCampaign::create([
            'organization_id' => $org->id,
            'fundme_category_id' => $validated['fundme_category_id'],
            'title' => $validated['title'],
            'goal_amount' => $goalAmount,
            'cover_image' => $coverPath,
            'helps_who' => $validated['helps_who'],
            'fund_usage' => $validated['fund_usage'],
            'expected_impact' => $validated['expected_impact'],
            'use_of_funds_confirmation' => true,
            'status' => $isPublish ? FundMeCampaign::STATUS_LIVE : FundMeCampaign::STATUS_DRAFT,
        ]);

        if ($isPublish) {
            $campaign->update([
                'submitted_at' => now(),
                'approved_at' => now(),
            ]);
        }

        return redirect()->route('fundme.campaigns.index')
            ->with('success', $isPublish ? 'Campaign is live and visible on Believe FundMe.' : 'Believe FundMe campaign saved as draft.');
    }

    /**
     * Show the form for editing the specified campaign.
     */
    public function edit(Request $request, FundMeCampaign $fundme_campaign): Response
    {
        $org = $request->user()?->organization;
        if (!$org || (int) $fundme_campaign->organization_id !== (int) $org->id) {
            abort(403, 'You cannot edit this campaign.');
        }
        if (!in_array($fundme_campaign->status, ['draft', 'rejected'])) {
            return redirect()->route('fundme.campaigns.index')
                ->with('error', 'Only draft or rejected campaigns can be edited.');
        }

        $fundme_campaign->load('category:id,name,slug,description');
        $categories = FundMeCategory::active()->orderBy('sort_order')->get(['id', 'name', 'slug', 'description']);

        return Inertia::render('fundme/campaigns/Edit', [
            'campaign' => [
                'id' => $fundme_campaign->id,
                'title' => $fundme_campaign->title,
                'slug' => $fundme_campaign->slug,
                'fundme_category_id' => $fundme_campaign->fundme_category_id,
                'goal_amount' => $fundme_campaign->goalAmountDollars(),
                'cover_image' => $fundme_campaign->cover_image ? asset('storage/' . $fundme_campaign->cover_image) : null,
                'cover_image_path' => $fundme_campaign->cover_image,
                'helps_who' => $fundme_campaign->helps_who,
                'fund_usage' => $fundme_campaign->fund_usage,
                'expected_impact' => $fundme_campaign->expected_impact,
                'use_of_funds_confirmation' => $fundme_campaign->use_of_funds_confirmation,
                'status' => $fundme_campaign->status,
                'rejection_reason' => $fundme_campaign->rejection_reason,
            ],
            'categories' => $categories,
            'narrativeMinLength' => self::NARRATIVE_MIN_LENGTH,
            'narrativeMinWords' => 50,
        ]);
    }

    /**
     * Update the specified campaign.
     */
    public function update(Request $request, FundMeCampaign $fundme_campaign)
    {
        $org = $request->user()?->organization;
        if (!$org || (int) $fundme_campaign->organization_id !== (int) $org->id) {
            abort(403, 'You cannot update this campaign.');
        }
        if (!in_array($fundme_campaign->status, ['draft', 'rejected'])) {
            return redirect()->route('fundme.campaigns.index')
                ->with('error', 'Only draft or rejected campaigns can be updated.');
        }

        $coverRules = ['image', 'mimes:jpeg,png,jpg,gif,webp', 'max:5120'];
        if (!$fundme_campaign->cover_image) {
            array_unshift($coverRules, 'required');
        } else {
            array_unshift($coverRules, 'nullable');
        }

        $rules = [
            'title' => 'required|string|max:120',
            'fundme_category_id' => 'required|exists:fundme_categories,id',
            'goal_amount' => 'required|numeric|min:1',
            'cover_image' => $coverRules,
            'helps_who' => 'required|string|min:' . self::NARRATIVE_MIN_LENGTH,
            'fund_usage' => 'required|string|min:' . self::NARRATIVE_MIN_LENGTH,
            'expected_impact' => 'required|string|min:' . self::NARRATIVE_MIN_LENGTH,
            'use_of_funds_confirmation' => 'required|accepted',
            'status' => 'nullable|in:draft,in_review',
        ];
        $messages = [
            'helps_who.min' => 'Who this helps must be at least ' . self::NARRATIVE_MIN_LENGTH . ' characters.',
            'fund_usage.min' => 'What funds will be used for must be at least ' . self::NARRATIVE_MIN_LENGTH . ' characters.',
            'expected_impact.min' => 'Expected impact must be at least ' . self::NARRATIVE_MIN_LENGTH . ' characters.',
        ];
        $validated = $request->validate($rules, $messages);

        $goalAmount = (int) round((float) $validated['goal_amount'] * 100);
        $coverPath = $fundme_campaign->cover_image;
        if ($request->hasFile('cover_image')) {
            if ($coverPath) {
                Storage::disk('public')->delete($coverPath);
            }
            $coverPath = $request->file('cover_image')->store('fundme-covers', 'public');
        }

        $fundme_campaign->update([
            'fundme_category_id' => $validated['fundme_category_id'],
            'title' => $validated['title'],
            'goal_amount' => $goalAmount,
            'cover_image' => $coverPath,
            'helps_who' => $validated['helps_who'],
            'fund_usage' => $validated['fund_usage'],
            'expected_impact' => $validated['expected_impact'],
            'use_of_funds_confirmation' => true,
            'rejection_reason' => null,
        ]);

        $isPublish = ($validated['status'] ?? '') === 'in_review';
        if ($isPublish) {
            $fundme_campaign->update([
                'status' => FundMeCampaign::STATUS_LIVE,
                'submitted_at' => now(),
                'approved_at' => now(),
            ]);
        } else {
            $fundme_campaign->update(['status' => FundMeCampaign::STATUS_DRAFT]);
        }

        return redirect()->route('fundme.campaigns.index')
            ->with('success', 'Campaign updated successfully.');
    }

    /**
     * Submit campaign (draft -> live, auto-approved).
     */
    public function submit(Request $request, FundMeCampaign $fundme_campaign)
    {
        $org = $request->user()?->organization;
        if (!$org || (int) $fundme_campaign->organization_id !== (int) $org->id) {
            abort(403, 'You cannot submit this campaign.');
        }
        if ($fundme_campaign->status !== FundMeCampaign::STATUS_DRAFT) {
            return redirect()->route('fundme.campaigns.index')
                ->with('error', 'Only draft campaigns can be submitted.');
        }
        if (!$fundme_campaign->cover_image) {
            return redirect()->route('fundme.campaigns.index')
                ->with('error', 'Add a cover image before publishing. Edit the campaign and add a cover image.');
        }

        $fundme_campaign->update([
            'status' => FundMeCampaign::STATUS_LIVE,
            'submitted_at' => now(),
            'approved_at' => now(),
        ]);

        return redirect()->route('fundme.campaigns.index')
            ->with('success', 'Campaign is now live on Believe FundMe.');
    }

    /**
     * Remove the specified campaign (only drafts).
     */
    public function destroy(Request $request, FundMeCampaign $fundme_campaign)
    {
        $org = $request->user()?->organization;
        if (!$org || (int) $fundme_campaign->organization_id !== (int) $org->id) {
            abort(403, 'You cannot delete this campaign.');
        }
        if ($fundme_campaign->status !== FundMeCampaign::STATUS_DRAFT) {
            return redirect()->route('fundme.campaigns.index')
                ->with('error', 'Only draft campaigns can be deleted.');
        }

        if ($fundme_campaign->cover_image) {
            Storage::disk('public')->delete($fundme_campaign->cover_image);
        }
        $fundme_campaign->delete();

        return redirect()->route('fundme.campaigns.index')
            ->with('success', 'Campaign deleted.');
    }
}
