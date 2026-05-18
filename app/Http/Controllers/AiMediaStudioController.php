<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessAiVideoGenerationJob;
use App\Models\AiVideo;
use App\Models\Organization;
use App\Models\User;
use App\Services\AiMediaStudioDropboxService;
use App\Support\AiMediaStudioCreditPricing;
use App\Support\AiMediaStudioResolution;
use App\Support\AiMediaStudioTemplates;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AiMediaStudioController extends Controller
{
    /**
     * @return list<array{key: string, label: string}>
     */
    public static function videoTemplates(): array
    {
        return AiMediaStudioTemplates::all();
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        $videos = $this->videosForUser($user)
            ->latest()
            ->paginate(20)
            ->through(fn (AiVideo $v) => [
                'id' => $v->id,
                'title' => $v->title,
                'status' => $v->status,
                'orientation' => $v->orientation,
                'resolution' => $v->resolution,
                'template_key' => $v->template_key,
                'created_at' => $v->created_at->toIso8601String(),
            ]);

        return Inertia::render('AiMediaStudio/Index', [
            'videos' => $videos,
            'context' => Organization::forAuthUser($user) ? 'organization' : 'supporter',
            'ai_media_studio_credits' => round((float) ($user->ai_media_studio_credits ?? 0), 2),
            'media_studio_retail_prices' => AiMediaStudioCreditPricing::retailMatrixForFrontend(),
        ]);
    }

    public function create(Request $request): Response
    {
        $user = $request->user();
        $org = Organization::forAuthUser($user);
        $favoriteOrganizations = [];
        if ($user->role === 'user' || $user->hasRole('user')) {
            $favoriteOrganizations = $user->favoriteOrganizations()
                ->select('organizations.id', 'organizations.name')
                ->orderBy('organizations.name')
                ->limit(100)
                ->get()
                ->map(fn (Organization $o) => ['id' => $o->id, 'name' => $o->name])
                ->all();
        }

        $resolutionTiers = AiMediaStudioResolution::allowedTiers();
        $defaultTier = AiMediaStudioResolution::defaultTier();
        $pixelMatrix = AiMediaStudioResolution::pixelMatrixForTiers($resolutionTiers);

        return Inertia::render('AiMediaStudio/Create', [
            'templates' => self::videoTemplates(),
            'favoriteOrganizations' => $favoriteOrganizations,
            'context' => $org ? 'organization' : 'supporter',
            'ai_media_studio_credits' => round((float) ($user->ai_media_studio_credits ?? 0), 2),
            'media_studio_retail_prices' => AiMediaStudioCreditPricing::retailMatrixForFrontend(),
            'media_studio_packs' => config('services.ai_media_studio.supporter_packs', []),
            'video_duration_min' => (int) config('services.ai_media_studio.video_duration_min', 5),
            'video_duration_max' => (int) config('services.ai_media_studio.video_duration_max', 10),
            'video_resolution_tiers' => $resolutionTiers,
            'default_video_resolution_tier' => $defaultTier,
            'video_resolution_pixel_matrix' => $pixelMatrix,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $templateKeys = collect(self::videoTemplates())->pluck('key')->all();

        $resolutionTiers = AiMediaStudioResolution::allowedTiers();

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'prompt' => ['nullable', 'string', 'max:8000'],
            'template_key' => ['nullable', 'string', Rule::in($templateKeys)],
            'orientation' => ['nullable', 'string', Rule::in(['9:16', '16:9'])],
            'resolution_tier' => ['nullable', 'string', Rule::in($resolutionTiers)],
            'duration_seconds' => ['nullable', 'integer', Rule::in([5, 10])],
            'organization_id' => ['nullable', 'integer', 'exists:organizations,id'],
            'template_inputs' => ['nullable', 'array'],
            'template_inputs.title' => ['nullable', 'string', 'max:500'],
            'template_inputs.cause' => ['nullable', 'string', 'max:2000'],
            'template_inputs.mood' => ['nullable', 'string', 'max:255'],
            'template_inputs.audience' => ['nullable', 'string', 'max:2000'],
            'template_inputs.call_to_action' => ['nullable', 'string', 'max:500'],
        ]);

        $organizationId = null;
        $ownedOrg = Organization::forAuthUser($user);
        if ($ownedOrg) {
            $organizationId = $ownedOrg->id;
        } elseif (! empty($validated['organization_id'])) {
            $oid = (int) $validated['organization_id'];
            $allowed = $user->favoriteOrganizations()->where('organizations.id', $oid)->exists();
            if (! $allowed) {
                abort(422, 'You can only attach a followed organization to this video.');
            }
            $organizationId = $oid;
        }

        $orientation = $validated['orientation'] ?? '9:16';
        $tier = $validated['resolution_tier'] ?? AiMediaStudioResolution::defaultTier();
        if (! in_array($tier, $resolutionTiers, true)) {
            $tier = AiMediaStudioResolution::defaultTier();
        }
        $resolution = AiMediaStudioResolution::pixels($orientation, $tier);

        $durationSeconds = (int) ($validated['duration_seconds'] ?? 5);
        if (! in_array($durationSeconds, [5, 10], true)) {
            $durationSeconds = 5;
        }

        $cost = AiMediaStudioCreditPricing::retailCredits($tier, $durationSeconds);

        $video = null;

        DB::transaction(function () use ($user, $validated, $organizationId, $orientation, $resolution, $tier, $durationSeconds, $cost, &$video) {
            $locked = User::query()->whereKey($user->id)->lockForUpdate()->first();
            if (! $locked) {
                throw ValidationException::withMessages(['title' => 'Account not found.']);
            }

            $balance = round((float) ($locked->ai_media_studio_credits ?? 0), 2);
            if ($balance < round($cost, 2)) {
                $need = number_format($cost, 2);
                throw ValidationException::withMessages([
                    'title' => 'You need '.$need.' AI Media Studio credits for this video (1 credit = US$1.00). Organizations receive credits with their subscription; supporters can buy credit packs from Credits / purchase.',
                ]);
            }

            $locked->decrement('ai_media_studio_credits', $cost);

            $video = AiVideo::create([
                'organization_id' => $organizationId,
                'user_id' => $user->id,
                'title' => $validated['title'],
                'prompt' => $validated['prompt'] ?? null,
                'template_key' => $validated['template_key'] ?? null,
                'template_inputs' => $validated['template_inputs'] ?? null,
                'orientation' => $orientation,
                'resolution' => $resolution,
                'resolution_tier' => $tier,
                'duration_seconds' => $durationSeconds,
                'status' => AiVideo::STATUS_PENDING_PROMPT,
                'media_studio_credits_charged' => $cost,
            ]);
        });

        if (! $video instanceof AiVideo) {
            throw new \RuntimeException('Failed to create AI video record.');
        }

        ProcessAiVideoGenerationJob::dispatch($video->id);

        return redirect()->route('ai-media-studio.show', $video)
            ->with('success', 'Your video is queued for generation. This page will update as the pipeline runs.');
    }

    public function show(Request $request, AiVideo $aiVideo): Response
    {
        $this->authorizeView($request->user(), $aiVideo);
        $aiVideo->loadMissing(['organization:id,name', 'user:id,name']);

        return Inertia::render('AiMediaStudio/Show', [
            'context' => Organization::forAuthUser($request->user()) ? 'organization' : 'supporter',
            'video' => [
                'id' => $aiVideo->id,
                'title' => $aiVideo->title,
                'status' => $aiVideo->status,
                'prompt' => $aiVideo->prompt,
                'fal_prompt' => $aiVideo->fal_prompt,
                'ai_script' => $aiVideo->ai_script,
                'caption' => $aiVideo->caption,
                'hashtags' => $aiVideo->hashtags,
                'template_key' => $aiVideo->template_key,
                'template_inputs' => $aiVideo->template_inputs,
                'fal_provider' => $aiVideo->fal_provider,
                'fal_model' => $aiVideo->fal_model,
                'fal_job_id' => $aiVideo->fal_job_id,
                'video_source_url' => $aiVideo->video_source_url,
                'fal_cdn_url' => $aiVideo->fal_cdn_url,
                'duration_seconds' => $aiVideo->duration_seconds,
                'resolution' => $aiVideo->resolution,
                'resolution_tier' => $aiVideo->resolution_tier,
                'orientation' => $aiVideo->orientation,
                'dropbox_path' => $aiVideo->dropbox_path,
                'dropbox_shared_link' => $aiVideo->dropbox_shared_link,
                'youtube_video_id' => $aiVideo->youtube_video_id,
                'instagram_post_id' => $aiVideo->instagram_post_id,
                'tiktok_post_id' => $aiVideo->tiktok_post_id,
                'generation_cost' => $aiVideo->generation_cost,
                'approved_at' => $aiVideo->approved_at?->toIso8601String(),
                'published_at' => $aiVideo->published_at?->toIso8601String(),
                'failure_message' => $aiVideo->failure_message,
                'created_at' => $aiVideo->created_at->toIso8601String(),
                'updated_at' => $aiVideo->updated_at->toIso8601String(),
                'organization' => $aiVideo->organization ? [
                    'id' => $aiVideo->organization->id,
                    'name' => $aiVideo->organization->name,
                ] : null,
                'creator_name' => $aiVideo->user?->name,
            ],
        ]);
    }

    public function download(Request $request, AiVideo $aiVideo): RedirectResponse
    {
        $this->authorizeView($request->user(), $aiVideo);
        $aiVideo->refresh();

        $tmp = app(AiMediaStudioDropboxService::class)->temporaryDownloadUrl($aiVideo);
        if (is_string($tmp) && $tmp !== '') {
            return redirect()->away($tmp);
        }

        $falCdn = $aiVideo->fal_cdn_url;
        if (is_string($falCdn) && str_starts_with($falCdn, 'http')) {
            return redirect()->away($falCdn);
        }

        if (is_string($aiVideo->video_source_url) && str_starts_with($aiVideo->video_source_url, 'http')) {
            return redirect()->away($aiVideo->video_source_url);
        }

        abort(404, 'Video file is not available yet.');
    }

    private function videosForUser(User $user): \Illuminate\Database\Eloquent\Builder
    {
        $org = Organization::forAuthUser($user);
        if ($org) {
            return AiVideo::query()->where('organization_id', $org->id);
        }

        return AiVideo::query()->where('user_id', $user->id);
    }

    private function authorizeView(User $user, AiVideo $video): void
    {
        if ((int) $video->user_id === (int) $user->id) {
            return;
        }

        $org = Organization::forAuthUser($user);
        if ($org && (int) $video->organization_id === (int) $org->id) {
            return;
        }

        abort(403);
    }
}
