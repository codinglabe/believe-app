<?php

namespace App\Http\Controllers;

use App\Models\Campaign;
use App\Models\ContentItem;
use App\Models\User;
use App\Services\CampaignPlanner;
use App\Services\OpenAiService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class AiCampaignController extends Controller
{
    protected $openAiService;

    public function __construct(OpenAiService $openAiService)
    {
        $this->openAiService = $openAiService;
    }

    public function create()
    {
        $organizationId = auth()->user()->organization->id;

        $users = User::where('login_status', true)
            ->select('id', 'name', 'email', 'contact_number', 'whatsapp_opt_in', 'push_token')
            ->orderBy('name')
            ->get();

        return Inertia::render('Campaigns/AiCreate', [
            'defaultChannels' => ['web'],
            'users' => $users,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'start_date' => 'required|date|after_or_equal:today',
            'send_time_local' => 'required|date_format:H:i',
            'channels' => 'required|array|min:1',
            'channels.*' => 'in:push,whatsapp,web',
            'user_ids' => 'required|array|min:1',
            'user_ids.*' => 'exists:users,id',
            'prompt' => 'required|string|min:10|max:1000',
            'content_count' => 'required|integer|min:1|max:30',
            'content_type' => 'required|in:prayer,devotional,scripture',
        ]);

        try {
            Log::info('Starting AI content generation', [
                'count' => $validated['content_count'],
                'type' => $validated['content_type'],
            ]);

            $generatedContent = $this->openAiService->generateContent(
                $validated['prompt'],
                $validated['content_count'],
                $validated['content_type']
            );

            Log::info('Content generated successfully', [
                'count' => count($generatedContent),
            ]);

            $organizationId = auth()->user()->organization->id;
            $contentItemIds = [];

            // Create content items
            foreach ($generatedContent as $content) {
                $contentItem = ContentItem::create([
                    'organization_id' => $organizationId,
                    'user_id' => auth()->id(),
                    'title' => $content['title'],
                    'body' => $content['body'],
                    'type' => $validated['content_type'],
                    'meta' => [
                        'scripture_ref' => $content['scripture_ref'] ?? '',
                        'tags' => $content['tags'] ?? [],
                        'generated_by_ai' => true,
                    ],
                    'is_approved' => true,
                ]);

                $contentItemIds[] = $contentItem->id;
            }

            // Calculate end date based on content count
            $startDate = Carbon::parse($validated['start_date']);
            $endDate = $startDate->copy()->addDays(count($contentItemIds) - 1);

            // Create campaign
            $campaign = Campaign::create([
                'organization_id' => $organizationId,
                'user_id' => auth()->id(),
                'name' => $validated['name'],
                'start_date' => $startDate,
                'end_date' => $endDate,
                'send_time_local' => $validated['send_time_local'],
                'channels' => $validated['channels'],
            ]);

            $campaign->selectedUsers()->attach($validated['user_ids']);

            // Get created content items and plan campaign
            $contentItems = ContentItem::whereIn('id', $contentItemIds)->get();
            $scheduledCount = CampaignPlanner::planDailyCampaign($campaign, $contentItems);

            Log::info('Campaign created successfully', [
                'campaign_id' => $campaign->id,
                'content_count' => count($contentItemIds),
                'scheduled_count' => $scheduledCount,
            ]);

            return redirect()->route('campaigns.show', $campaign)
                ->with('success', "AI Campaign created successfully! Generated " . count($contentItemIds) . " prayers and scheduled {$scheduledCount} daily deliveries for {$campaign->selectedUsers()->count()} users.");
        } catch (\Exception $e) {
            Log::error('AI Campaign creation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return back()
                ->withErrors(['error' => 'Failed to generate content: ' . $e->getMessage()])
                ->withInput();
        }
    }
}
