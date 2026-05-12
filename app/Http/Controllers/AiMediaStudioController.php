<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessAiVideoGenerationJob;
use App\Models\AiVideo;
use App\Models\Organization;
use App\Models\User;
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
            'ai_media_studio_credits' => (int) ($user->ai_media_studio_credits ?? 0),
            'media_studio_credit_cost' => (int) config('services.ai_media_studio.credits_per_generation', 1),
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

        return Inertia::render('AiMediaStudio/Create', [
            'templates' => self::videoTemplates(),
            'favoriteOrganizations' => $favoriteOrganizations,
            'context' => $org ? 'organization' : 'supporter',
            'ai_media_studio_credits' => (int) ($user->ai_media_studio_credits ?? 0),
            'media_studio_credit_cost' => (int) config('services.ai_media_studio.credits_per_generation', 1),
            'media_studio_packs' => config('services.ai_media_studio.supporter_packs', []),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $templateKeys = collect(self::videoTemplates())->pluck('key')->all();

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'prompt' => ['nullable', 'string', 'max:8000'],
            'template_key' => ['nullable', 'string', Rule::in($templateKeys)],
            'orientation' => ['nullable', 'string', Rule::in(['9:16', '16:9'])],
            'duration_seconds' => ['nullable', 'integer', 'min:5', 'max:120'],
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
        $resolution = $orientation === '9:16' ? '1080x1920' : '1920x1080';

        $cost = (int) config('services.ai_media_studio.credits_per_generation', 1);
        $cost = max(1, $cost);

        $video = null;

        DB::transaction(function () use ($user, $validated, $organizationId, $orientation, $resolution, $cost, &$video) {
            $locked = User::query()->whereKey($user->id)->lockForUpdate()->first();
            if (! $locked) {
                throw ValidationException::withMessages(['title' => 'Account not found.']);
            }

            if ((int) ($locked->ai_media_studio_credits ?? 0) < $cost) {
                throw ValidationException::withMessages([
                    'title' => "You need {$cost} AI Media Studio credit(s) to generate a video. Organizations receive credits with their subscription; supporters can buy credit packs from Credits / purchase.",
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
                'duration_seconds' => $validated['duration_seconds'] ?? 10,
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
                'duration_seconds' => $aiVideo->duration_seconds,
                'resolution' => $aiVideo->resolution,
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
