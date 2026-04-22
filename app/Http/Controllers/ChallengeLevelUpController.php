<?php

namespace App\Http\Controllers;

use App\Models\ChallengeHubCategory;
use App\Models\ChallengeQuestion;
use App\Models\LevelUpChallengeEntry;
use App\Models\LevelUpQuizSession;
use App\Models\LevelUpTrack;
use App\Models\UserChallengeQuestionEvent;
use App\Services\ChallengeQuestionService;
use App\Support\ChallengePlayQuizMode;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ChallengeLevelUpController extends Controller
{
    public function index(Request $request): Response
    {
        $challengeHubCategories = ChallengeHubCategory::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $allowedFilterKeys = $challengeHubCategories
            ->pluck('filter_key')
            ->map(fn ($k) => strtolower((string) $k))
            ->unique()
            ->values()
            ->all();

        $activeFilter = 'all';
        $activeCategorySlug = null;

        $categorySlug = $request->query('category');
        if (is_string($categorySlug) && $categorySlug !== '') {
            $selected = $challengeHubCategories->firstWhere('slug', $categorySlug);
            if ($selected) {
                $activeFilter = strtolower((string) $selected->filter_key);
                $activeCategorySlug = $selected->slug;
            }
        } else {
            $requestedFilter = strtolower((string) $request->query('filter', 'all'));
            $activeFilter = in_array($requestedFilter, array_merge(['all'], $allowedFilterKeys), true)
                ? $requestedFilter
                : 'all';

            if ($activeFilter !== 'all') {
                $activeCategorySlug = $challengeHubCategories
                    ->first(fn (ChallengeHubCategory $c) => strtolower((string) $c->filter_key) === $activeFilter)
                    ?->slug;
            }
        }

        $levelUpTracks = LevelUpTrack::query()
            ->orderBy('sort_order')
            ->get();

        $trackIds = $levelUpTracks->pluck('id')->all();
        $playersCountByTrackId = $trackIds === []
            ? collect()
            : UserChallengeQuestionEvent::query()
                ->whereIn('level_up_track_id', $trackIds)
                ->where('status', UserChallengeQuestionEvent::STATUS_ANSWERED)
                ->selectRaw('level_up_track_id, COUNT(DISTINCT user_id) as player_count')
                ->groupBy('level_up_track_id')
                ->pluck('player_count', 'level_up_track_id');

        /** Active challenge rows per track — sole source for hub card counts (level_up_challenge_entries). */
        $entriesByTrackId = $trackIds === []
            ? collect()
            : LevelUpChallengeEntry::query()
                ->whereIn('level_up_track_id', $trackIds)
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get()
                ->groupBy('level_up_track_id');

        $tracks = $levelUpTracks
            ->map(function (LevelUpTrack $track) use ($playersCountByTrackId, $entriesByTrackId) {
                $entries = $entriesByTrackId->get($track->id, collect());

                return array_merge($track->only(['id', 'slug', 'name', 'status', 'subject_categories']), [
                    'challenges_count' => $entries->count(),
                    'players_count' => (int) ($playersCountByTrackId[$track->id] ?? 0),
                    'hub_card_description' => $track->hub_card_description,
                    'cover_image_url' => $this->publicChallengeImageUrl($track->cover_image_path),
                ]);
            })
            ->values()
            ->all();

        $tracks = array_values(array_filter(
            $tracks,
            fn (array $t) => $this->trackMatchesHubFilter($t, $activeFilter)
        ));

        $user = Auth::user();
        $chestGoal = 2000;
        $rewardPoints = $user ? round((float) ($user->reward_points ?? 0), 2) : 0.0;
        $rpFloor = (int) floor($rewardPoints);
        $pointsInChest = $chestGoal > 0 ? ($rpFloor % $chestGoal) : 0;
        $pointsToNextChest = $chestGoal - $pointsInChest;
        if ($pointsToNextChest === $chestGoal && $rpFloor > 0) {
            $pointsToNextChest = $chestGoal;
        }

        /** Total answered rows — used for badge progression only (not “one quiz per row”). */
        $totalQuestionAnswers = 0;
        /** Distinct (track + calendar day) — one “quiz” session per track per day. */
        $quizzesCompleted = 0;
        $dayStreak = 0;
        if ($user) {
            $totalQuestionAnswers = UserChallengeQuestionEvent::query()
                ->where('user_id', $user->id)
                ->where('status', UserChallengeQuestionEvent::STATUS_ANSWERED)
                ->count();

            $quizzesCompleted = UserChallengeQuestionEvent::query()
                ->where('user_id', $user->id)
                ->where('status', UserChallengeQuestionEvent::STATUS_ANSWERED)
                ->whereNotNull('answered_at')
                ->whereNotNull('level_up_track_id')
                ->get(['level_up_track_id', 'answered_at'])
                ->unique(fn (UserChallengeQuestionEvent $e) => $e->level_up_track_id.'|'.$e->answered_at->format('Y-m-d'))
                ->count();

            $dayStreak = $this->challengeQuizStreakDays($user->id);
        }

        $badgesEarned = min(99, (int) round($totalQuestionAnswers / 2.17));

        $challengeCategories = $challengeHubCategories
            ->map(fn (ChallengeHubCategory $c) => [
                'slug' => $c->slug,
                'label' => $c->label,
                'icon' => $c->icon,
                'filter_key' => $c->filter_key,
                'is_new' => $c->is_new,
                'cover_image_url' => $this->publicChallengeImageUrl($c->cover_image_path),
            ])
            ->values()
            ->all();

        /** Filter pills: distinct filter_key, label from first row per key (same order as categories). */
        $challengeFilters = array_merge(
            [['id' => 'all', 'label' => 'All']],
            $challengeHubCategories->unique('filter_key')->values()->map(fn (ChallengeHubCategory $c) => [
                'id' => $c->filter_key,
                'label' => $c->label,
            ])->all()
        );

        return Inertia::render('frontend/level-up/Index', [
            'tracks' => $tracks,
            'challenge_categories' => $challengeCategories,
            'challenge_filters' => $challengeFilters,
            'active_filter' => $activeFilter,
            'active_category_slug' => $activeCategorySlug,
            'hub' => [
                'chest_goal' => $chestGoal,
                'reward_points' => $rewardPoints,
                'points_in_current_chest' => $pointsInChest,
                'points_to_next_chest' => $pointsToNextChest,
                'quizzes_completed' => $quizzesCompleted,
                'badges_earned' => $badgesEarned,
                'day_streak' => $dayStreak,
            ],
        ]);
    }

    public function challenges(Request $request, LevelUpTrack $track): Response
    {
        if (! $track->isActive()) {
            abort(404);
        }

        $user = Auth::user();
        abort_if(! $user, 403);

        $challengeHubCategories = ChallengeHubCategory::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $categoryQuery = $request->query('category');
        $pres = $this->resolveTrackHeroPresentation(
            $track,
            is_string($categoryQuery) && $categoryQuery !== '' ? $categoryQuery : null,
            $challengeHubCategories
        );

        $challengeCategories = $challengeHubCategories
            ->map(fn (ChallengeHubCategory $c) => [
                'slug' => $c->slug,
                'label' => $c->label,
                'icon' => $c->icon,
                'filter_key' => $c->filter_key,
                'is_new' => $c->is_new,
                'cover_image_url' => $this->publicChallengeImageUrl($c->cover_image_path),
            ])
            ->values()
            ->all();

        $fallbackImages = config('challenge_hub.quiz_card_fallback_images', []);
        if (! is_array($fallbackImages) || $fallbackImages === []) {
            $fallbackImages = [];
        }

        return Inertia::render('frontend/level-up/Challenges', [
            'app_name' => (string) config('app.name', 'Believe'),
            'track' => $pres['track'],
            'hero' => $pres['hero'],
            'active_category_slug' => $pres['active_category_slug'],
            'challenge_categories' => $challengeCategories,
            'quiz_cards' => $pres['quiz_cards'],
            'quiz_card_fallback_images' => array_values(array_filter($fallbackImages, fn ($u) => is_string($u) && $u !== '')),
            'challenges_empty_heading' => (string) config('challenge_hub.challenges_empty_heading'),
            'challenges_empty_hint' => (string) config('challenge_hub.challenges_empty_hint'),
            'quiz_mode' => $this->quizModeFromRequest($request),
        ]);
    }

    public function play(Request $request, LevelUpTrack $track, ?string $challenge = null): Response
    {
        if (! $track->isActive()) {
            abort(404);
        }

        $user = Auth::user();
        abort_if(! $user, 403);

        $answeredCount = $this->answeredCount($user->id, $track->id);

        return Inertia::render('frontend/level-up/Play', $this->playPageProps($request, $track, $answeredCount, null, null, null, null, null));
    }

    /**
     * Inertia quiz actions use POST only. A browser refresh issues GET — redirect back to the play URL so users do not see 405.
     */
    public function restorePlayFromGet(Request $request, LevelUpTrack $track): RedirectResponse
    {
        if (! $track->isActive()) {
            abort(404);
        }

        $params = array_filter([
            'track' => $track->slug,
            'challenge' => is_string($request->query('challenge')) && trim($request->query('challenge')) !== ''
                ? trim((string) $request->query('challenge'))
                : null,
        ]);

        $url = route('challenge-hub.play', $params);
        $qm = $request->query('quiz_mode');
        if (is_string($qm) && trim($qm) !== '') {
            $url .= (str_contains($url, '?') ? '&' : '?').'quiz_mode='.rawurlencode(trim($qm));
        }

        return redirect()->to($url);
    }

    public function next(Request $request, LevelUpTrack $track): Response
    {
        if (! $track->isActive()) {
            abort(404);
        }

        $user = Auth::user();
        abort_if(! $user, 403);

        $challengeSlug = $this->resolveChallengeSlugFromRequest($request, $request->route('challenge'));

        /** @var ChallengeQuestionService $service */
        $service = app(ChallengeQuestionService::class);
        $entry = $this->selectedChallengeEntry($track, $challengeSlug);
        $qstate = $service->next(
            $user,
            $track,
            $this->quizSubcategoryFilterForPlay($track, $challengeSlug),
            $this->quizModeFromRequest($request),
            $entry?->title,
            $entry?->description
        );

        $answeredCount = $this->answeredCount($user->id, $track->id);

        $activeQuestion = null;
        $playStatus = $qstate['status'] ?? null;
        $playMessage = $qstate['message'] ?? null;
        $quizResult = null;

        if (($qstate['status'] ?? null) === 'exhausted') {
            $quizResult = $service->finalizeOpenSessionForTrack($user, $track, $this->practiceModeForPlay($request));
        }

        if (($qstate['status'] ?? null) === 'question') {
            $activeQuestion = [
                'event_id' => $qstate['event_id'],
                'category' => $qstate['category'],
                'subcategory' => $qstate['subcategory'],
                'question' => $qstate['question'],
                'option_rows' => $qstate['option_rows'],
                'difficulty' => $qstate['difficulty'],
                'generated_new_questions' => (bool) ($qstate['generated_new_questions'] ?? false),
            ];
        }

        return Inertia::render(
            'frontend/level-up/Play',
            $this->playPageProps($request, $track, $answeredCount, $activeQuestion, $playStatus, $playMessage, null, $quizResult)
        );
    }

    public function answer(Request $request, LevelUpTrack $track): Response
    {
        if (! $track->isActive()) {
            abort(404);
        }

        $user = Auth::user();
        abort_if(! $user, 403);

        $validated = $request->validate([
            'event_id' => 'required|integer',
            'timed_out' => 'sometimes|boolean',
            'selected_option' => 'required_unless:timed_out,true|nullable|string|size:1',
        ]);

        $timedOut = filter_var($request->input('timed_out', false), FILTER_VALIDATE_BOOLEAN);

        /** @var ChallengeQuestionService $service */
        $service = app(ChallengeQuestionService::class);
        $result = $service->answer(
            $user,
            $track,
            (int) $validated['event_id'],
            $validated['selected_option'] ?? null,
            $timedOut,
            $this->practiceModeForPlay($request),
        );

        $answeredCount = $this->answeredCount($user->id, $track->id);

        return Inertia::render(
            'frontend/level-up/Play',
            $this->playPageProps($request, $track, $answeredCount, null, null, null, $result, null)
        );
    }

    /**
     * Hero block + enriched track for the track challenges page and the play pre-game screen.
     * `quiz_cards` are built only from active {@link LevelUpChallengeEntry} rows (not from grouping the question bank).
     *
     * @param  Collection<int, ChallengeHubCategory>  $challengeHubCategories
     * @return array{
     *     track: array<string, mixed>,
     *     hero: array{title: string, subtitle: string, challenges_count: int},
     *     active_category_slug: string|null,
     *     hero_icon: string,
     *     quiz_cards: array<int, mixed>
     * }
     */
    protected function resolveTrackHeroPresentation(LevelUpTrack $track, ?string $categorySlug, Collection $challengeHubCategories): array
    {
        $activeCategorySlug = $categorySlug;
        if (! is_string($activeCategorySlug) || $activeCategorySlug === '') {
            $activeCategorySlug = $this->inferHubCategorySlugForTrack($track, $challengeHubCategories);
        } elseif (! $challengeHubCategories->contains('slug', $activeCategorySlug)) {
            $activeCategorySlug = $this->inferHubCategorySlugForTrack($track, $challengeHubCategories);
        }

        $topicLabel = $challengeHubCategories->firstWhere('slug', $activeCategorySlug)?->label
            ?? (is_array($track->subject_categories) && isset($track->subject_categories[0]) ? (string) $track->subject_categories[0] : $track->name);

        /** @var array<int, string> $subjectCats */
        $subjectCats = array_values(array_filter($track->subject_categories ?? [], fn ($c) => is_string($c) && $c !== ''));

        $entries = LevelUpChallengeEntry::query()
            ->where('level_up_track_id', $track->id)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $quizCards = $entries
            ->map(fn (LevelUpChallengeEntry $entry) => $this->quizCardFromEntry($track, $subjectCats, $entry))
            ->values()
            ->all();

        $challengesCount = count($quizCards);

        $heroTitle = $topicLabel.' Challenges';
        $heroSubtitle = match (true) {
            $challengesCount === 0 => 'No challenges in this topic yet.',
            default => 'Explore each challenge below on the topic of '.$topicLabel.'.',
        };

        $heroIcon = (string) ($challengeHubCategories->firstWhere('slug', $activeCategorySlug)?->icon ?? 'heart');

        $trackPayload = array_merge(
            $track->only(['id', 'slug', 'name', 'status', 'subject_categories']),
            [
                'hub_card_description' => $track->hub_card_description,
                'cover_image_url' => $this->publicChallengeImageUrl($track->cover_image_path),
                'quiz_subcategory' => $track->quiz_subcategory,
            ]
        );

        return [
            'track' => $trackPayload,
            'hero' => [
                'title' => $heroTitle,
                'subtitle' => $heroSubtitle,
                'challenges_count' => $challengesCount,
            ],
            'active_category_slug' => $activeCategorySlug,
            'hero_icon' => $heroIcon,
            'quiz_cards' => $quizCards,
            'play_hero_from_card' => false,
        ];
    }

    /**
     * When the user opens play with ?card={key}, hero copy + circle image follow that quiz card.
     *
     * @param  array<string, mixed>  $pres  Output of resolveTrackHeroPresentation()
     * @return array<string, mixed>
     */
    protected function applySelectedQuizCardToPlayHero(array $pres, ?string $cardKey): array
    {
        $pres['play_hero_from_card'] = false;
        if ($cardKey === null || $cardKey === '') {
            return $pres;
        }

        /** @var array<int, array<string, mixed>> $cards */
        $cards = $pres['quiz_cards'] ?? [];
        $selected = null;
        foreach ($cards as $c) {
            if (! is_array($c)) {
                continue;
            }
            $matchSlug = (string) ($c['slug'] ?? '');
            $matchKey = (string) ($c['key'] ?? '');
            if ($matchSlug === $cardKey || $matchKey === $cardKey) {
                $selected = $c;
                break;
            }
        }

        if ($selected === null) {
            return $pres;
        }

        $pres['play_hero_from_card'] = true;
        $pres['hero']['title'] = (string) ($selected['title'] ?? $pres['hero']['title']);
        $desc = trim((string) ($selected['description'] ?? ''));
        if ($desc !== '') {
            $pres['hero']['subtitle'] = $desc;
        }

        $img = $selected['image_url'] ?? null;
        if (is_string($img) && $img !== '') {
            $pres['track']['cover_image_url'] = $img;
        }

        return $pres;
    }

    /**
     * @param  array<string, mixed>|null  $activeQuestion
     * @param  array<string, mixed>|null  $lastResult
     * @param  array<string, mixed>|null  $quizResult
     * @return array<string, mixed>
     */
    protected function playPageProps(
        Request $request,
        LevelUpTrack $track,
        int $answeredCount,
        ?array $activeQuestion,
        ?string $playStatus,
        ?string $playMessage,
        ?array $lastResult,
        ?array $quizResult,
    ): array {
        $user = Auth::user();
        if ($user) {
            $user->refresh();
        }
        $rewardBalance = $user ? round((float) $user->currentRewardPoints(), 2) : 0.0;
        $sessionStreak = 0;
        if ($user) {
            $openSession = LevelUpQuizSession::query()
                ->where('user_id', $user->id)
                ->where('level_up_track_id', $track->id)
                ->whereNull('ended_at')
                ->latest('id')
                ->first();
            $sessionStreak = $openSession ? (int) $openSession->running_answer_streak : 0;
        }

        $challengeHubCategories = ChallengeHubCategory::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $pres = $this->resolveTrackHeroPresentation($track, null, $challengeHubCategories);

        $cardKey = $this->resolveChallengeSlugFromRequest($request, $request->route('challenge'));
        $pres = $this->applySelectedQuizCardToPlayHero($pres, is_string($cardKey) ? $cardKey : null);

        return [
            'track' => $pres['track'],
            'hero' => $pres['hero'],
            'active_category_slug' => $pres['active_category_slug'],
            'hero_icon' => $pres['hero_icon'],
            'play_hero_from_card' => (bool) ($pres['play_hero_from_card'] ?? false),
            /** Echo back for POST next/answer — no session; slug from route, query, or body. */
            'play_challenge_slug' => is_string($cardKey) && $cardKey !== '' ? $cardKey : null,
            'answeredCount' => $answeredCount,
            'activeQuestion' => $activeQuestion,
            'playStatus' => $playStatus,
            'playMessage' => $playMessage,
            'lastResult' => $lastResult,
            'quiz_result' => $quizResult,
            'question_time_limit_seconds' => $this->questionTimeLimitSecondsForPlay($request),
            'quiz_mode' => $this->quizModeFromRequest($request),
            'practice_mode' => $this->practiceModeForPlay($request),
            'reward_points_balance' => $rewardBalance,
            'quiz_session_streak' => $sessionStreak,
        ];
    }

    /**
     * Challenge card slug: POST body (quiz actions) > query > route parameter (play URL).
     */
    protected function resolveChallengeSlugFromRequest(Request $request, mixed $routeChallenge = null): ?string
    {
        $body = $request->input('challenge');
        if (is_string($body) && trim($body) !== '') {
            return trim($body);
        }
        $q = $request->query('challenge');
        if (is_string($q) && trim($q) !== '') {
            return trim($q);
        }
        if (is_string($routeChallenge) && trim($routeChallenge) !== '') {
            return trim($routeChallenge);
        }

        return null;
    }

    /**
     * Quiz difficulty / practice: POST body (each quiz request) > query string (initial page load).
     *
     * @return ChallengePlayQuizMode::EASY|ChallengePlayQuizMode::MEDIUM|ChallengePlayQuizMode::HARD|ChallengePlayQuizMode::PRACTICE
     */
    protected function quizModeFromRequest(Request $request): string
    {
        $raw = $request->input('quiz_mode');
        if (! is_string($raw) || trim($raw) === '') {
            $raw = $request->query('quiz_mode');
        }

        return ChallengePlayQuizMode::normalize(is_string($raw) ? $raw : null);
    }

    protected function practiceModeForPlay(Request $request): bool
    {
        return ChallengePlayQuizMode::isPractice($this->quizModeFromRequest($request));
    }

    protected function questionTimeLimitSecondsForPlay(Request $request): int
    {
        $base = (int) config('challenge_hub.question_time_limit_seconds', 10);
        if ($this->practiceModeForPlay($request)) {
            $base = (int) round($base * (float) config('challenge_hub.practice_time_multiplier', 1.5));
        }

        return max(1, $base);
    }

    protected function answeredCount(int $userId, int $trackId): int
    {
        return UserChallengeQuestionEvent::query()
            ->where('user_id', $userId)
            ->where('level_up_track_id', $trackId)
            ->where('status', UserChallengeQuestionEvent::STATUS_ANSWERED)
            ->count();
    }

    protected function challengeQuizStreakDays(int $userId): int
    {
        $hasOn = function (Carbon $day) use ($userId): bool {
            return UserChallengeQuestionEvent::query()
                ->where('user_id', $userId)
                ->where('status', UserChallengeQuestionEvent::STATUS_ANSWERED)
                ->whereDate('answered_at', $day->format('Y-m-d'))
                ->exists();
        };

        $streak = 0;
        $d = Carbon::today();
        if (! $hasOn($d)) {
            $d->subDay();
        }
        while ($streak < 366 && $hasOn($d)) {
            $streak++;
            $d->subDay();
        }

        return $streak;
    }

    /**
     * Mirrors frontend track filtering so list results come from the server (query ?filter=).
     *
     * @param  array<string, mixed>  $track
     */
    protected function trackMatchesHubFilter(array $track, string $filterId): bool
    {
        $filterId = strtolower($filterId);
        if ($filterId === 'all') {
            return true;
        }

        $slug = strtolower((string) ($track['slug'] ?? ''));
        $name = strtolower((string) ($track['name'] ?? ''));
        /** @var array<int, string> $cats */
        $cats = array_map('strtolower', $track['subject_categories'] ?? []);
        $hay = $slug.' '.$name.' '.implode(' ', $cats);

        return match ($filterId) {
            'money' => str_contains($hay, 'money') || str_contains($hay, 'life skill') || str_contains($hay, 'finance'),
            'health' => str_contains($hay, 'health') || str_contains($hay, 'wellness'),
            'world' => str_contains($hay, 'world') || str_contains($hay, 'global'),
            default => str_contains($hay, $filterId),
        };
    }

    /**
     * @param  Collection<int, ChallengeHubCategory>  $categories
     */
    protected function inferHubCategorySlugForTrack(LevelUpTrack $track, Collection $categories): ?string
    {
        if ($categories->isEmpty()) {
            return null;
        }

        $hay = strtolower($track->slug.' '.$track->name);
        /** @var array<int, string> $sc */
        $sc = $track->subject_categories ?? [];
        foreach ($sc as $c) {
            $hay .= ' '.strtolower((string) $c);
        }

        foreach ($categories as $c) {
            $fk = strtolower((string) $c->filter_key);
            $lab = strtolower((string) $c->label);
            if ($fk !== '' && str_contains($hay, $fk)) {
                return $c->slug;
            }
            if ($lab !== '' && str_contains($hay, $lab)) {
                return $c->slug;
            }
        }

        return $categories->first()->slug;
    }

    protected function publicChallengeImageUrl(?string $path): ?string
    {
        if (! is_string($path) || $path === '') {
            return null;
        }

        return Storage::disk('public')->url($path);
    }

    /**
     * Distinct players today on this track for these questions: one count per person (not per question answered).
     *
     * @param  array<int, int>  $questionIds
     */
    protected function playsTodayForTrackQuestions(LevelUpTrack $track, array $questionIds): int
    {
        if ($questionIds === []) {
            return 0;
        }

        return (int) UserChallengeQuestionEvent::query()
            ->where('level_up_track_id', $track->id)
            ->where('status', UserChallengeQuestionEvent::STATUS_ANSWERED)
            ->whereDate('answered_at', today())
            ->whereIn('challenge_question_id', $questionIds)
            ->count(DB::raw('DISTINCT user_id'));
    }

    /**
     * Subcategory stored on {@link ChallengeQuestion} rows for filtering. Per-challenge entries win over the track default
     * so each hub card only draws (and generates) questions for that challenge.
     */
    protected function effectiveSubcategoryForHubChallenge(LevelUpTrack $track, ?LevelUpChallengeEntry $entry): ?string
    {
        if ($entry && filled($entry->subcategory_key)) {
            return trim((string) $entry->subcategory_key);
        }
        $quizSub = $track->quiz_subcategory;
        if (is_string($quizSub) && trim($quizSub) !== '') {
            return trim($quizSub);
        }

        return null;
    }

    /**
     * Subcategory filter for {@link ChallengeQuestion} from the selected hub card slug (route / query / POST).
     */
    protected function quizSubcategoryFilterForPlay(LevelUpTrack $track, ?string $challengeSlug): ?string
    {
        $entry = $this->selectedChallengeEntry($track, $challengeSlug);

        return $this->effectiveSubcategoryForHubChallenge($track, $entry);
    }

    /**
     * Active hub challenge row for the given card slug (from /play/{challenge} or repeated on each POST).
     */
    protected function selectedChallengeEntry(LevelUpTrack $track, ?string $challengeSlug): ?LevelUpChallengeEntry
    {
        if (! is_string($challengeSlug) || $challengeSlug === '') {
            return null;
        }

        return LevelUpChallengeEntry::query()
            ->where('level_up_track_id', $track->id)
            ->where('slug', $challengeSlug)
            ->where('is_active', true)
            ->first();
    }

    /**
     * @param  array<int, string>  $subjectCats
     */
    protected function challengeQuestionsQueryForEntry(LevelUpTrack $track, array $subjectCats, ?LevelUpChallengeEntry $entry): Builder
    {
        $query = ChallengeQuestion::query()->whereIn('category', $subjectCats);
        $sub = $this->effectiveSubcategoryForHubChallenge($track, $entry);
        if (is_string($sub) && $sub !== '') {
            $query->where('subcategory', $sub);
        }

        return $query;
    }

    /**
     * One hub card from a {@link LevelUpChallengeEntry} row. Listing uses only these rows; question_count / plays_today
     * still come from {@link ChallengeQuestion} for display.
     *
     * @param  array<int, string>  $subjectCats
     * @return array{key: string, slug: string, title: string, description: string, question_count: int, plays_today: int, image_index: int, image_url: ?string} key is stable `entry-{id}`; slug is unique per track for URLs
     */
    protected function quizCardFromEntry(LevelUpTrack $track, array $subjectCats, LevelUpChallengeEntry $entry): array
    {
        $base = $this->challengeQuestionsQueryForEntry($track, $subjectCats, $entry);
        $questionCount = (clone $base)->count();
        $qIds = (clone $base)->pluck('id')->all();
        $playsToday = $this->playsTodayForTrackQuestions($track, $qIds);

        $description = $entry->description;
        if (! is_string($description) || trim($description) === '') {
            $description = 'Quiz content for '.$entry->title.'.';
        }

        $publicSlug = is_string($entry->slug) && $entry->slug !== ''
            ? $entry->slug
            : 'entry-'.$entry->id;

        return [
            'key' => 'entry-'.$entry->id,
            'slug' => $publicSlug,
            'title' => $entry->title,
            'description' => Str::limit(strip_tags($description), 200),
            'question_count' => $questionCount,
            'plays_today' => $playsToday,
            'image_index' => abs(crc32((string) $entry->id)) % 10,
            'image_url' => $this->publicChallengeImageUrl($entry->cover_image_path),
        ];
    }
}
