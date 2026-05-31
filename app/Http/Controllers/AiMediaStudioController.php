<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessAiVideoGenerationJob;
use App\Models\AiVideo;
use App\Models\Organization;
use App\Models\User;
use App\Services\AiMediaStudioBalanceService;
use App\Services\AiMediaStudioDropboxService;
use App\Services\AiMediaStudioVideoWatermarkService;
use App\Support\AiMediaStudioCreditPricing;
use App\Support\AiMediaStudioResolution;
use App\Support\AiMediaStudioTemplates;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

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
        $balanceService = app(AiMediaStudioBalanceService::class);

        $perPage = (int) $request->query('per_page', 10);
        if (! in_array($perPage, [10, 20, 50], true)) {
            $perPage = 10;
        }

        $statusFilter = (string) $request->query('status', 'all');
        $allowedFilters = ['all', 'in_progress', 'ready', 'failed', 'refunded'];
        if (! in_array($statusFilter, $allowedFilters, true)) {
            $statusFilter = 'all';
        }

        $query = $balanceService->videosQuery($user)->latest();
        $this->applyStatusFilter($query, $statusFilter);

        $videos = $query
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (AiVideo $v) => [
                'id' => $v->id,
                'title' => $v->title,
                'status' => $v->status,
                'orientation' => $v->orientation,
                'resolution' => $v->resolution,
                'template_key' => $v->template_key,
                'duration_seconds' => $v->duration_seconds,
                'preview_url' => $this->videoPreviewUrl($v),
                'cost_display' => $balanceService->costDisplayForVideo($v),
                'created_at' => $v->created_at->toIso8601String(),
            ]);

        return Inertia::render('AiMediaStudio/Index', [
            'videos' => $videos,
            'filters' => [
                'status' => $statusFilter,
                'per_page' => $perPage,
            ],
            'balance' => $balanceService->summaryForUser($user),
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
                    'title' => 'You need '.$need.' AI Video Studio credits for this video (1 credit = US$1.00). Organizations receive credits with their subscription; supporters can buy credit packs from Credits / purchase.',
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

        $watermark = app(AiMediaStudioVideoWatermarkService::class);
        $logoBurnedIn = $watermark->hasBrandedFile($aiVideo);

        return Inertia::render('AiMediaStudio/Show', [
            'context' => Organization::forAuthUser($request->user()) ? 'organization' : 'supporter',
            'logo_burned_in' => $logoBurnedIn,
            'watermark_can_apply' => $watermark->canApplyWatermark(),
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

    public function download(Request $request, AiVideo $aiVideo): RedirectResponse|BinaryFileResponse
    {
        $this->authorizeView($request->user(), $aiVideo);
        $aiVideo->refresh();

        $watermark = app(AiMediaStudioVideoWatermarkService::class);
        if ($watermark->hasBrandedFile($aiVideo)) {
            $relative = $watermark->storageRelativePath($aiVideo);
            $filename = str($aiVideo->title)->slug()->append('.mp4')->toString();
            if ($filename === '.mp4') {
                $filename = 'ai-video-'.$aiVideo->id.'.mp4';
            }

            return Storage::disk('public')->download($relative, $filename, [
                'Content-Type' => 'video/mp4',
            ]);
        }

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

    /**
     * Re-run FFmpeg logo burn for an existing video (e.g. after installing FFmpeg on the server).
     */
    public function applyWatermark(Request $request, AiVideo $aiVideo): RedirectResponse
    {
        $this->authorizeView($request->user(), $aiVideo);
        $aiVideo->refresh();

        $watermark = app(AiMediaStudioVideoWatermarkService::class);
        if (! $watermark->canApplyWatermark()) {
            return redirect()
                ->route('ai-media-studio.show', $aiVideo)
                ->with('error', 'Logo burn requires FFmpeg on the server. Ask your host to install ffmpeg, then try again.');
        }

        $sourceUrl = is_string($aiVideo->fal_cdn_url) && str_starts_with($aiVideo->fal_cdn_url, 'http')
            ? $aiVideo->fal_cdn_url
            : null;
        if ($sourceUrl === null && is_string($aiVideo->video_source_url) && str_starts_with($aiVideo->video_source_url, 'http')) {
            $sourceUrl = $aiVideo->video_source_url;
        }

        if ($sourceUrl === null) {
            return redirect()
                ->route('ai-media-studio.show', $aiVideo)
                ->with('error', 'No source video URL is available to apply the logo.');
        }

        try {
            $branded = $watermark->downloadAndBrand($aiVideo, $sourceUrl);
        } catch (\Throwable $e) {
            return redirect()
                ->route('ai-media-studio.show', $aiVideo)
                ->with('error', 'Could not apply logo: '.$e->getMessage());
        }

        if (! is_array($branded)) {
            return redirect()
                ->route('ai-media-studio.show', $aiVideo)
                ->with('error', 'Logo burn failed. Check storage/logs for ai_media_studio.watermark_* entries.');
        }

        $aiVideo->update(['video_source_url' => $branded['public_url'] ?? $aiVideo->video_source_url]);

        return redirect()
            ->route('ai-media-studio.show', $aiVideo)
            ->with('success', 'Believe In Unity logo applied. Preview and download now use the branded file.');
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder<AiVideo>  $query
     */
    private function applyStatusFilter(\Illuminate\Database\Eloquent\Builder $query, string $statusFilter): void
    {
        match ($statusFilter) {
            'in_progress' => $query->whereNotIn('status', [
                AiVideo::STATUS_READY_FOR_REVIEW,
                AiVideo::STATUS_APPROVED,
                AiVideo::STATUS_PUBLISHED,
                AiVideo::STATUS_FAILED,
            ]),
            'ready' => $query->whereIn('status', [
                AiVideo::STATUS_READY_FOR_REVIEW,
                AiVideo::STATUS_APPROVED,
                AiVideo::STATUS_PUBLISHED,
            ]),
            'failed' => $query->where('status', AiVideo::STATUS_FAILED)
                ->whereNull('media_studio_credits_refunded_at'),
            'refunded' => $query->where('status', AiVideo::STATUS_FAILED)
                ->whereNotNull('media_studio_credits_refunded_at'),
            default => null,
        };
    }

    private function videoPreviewUrl(AiVideo $video): ?string
    {
        if (is_string($video->fal_cdn_url) && str_starts_with($video->fal_cdn_url, 'http')) {
            return $video->fal_cdn_url;
        }

        if (is_string($video->video_source_url) && str_starts_with($video->video_source_url, 'http')) {
            return $video->video_source_url;
        }

        return null;
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
