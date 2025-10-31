<?php

namespace App\Http\Controllers;

use App\Models\Campaign;
use App\Models\ContentItem;
use App\Models\User;
use App\Services\AIContentGenerator;
use App\Services\CampaignPlanner;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;

class CampaignController extends Controller
{
    public function __construct()
    {
        $this->authorizeResource(Campaign::class, 'campaign');
    }

    public function index()
    {
        $organizationId = auth()->user()->organization->id;

        $campaigns = Campaign::with(['user', 'selectedUsers'])
            ->withCount('scheduledDrops')
            ->forOrganization($organizationId)
            ->latest()
            ->paginate(10);

        return Inertia::render('Campaigns/Index', [
            'campaigns' => $campaigns
        ]);
    }

    public function create()
    {
        $organizationId = auth()->user()->organization->id;

        $contentItems = ContentItem::forOrganization($organizationId)
            ->approved()
            // ->prayers()
            ->get();

        $users = User::where('login_status', true)
            ->select('id', 'name', 'email', 'contact_number', 'whatsapp_opt_in', 'push_token')
            ->orderBy('name')
            ->get();

        return Inertia::render('Campaigns/Create', [
            'contentItems' => $contentItems,
            'defaultChannels' => ['web'],
            'users' => $users,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'start_date' => 'required|date|after_or_equal:today',
            'end_date' => 'required|date|after:start_date',
            'send_time_local' => 'required|date_format:H:i',
            'channels' => 'required|array|min:1',
            'channels.*' => 'in:push,whatsapp,web',
            'content_items' => 'required|array|min:1',
            'content_items.*' => 'exists:content_items,id',
            'user_ids' => 'required|array|min:1',
            'user_ids.*' => 'exists:users,id',
        ]);

        $campaign = Campaign::create([
            'organization_id' => auth()->user()->organization->id,
            'user_id' => auth()->id(),
            'name' => $validated['name'],
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'send_time_local' => $validated['send_time_local'],
            'channels' => $validated['channels'],
        ]);

        $campaign->selectedUsers()->attach($validated['user_ids']);

        $contentItems = ContentItem::whereIn('id', $validated['content_items'])->get();

        $scheduledCount = CampaignPlanner::planDailyCampaign($campaign, $contentItems);

        return redirect()->route('campaigns.show', $campaign)
            ->with('success', "Campaign created successfully! Scheduled {$scheduledCount} daily prayers for {$campaign->selectedUsers()->count()} users.");
    }

    public function show(Campaign $campaign)
    {
        $campaign->load([
            'scheduledDrops.contentItem',
            'scheduledDrops.sendJobs.user',
            'user',
            'selectedUsers'
        ]);

        $stats = [
            'total_drops' => $campaign->scheduledDrops->count(),
            'sent_drops' => $campaign->scheduledDrops->where('status', 'expanded')->count(),
            'pending_drops' => $campaign->scheduledDrops->where('status', 'pending')->count(),
            'total_sends' => $campaign->scheduledDrops->sum(function ($drop) {
                return $drop->sendJobs->count();
            }),
            'successful_sends' => $campaign->scheduledDrops->sum(function ($drop) {
                return $drop->sendJobs->where('status', 'sent')->count();
            }),
            'selected_users_count' => $campaign->selectedUsers->count(),
        ];

        return Inertia::render('Campaigns/Show', [
            'campaign' => $campaign,
            'stats' => $stats
        ]);
    }

    public function destroy(Campaign $campaign)
    {
        $campaign->scheduledDrops()
            ->where('status', 'pending')
            ->update(['status' => 'cancelled']);

        $campaign->update(['status' => 'cancelled']);
        $campaign->delete();

        return redirect()->route('campaigns.index')
            ->with('success', 'Campaign cancelled and deleted successfully!');
    }
}
