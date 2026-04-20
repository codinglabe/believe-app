<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ChallengeHubCategory;
use App\Models\ChallengeQuestion;
use App\Models\ChallengeQuizSubcategory;
use App\Models\LevelUpChallengeEntry;
use App\Models\LevelUpTrack;
use App\Services\ChallengeHubImageService;
use App\Support\ChallengeQuestionHasher;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class AdminChallengeHubController extends Controller
{
    public function categoriesIndex(): Response
    {
        $categories = ChallengeHubCategory::query()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (ChallengeHubCategory $c) => [
                'id' => $c->id,
                'slug' => $c->slug,
                'label' => $c->label,
                'filter_key' => $c->filter_key,
                'is_active' => $c->is_active,
                'has_cover' => $c->cover_image_path !== null,
            ])
            ->values()
            ->all();

        return Inertia::render('admin/challenge-hub/CategoriesIndex', [
            'categories' => $categories,
        ]);
    }

    public function tracksIndex(): Response
    {
        $tracks = LevelUpTrack::query()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (LevelUpTrack $t) => [
                'id' => $t->id,
                'slug' => $t->slug,
                'name' => $t->name,
                'status' => $t->status,
                'has_cover' => $t->cover_image_path !== null,
                'entries_count' => $t->challengeEntries()->count(),
            ])
            ->values()
            ->all();

        return Inertia::render('admin/challenge-hub/TracksIndex', [
            'tracks' => $tracks,
        ]);
    }

    public function questionsIndex(Request $request): Response
    {
        $categoryFilter = $request->query('category');
        $search = $request->query('search');

        $query = ChallengeQuestion::query()->orderByDesc('id');

        if (is_string($categoryFilter) && $categoryFilter !== '') {
            $query->where('category', $categoryFilter);
        }

        if (is_string($search) && $search !== '') {
            $term = '%'.$search.'%';
            $query->where(function ($q) use ($term) {
                $q->where('question', 'like', $term)
                    ->orWhere('subcategory', 'like', $term)
                    ->orWhere('category', 'like', $term);
            });
        }

        $paginator = $query->paginate(10)->withQueryString();

        $categoryOptions = ChallengeQuestion::query()
            ->select('category')
            ->whereNotNull('category')
            ->where('category', '!=', '')
            ->distinct()
            ->orderBy('category')
            ->pluck('category')
            ->values()
            ->all();

        return Inertia::render('admin/challenge-hub/QuestionsBank', [
            'questions' => $paginator,
            'filters' => [
                'category' => is_string($categoryFilter) ? $categoryFilter : '',
                'search' => is_string($search) ? $search : '',
            ],
            'category_options' => $categoryOptions,
        ]);
    }

    public function storeQuestion(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'category' => 'required|string|max:128',
            'subcategory' => 'required|string|max:128',
            'question' => 'required|string|max:65000',
            'option_a' => 'required|string|max:512',
            'option_b' => 'required|string|max:512',
            'option_c' => 'required|string|max:512',
            'option_d' => 'required|string|max:512',
            'correct_option' => 'required|in:A,B,C,D,a,b,c,d',
            'explanation' => 'nullable|string|max:10000',
            'difficulty' => 'nullable|string|max:32',
        ]);

        $subTrim = trim($data['subcategory']);
        if (! $this->quizSubcategoryExistsForHubLabel($data['category'], $subTrim)) {
            return redirect()->back()->withErrors([
                'subcategory' => 'Choose a subcategory that exists for this hub (Challenge Hub → Subcategories).',
            ])->withInput();
        }

        $correct = strtoupper((string) $data['correct_option']);
        $hash = ChallengeQuestionHasher::hash(
            $data['category'],
            $data['question'],
            $data['option_a'],
            $data['option_b'],
            $data['option_c'],
            $data['option_d'],
        );

        if (ChallengeQuestion::query()->where('content_hash', $hash)->exists()) {
            return redirect()->back()->with('error', 'A question with the same text and options already exists.')->withInput();
        }

        try {
            $created = ChallengeQuestion::create([
                'category' => $data['category'],
                'subcategory' => $subTrim,
                'question' => $data['question'],
                'option_a' => $data['option_a'],
                'option_b' => $data['option_b'],
                'option_c' => $data['option_c'],
                'option_d' => $data['option_d'],
                'correct_option' => $correct,
                'explanation' => $data['explanation'] ?? null,
                'difficulty' => $data['difficulty'] ?? null,
                'source' => ChallengeQuestion::SOURCE_ADMIN,
                'content_hash' => $hash,
            ]);
        } catch (QueryException) {
            return redirect()->back()->with('error', 'Could not save the question (duplicate or database error).')->withInput();
        }

        return redirect()->route('admin.challenge-hub.questions.edit', $created)
            ->with('success', 'Question created.');
    }

    public function createQuestion(): Response
    {
        return Inertia::render('admin/challenge-hub/QuestionCreate', $this->challengeHubPickerProps());
    }

    public function editQuestion(ChallengeQuestion $question): Response
    {
        return Inertia::render('admin/challenge-hub/QuestionEdit', array_merge($this->challengeHubPickerProps(), [
            'question' => [
                'id' => $question->id,
                'category' => $question->category,
                'subcategory' => $question->subcategory,
                'question' => $question->question,
                'option_a' => $question->option_a,
                'option_b' => $question->option_b,
                'option_c' => $question->option_c,
                'option_d' => $question->option_d,
                'correct_option' => strtoupper((string) $question->correct_option),
                'explanation' => $question->explanation,
                'difficulty' => $question->difficulty,
                'source' => $question->source,
            ],
        ]));
    }

    public function updateQuestion(Request $request, ChallengeQuestion $question): RedirectResponse
    {
        $data = $request->validate([
            'category' => 'required|string|max:128',
            'subcategory' => 'required|string|max:128',
            'question' => 'required|string|max:65000',
            'option_a' => 'required|string|max:512',
            'option_b' => 'required|string|max:512',
            'option_c' => 'required|string|max:512',
            'option_d' => 'required|string|max:512',
            'correct_option' => 'required|in:A,B,C,D,a,b,c,d',
            'explanation' => 'nullable|string|max:10000',
            'difficulty' => 'nullable|string|max:32',
        ]);

        $subTrim = trim($data['subcategory']);
        if (! $this->quizSubcategoryExistsForHubLabel($data['category'], $subTrim)) {
            return redirect()->back()->withErrors([
                'subcategory' => 'Choose a subcategory that exists for this hub (Challenge Hub → Subcategories).',
            ])->withInput();
        }

        $correct = strtoupper((string) $data['correct_option']);
        $hash = ChallengeQuestionHasher::hash(
            $data['category'],
            $data['question'],
            $data['option_a'],
            $data['option_b'],
            $data['option_c'],
            $data['option_d'],
        );

        if (ChallengeQuestion::query()->where('content_hash', $hash)->where('id', '!=', $question->id)->exists()) {
            return redirect()->back()->with('error', 'A question with the same text and options already exists.')->withInput();
        }

        try {
            $question->update([
                'category' => $data['category'],
                'subcategory' => $subTrim,
                'question' => $data['question'],
                'option_a' => $data['option_a'],
                'option_b' => $data['option_b'],
                'option_c' => $data['option_c'],
                'option_d' => $data['option_d'],
                'correct_option' => $correct,
                'explanation' => $data['explanation'] ?? null,
                'difficulty' => $data['difficulty'] ?? null,
                'content_hash' => $hash,
            ]);
        } catch (QueryException) {
            return redirect()->back()->with('error', 'Could not update the question.')->withInput();
        }

        return redirect()->route('admin.challenge-hub.questions.edit', $question)
            ->with('success', 'Question updated.');
    }

    public function destroyQuestion(ChallengeQuestion $question): RedirectResponse
    {
        $question->delete();

        return redirect()->back()->with('success', 'Question deleted.');
    }

    public function storeCategory(Request $request, ChallengeHubImageService $images): RedirectResponse
    {
        $data = $request->validate([
            'label' => 'required|string|max:255',
            'is_new' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer|min:0|max:65535',
            'cover_image' => 'nullable|image|max:10240',
            'cover_prompt' => 'nullable|string|max:2000',
        ]);

        $coverPromptTrim = isset($data['cover_prompt']) ? trim((string) $data['cover_prompt']) : '';
        if ($coverPromptTrim !== '' && mb_strlen($coverPromptTrim) < 12) {
            return redirect()->back()->withErrors([
                'cover_prompt' => 'The prompt must be at least 12 characters when generating a cover.',
            ])->withInput();
        }

        $slug = $this->uniqueChallengeHubCategorySlug($data['label']);
        $filterKey = $this->uniqueChallengeHubCategoryFilterKey($data['label']);

        $category = ChallengeHubCategory::query()->create([
            'slug' => $slug,
            'label' => $data['label'],
            'icon' => 'layers',
            'filter_key' => $filterKey,
            'is_new' => $data['is_new'] ?? false,
            'is_active' => $data['is_active'] ?? true,
            'sort_order' => $data['sort_order'] ?? 0,
        ]);

        $redirect = fn (string $msg, ?string $err = null) => redirect()
            ->route('admin.challenge-hub.categories.edit', $category->slug)
            ->with($err ? 'error' : 'success', $err ?? $msg);

        if ($request->hasFile('cover_image')) {
            try {
                $dir = 'challenge-hub/categories/'.$category->id;
                $filename = 'cover-upload-'.time();
                $file = $request->file('cover_image');
                if (! $file) {
                    return $redirect('Category created.', 'No image file received.');
                }
                $path = $images->storeUploadedCover($file, $dir, $filename);
                $category->update(['cover_image_path' => $path]);
            } catch (RuntimeException $e) {
                return $redirect('Category created.', $e->getMessage());
            }

            return $redirect('Category created with cover image.');
        }

        if ($coverPromptTrim !== '') {
            try {
                $dir = 'challenge-hub/categories/'.$category->id;
                $filename = 'cover-'.time();
                $path = $images->generateAndStore($coverPromptTrim, $dir, $filename);
                $category->update(['cover_image_path' => $path]);
            } catch (RuntimeException $e) {
                return $redirect('Category created.', $e->getMessage());
            }

            return $redirect('Category created with generated cover.');
        }

        return $redirect('Category created.');
    }

    public function createCategory(): Response
    {
        return Inertia::render('admin/challenge-hub/CategoryCreate');
    }

    public function destroyCategory(ChallengeHubCategory $category): RedirectResponse
    {
        if ($category->cover_image_path) {
            Storage::disk('public')->delete($category->cover_image_path);
        }
        $category->delete();

        return redirect()->route('admin.challenge-hub.categories.index')
            ->with('success', 'Category deleted.');
    }

    public function subcategoriesIndex(Request $request): Response
    {
        $hubParam = $request->query('hub');
        $search = $request->query('search');

        $query = ChallengeQuizSubcategory::query()
            ->with('hubCategory:id,slug,label');

        if (is_string($hubParam) && $hubParam !== '' && ctype_digit($hubParam)) {
            $query->where('challenge_hub_category_id', (int) $hubParam);
        }

        if (is_string($search) && trim($search) !== '') {
            $term = '%'.trim($search).'%';
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', $term)
                    ->orWhereHas('hubCategory', function ($hq) use ($term) {
                        $hq->where('label', 'like', $term)
                            ->orWhere('slug', 'like', $term);
                    });
            });
        }

        $subcategories = $query
            ->orderBy('challenge_hub_category_id')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate(10)
            ->through(fn (ChallengeQuizSubcategory $s) => [
                'id' => $s->id,
                'name' => $s->name,
                'sort_order' => $s->sort_order,
                'hub_label' => $s->hubCategory?->label ?? '',
                'hub_slug' => $s->hubCategory?->slug ?? '',
            ])
            ->withQueryString();

        $hubOptions = ChallengeHubCategory::query()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['id', 'label'])
            ->map(fn (ChallengeHubCategory $c) => [
                'id' => $c->id,
                'label' => $c->label,
            ])
            ->values()
            ->all();

        return Inertia::render('admin/challenge-hub/SubcategoriesIndex', [
            'subcategories' => $subcategories,
            'filters' => [
                'hub' => is_string($hubParam) && ctype_digit($hubParam) ? $hubParam : '',
                'search' => is_string($search) ? $search : '',
            ],
            'hub_options' => $hubOptions,
        ]);
    }

    public function createSubcategory(): Response
    {
        return Inertia::render('admin/challenge-hub/SubcategoryCreate', $this->challengeHubPickerProps());
    }

    public function storeSubcategory(Request $request): RedirectResponse
    {
        $hubId = (int) $request->input('challenge_hub_category_id');

        $data = $request->validate([
            'challenge_hub_category_id' => 'required|exists:challenge_hub_categories,id',
            'name' => [
                'required',
                'string',
                'max:128',
                Rule::unique('challenge_quiz_subcategories', 'name')->where(
                    fn ($q) => $q->where('challenge_hub_category_id', $hubId)
                ),
            ],
            'sort_order' => 'nullable|integer|min:0|max:65535',
        ]);

        ChallengeQuizSubcategory::query()->create([
            'challenge_hub_category_id' => (int) $data['challenge_hub_category_id'],
            'name' => trim($data['name']),
            'sort_order' => $data['sort_order'] ?? 0,
        ]);

        return redirect()->route('admin.challenge-hub.subcategories.index')
            ->with('success', 'Subcategory created.');
    }

    public function editSubcategory(ChallengeQuizSubcategory $subcategory): Response
    {
        $subcategory->load('hubCategory:id,slug,label');

        return Inertia::render('admin/challenge-hub/SubcategoryEdit', array_merge($this->challengeHubPickerProps(), [
            'subcategory' => [
                'id' => $subcategory->id,
                'name' => $subcategory->name,
                'sort_order' => $subcategory->sort_order,
                'challenge_hub_category_id' => $subcategory->challenge_hub_category_id,
                'hub_label' => $subcategory->hubCategory?->label ?? '',
            ],
        ]));
    }

    public function updateSubcategory(Request $request, ChallengeQuizSubcategory $subcategory): RedirectResponse
    {
        $hubId = (int) $request->input('challenge_hub_category_id');

        $data = $request->validate([
            'challenge_hub_category_id' => 'required|exists:challenge_hub_categories,id',
            'name' => [
                'required',
                'string',
                'max:128',
                Rule::unique('challenge_quiz_subcategories', 'name')
                    ->where(fn ($q) => $q->where('challenge_hub_category_id', $hubId))
                    ->ignore($subcategory->id),
            ],
            'sort_order' => 'nullable|integer|min:0|max:65535',
        ]);

        $subcategory->load('hubCategory');
        $oldHubId = $subcategory->challenge_hub_category_id;
        $oldName = $subcategory->name;
        $oldHubLabel = $subcategory->hubCategory?->label ?? '';

        $newHubId = (int) $data['challenge_hub_category_id'];
        $newHub = ChallengeHubCategory::query()->findOrFail($newHubId);
        $newName = trim($data['name']);

        DB::transaction(function () use ($subcategory, $data, $oldHubId, $oldName, $oldHubLabel, $newHub, $newName, $newHubId) {
            $subcategory->update([
                'challenge_hub_category_id' => $newHubId,
                'name' => $newName,
                'sort_order' => $data['sort_order'] ?? $subcategory->sort_order,
            ]);

            if ($oldHubLabel !== '') {
                ChallengeQuestion::query()
                    ->where('category', $oldHubLabel)
                    ->where('subcategory', $oldName)
                    ->update([
                        'category' => $newHub->label,
                        'subcategory' => $newName,
                    ]);
            }

            LevelUpTrack::query()
                ->where('hub_category_id', $oldHubId)
                ->where('quiz_subcategory', $oldName)
                ->update([
                    'hub_category_id' => $newHubId,
                    'quiz_subcategory' => $newName,
                    'subject_categories' => [$newHub->label],
                ]);
        });

        return redirect()->route('admin.challenge-hub.subcategories.index')
            ->with('success', 'Subcategory updated.');
    }

    public function destroySubcategory(ChallengeQuizSubcategory $subcategory): RedirectResponse
    {
        $subcategory->load('hubCategory');
        $hub = $subcategory->hubCategory;
        if (! $hub) {
            $subcategory->delete();

            return redirect()->route('admin.challenge-hub.subcategories.index')
                ->with('success', 'Subcategory removed.');
        }

        $name = $subcategory->name;
        if (ChallengeQuestion::query()->where('category', $hub->label)->where('subcategory', $name)->exists()) {
            return redirect()->back()->with('error', 'Cannot delete: questions still use this subcategory.');
        }

        if (LevelUpTrack::query()->where('hub_category_id', $hub->id)->where('quiz_subcategory', $name)->exists()) {
            return redirect()->back()->with('error', 'Cannot delete: a track still targets this subcategory.');
        }

        $subcategory->delete();

        return redirect()->route('admin.challenge-hub.subcategories.index')
            ->with('success', 'Subcategory removed.');
    }

    public function storeTrack(Request $request, ChallengeHubImageService $images): RedirectResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'status' => 'required|in:active,coming_soon',
            'hub_category_id' => 'required|exists:challenge_hub_categories,id',
            'quiz_subcategory' => 'required|string|max:128',
            'sort_order' => 'nullable|integer|min:0|max:65535',
            'cover_image' => 'nullable|image|max:10240',
            'cover_prompt' => 'nullable|string|max:2000',
        ]);

        $coverPromptTrim = isset($data['cover_prompt']) ? trim((string) $data['cover_prompt']) : '';
        if ($coverPromptTrim !== '' && mb_strlen($coverPromptTrim) < 12) {
            return redirect()->back()->withErrors([
                'cover_prompt' => 'The prompt must be at least 12 characters when generating a cover.',
            ])->withInput();
        }

        $hub = ChallengeHubCategory::query()->findOrFail((int) $data['hub_category_id']);
        $subjectCategories = [$hub->label];
        $quizSub = trim($data['quiz_subcategory']);
        if (! $this->quizSubcategoryExistsForHubId($hub->id, $quizSub)) {
            return redirect()->back()->withErrors([
                'quiz_subcategory' => 'Choose a subcategory defined for this hub (Challenge Hub → Subcategories).',
            ])->withInput();
        }

        $slug = $this->uniqueLevelUpTrackSlug($data['name']);

        $track = LevelUpTrack::query()->create([
            'slug' => $slug,
            'name' => $data['name'],
            'status' => $data['status'],
            'subject_categories' => $subjectCategories,
            'hub_category_id' => $hub->id,
            'quiz_subcategory' => $quizSub,
            'sort_order' => $data['sort_order'] ?? 0,
        ]);

        $redirect = fn (string $msg, ?string $err = null) => redirect()
            ->route('admin.challenge-hub.tracks.edit', $track->slug)
            ->with($err ? 'error' : 'success', $err ?? $msg);

        if ($request->hasFile('cover_image')) {
            try {
                $dir = 'challenge-hub/tracks/'.$track->id;
                $filename = 'cover-upload-'.time();
                $file = $request->file('cover_image');
                if (! $file) {
                    return $redirect('Track created.', 'No image file received.');
                }
                $path = $images->storeUploadedCover($file, $dir, $filename);
                $track->update(['cover_image_path' => $path]);
            } catch (RuntimeException $e) {
                return $redirect('Track created.', $e->getMessage());
            }

            return $redirect('Track created with cover image.');
        }

        if ($coverPromptTrim !== '') {
            try {
                $dir = 'challenge-hub/tracks/'.$track->id;
                $filename = 'cover-'.time();
                $path = $images->generateAndStore($coverPromptTrim, $dir, $filename);
                $track->update(['cover_image_path' => $path]);
            } catch (RuntimeException $e) {
                return $redirect('Track created.', $e->getMessage());
            }

            return $redirect('Track created with generated cover.');
        }

        return $redirect('Track created.');
    }

    public function createTrack(): Response
    {
        return Inertia::render('admin/challenge-hub/TrackCreate', $this->challengeHubPickerProps());
    }

    public function destroyTrack(LevelUpTrack $track): RedirectResponse
    {
        if ($track->cover_image_path) {
            Storage::disk('public')->delete($track->cover_image_path);
        }
        foreach ($track->challengeEntries as $entry) {
            if ($entry->cover_image_path) {
                Storage::disk('public')->delete($entry->cover_image_path);
            }
        }
        $track->delete();

        return redirect()->route('admin.challenge-hub.tracks.index')
            ->with('success', 'Track deleted.');
    }

    public function editTrack(LevelUpTrack $track): Response
    {
        $track->load(['challengeEntries' => fn ($q) => $q->orderBy('sort_order')->orderBy('id')]);

        $hubCategoryId = $track->hub_category_id;
        if ($hubCategoryId === null) {
            $labels = array_values(array_filter($track->subject_categories ?? [], fn ($c) => is_string($c) && $c !== ''));
            $hubCategoryId = $labels !== []
                ? ChallengeHubCategory::query()->whereIn('label', $labels)->orderBy('sort_order')->value('id')
                : null;
        }

        return Inertia::render('admin/challenge-hub/TrackEdit', array_merge($this->challengeHubPickerProps(), [
            'track' => [
                'id' => $track->id,
                'slug' => $track->slug,
                'name' => $track->name,
                'status' => $track->status,
                'subject_categories' => $track->subject_categories ?? [],
                'hub_category_id' => $hubCategoryId,
                'quiz_subcategory' => $track->quiz_subcategory,
                'hub_card_description' => $track->hub_card_description,
                'cover_image_url' => $this->publicUrl($track->cover_image_path),
            ],
            'entries' => $track->challengeEntries->map(fn (LevelUpChallengeEntry $e) => [
                'id' => $e->id,
                'title' => $e->title,
                'slug' => $e->slug,
                'description' => $e->description,
                'subcategory_key' => $e->subcategory_key,
                'sort_order' => $e->sort_order,
                'is_active' => $e->is_active,
                'cover_image_url' => $this->publicUrl($e->cover_image_path),
                'last_image_prompt' => $e->last_image_prompt,
            ])->values()->all(),
        ]));
    }

    public function updateTrack(Request $request, LevelUpTrack $track): RedirectResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'hub_card_description' => 'nullable|string|max:5000',
            'status' => 'required|in:active,coming_soon',
            'hub_category_id' => 'required|exists:challenge_hub_categories,id',
            'quiz_subcategory' => 'required|string|max:128',
        ]);

        $slug = $this->uniqueLevelUpTrackSlug($data['name'], $track->id);
        $hub = ChallengeHubCategory::query()->findOrFail((int) $data['hub_category_id']);
        $quizSub = trim($data['quiz_subcategory']);
        if (! $this->quizSubcategoryExistsForHubId($hub->id, $quizSub)) {
            return redirect()->back()->withErrors([
                'quiz_subcategory' => 'Choose a subcategory defined for this hub (Challenge Hub → Subcategories).',
            ])->withInput();
        }

        $track->update([
            'slug' => $slug,
            'name' => $data['name'],
            'hub_card_description' => $data['hub_card_description'] ?? null,
            'status' => $data['status'],
            'subject_categories' => [$hub->label],
            'hub_category_id' => $hub->id,
            'quiz_subcategory' => $quizSub,
        ]);

        return redirect()->route('admin.challenge-hub.tracks.edit', $track->fresh()->slug)
            ->with('success', 'Track updated.');
    }

    public function generateTrackCover(Request $request, LevelUpTrack $track, ChallengeHubImageService $images): RedirectResponse
    {
        $data = $request->validate([
            'prompt' => 'required|string|min:12|max:2000',
        ]);

        try {
            $dir = 'challenge-hub/tracks/'.$track->id;
            $filename = 'cover-'.time();
            if ($track->cover_image_path) {
                $images->deleteIfExists($track->cover_image_path);
            }
            $path = $images->generateAndStore($data['prompt'], $dir, $filename);
            $track->update(['cover_image_path' => $path]);
        } catch (RuntimeException $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }

        return redirect()->route('admin.challenge-hub.tracks.edit', $track->fresh()->slug)
            ->with('success', 'Cover image generated.');
    }

    public function uploadTrackCover(Request $request, LevelUpTrack $track, ChallengeHubImageService $images): RedirectResponse
    {
        $request->validate([
            'cover_image' => 'required|image|max:10240',
        ]);

        try {
            $dir = 'challenge-hub/tracks/'.$track->id;
            $filename = 'cover-upload-'.time();
            if ($track->cover_image_path) {
                $images->deleteIfExists($track->cover_image_path);
            }
            $file = $request->file('cover_image');
            if (! $file) {
                return redirect()->back()->with('error', 'No file received.');
            }
            $path = $images->storeUploadedCover($file, $dir, $filename);
            $track->update(['cover_image_path' => $path]);
        } catch (RuntimeException $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }

        return redirect()->route('admin.challenge-hub.tracks.edit', $track->fresh()->slug)
            ->with('success', 'Cover image uploaded.');
    }

    public function storeEntry(Request $request, LevelUpTrack $track): RedirectResponse
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:5000',
            'subcategory_key' => 'required|string|max:191',
            'sort_order' => 'nullable|integer|min:0|max:65535',
        ]);

        $hubId = $track->hub_category_id;
        if ($hubId === null) {
            return redirect()->back()->withErrors([
                'subcategory_key' => 'Set the track hub category and quiz subcategory on the track first.',
            ])->withInput();
        }
        $keyTrim = trim($data['subcategory_key']);
        if (! $this->quizSubcategoryExistsForHubId((int) $hubId, $keyTrim)) {
            return redirect()->back()->withErrors([
                'subcategory_key' => 'Choose a subcategory that exists for this track’s hub.',
            ])->withInput();
        }

        LevelUpChallengeEntry::query()->create([
            'level_up_track_id' => $track->id,
            'title' => $data['title'],
            'slug' => LevelUpChallengeEntry::uniqueSlugForTrack($track->id, $data['title']),
            'description' => $data['description'] ?? null,
            'subcategory_key' => $keyTrim,
            'sort_order' => $data['sort_order'] ?? 0,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->route('admin.challenge-hub.tracks.edit', $track->slug)
            ->with('success', 'Challenge entry created.');
    }

    public function updateEntry(Request $request, LevelUpChallengeEntry $entry): RedirectResponse
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:5000',
            'subcategory_key' => 'required|string|max:191',
            'sort_order' => 'nullable|integer|min:0|max:65535',
            'redirect_to' => 'nullable|in:challenges',
        ]);

        $track = $entry->track;
        $hubId = $track->hub_category_id;
        if ($hubId === null) {
            return redirect()->back()->withErrors([
                'subcategory_key' => 'Set the track hub category and quiz subcategory on the track first.',
            ])->withInput();
        }
        $keyTrim = trim($data['subcategory_key']);
        if (! $this->quizSubcategoryExistsForHubId((int) $hubId, $keyTrim)) {
            return redirect()->back()->withErrors([
                'subcategory_key' => 'Choose a subcategory that exists for this track’s hub.',
            ])->withInput();
        }

        $titleChanged = $entry->title !== $data['title'];
        $update = [
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'subcategory_key' => $keyTrim,
            'sort_order' => $data['sort_order'] ?? 0,
            'is_active' => $request->boolean('is_active'),
        ];
        if ($titleChanged) {
            $update['slug'] = LevelUpChallengeEntry::uniqueSlugForTrack($track->id, $data['title'], $entry->id);
        }
        $entry->update($update);

        if ($request->input('redirect_to') === 'challenges') {
            return redirect()->route('admin.challenge-hub.challenges.edit', $entry->fresh()->id)
                ->with('success', 'Challenge updated.');
        }

        return redirect()->route('admin.challenge-hub.tracks.edit', $entry->track->slug)
            ->with('success', 'Entry updated.');
    }

    public function destroyEntry(Request $request, LevelUpChallengeEntry $entry): RedirectResponse
    {
        $slug = $entry->track->slug;
        if ($entry->cover_image_path) {
            Storage::disk('public')->delete($entry->cover_image_path);
        }
        $entry->delete();

        if ($request->query('redirect') === 'challenges') {
            return redirect()->route('admin.challenge-hub.challenges.index')
                ->with('success', 'Challenge removed.');
        }

        return redirect()->route('admin.challenge-hub.tracks.edit', $slug)
            ->with('success', 'Entry removed.');
    }

    public function generateEntryCover(Request $request, LevelUpChallengeEntry $entry, ChallengeHubImageService $images): RedirectResponse
    {
        $data = $request->validate([
            'prompt' => 'required|string|min:12|max:2000',
            'redirect_to' => 'nullable|in:challenges',
        ]);

        try {
            $dir = 'challenge-hub/tracks/'.$entry->level_up_track_id.'/entries';
            $filename = 'entry-'.$entry->id.'-'.time();
            if ($entry->cover_image_path) {
                $images->deleteIfExists($entry->cover_image_path);
            }
            $path = $images->generateAndStore($data['prompt'], $dir, $filename);
            $entry->update([
                'cover_image_path' => $path,
                'last_image_prompt' => $data['prompt'],
            ]);
        } catch (RuntimeException $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }

        if (($data['redirect_to'] ?? null) === 'challenges') {
            return redirect()->route('admin.challenge-hub.challenges.edit', $entry->fresh()->id)
                ->with('success', 'Challenge image generated.');
        }

        return redirect()->route('admin.challenge-hub.tracks.edit', $entry->track->slug)
            ->with('success', 'Entry image generated.');
    }

    public function uploadEntryCover(Request $request, LevelUpChallengeEntry $entry, ChallengeHubImageService $images): RedirectResponse
    {
        $request->validate([
            'cover_image' => 'required|image|max:10240',
            'redirect_to' => 'nullable|in:challenges',
        ]);

        try {
            $dir = 'challenge-hub/tracks/'.$entry->level_up_track_id.'/entries';
            $filename = 'entry-'.$entry->id.'-upload-'.time();
            if ($entry->cover_image_path) {
                $images->deleteIfExists($entry->cover_image_path);
            }
            $file = $request->file('cover_image');
            if (! $file) {
                return redirect()->back()->with('error', 'No file received.');
            }
            $path = $images->storeUploadedCover($file, $dir, $filename);
            $entry->update(['cover_image_path' => $path]);
        } catch (RuntimeException $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }

        if ($request->input('redirect_to') === 'challenges') {
            return redirect()->route('admin.challenge-hub.challenges.edit', $entry->fresh()->id)
                ->with('success', 'Challenge image uploaded.');
        }

        return redirect()->route('admin.challenge-hub.tracks.edit', $entry->track->slug)
            ->with('success', 'Entry image uploaded.');
    }

    public function challengesIndex(Request $request): Response
    {
        $trackFilter = $request->query('track');
        $search = $request->query('search');

        $query = LevelUpChallengeEntry::query()
            ->with(['track:id,name,slug,hub_category_id,subject_categories'])
            ->orderByDesc('id');

        if (is_string($trackFilter) && $trackFilter !== '' && ctype_digit($trackFilter)) {
            $query->where('level_up_track_id', (int) $trackFilter);
        }

        if (is_string($search) && trim($search) !== '') {
            $term = '%'.trim($search).'%';
            $query->where(function ($q) use ($term) {
                $q->where('title', 'like', $term)
                    ->orWhere('description', 'like', $term);
            });
        }

        $paginator = $query->paginate(12)->withQueryString()->through(fn (LevelUpChallengeEntry $e) => [
            'id' => $e->id,
            'title' => $e->title,
            'slug' => $e->slug,
            'description' => $e->description,
            'subcategory_key' => $e->subcategory_key,
            'sort_order' => $e->sort_order,
            'is_active' => $e->is_active,
            'cover_image_url' => $this->publicUrl($e->cover_image_path),
            'track' => [
                'id' => $e->track->id,
                'name' => $e->track->name,
                'slug' => $e->track->slug,
            ],
        ]);

        $trackOptions = LevelUpTrack::query()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (LevelUpTrack $t) => [
                'id' => $t->id,
                'name' => $t->name,
            ])
            ->values()
            ->all();

        return Inertia::render('admin/challenge-hub/ChallengesIndex', [
            'entries' => $paginator,
            'filters' => [
                'track' => is_string($trackFilter) ? $trackFilter : '',
                'search' => is_string($search) ? $search : '',
            ],
            'track_options' => $trackOptions,
        ]);
    }

    public function createChallenge(): Response
    {
        $tracks = LevelUpTrack::query()
            ->with(['hubCategory:id,label'])
            ->orderBy('name')
            ->get()
            ->map(fn (LevelUpTrack $t) => [
                'id' => $t->id,
                'name' => $t->name,
                'slug' => $t->slug,
                'hub_label' => $t->hubCategory?->label
                    ?? (is_array($t->subject_categories) && isset($t->subject_categories[0]) && is_string($t->subject_categories[0])
                        ? $t->subject_categories[0]
                        : ''),
            ])
            ->values()
            ->all();

        return Inertia::render('admin/challenge-hub/ChallengeCreate', [
            'tracks' => $tracks,
        ]);
    }

    public function storeChallenge(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'level_up_track_id' => 'required|exists:level_up_tracks,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:5000',
            'subcategory_key' => 'nullable|string|max:191',
            'sort_order' => 'nullable|integer|min:0|max:65535',
            'is_active' => 'boolean',
        ]);

        $track = LevelUpTrack::query()->findOrFail((int) $data['level_up_track_id']);
        $hubId = $track->hub_category_id;
        if ($hubId === null) {
            return redirect()->back()->withErrors([
                'level_up_track_id' => 'Choose a track that has a hub category set.',
            ])->withInput();
        }
        $keyTrim = trim((string) ($data['subcategory_key'] ?? ''));
        if ($keyTrim !== '' && ! $this->quizSubcategoryExistsForHubId((int) $hubId, $keyTrim)) {
            return redirect()->back()->withErrors([
                'subcategory_key' => 'Choose a subcategory that exists for this track’s hub.',
            ])->withInput();
        }

        $entry = LevelUpChallengeEntry::query()->create([
            'level_up_track_id' => $track->id,
            'title' => $data['title'],
            'slug' => LevelUpChallengeEntry::uniqueSlugForTrack($track->id, $data['title']),
            'description' => $data['description'] ?? null,
            'subcategory_key' => $keyTrim === '' ? null : $keyTrim,
            'sort_order' => $data['sort_order'] ?? 0,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->route('admin.challenge-hub.challenges.edit', $entry->id)
            ->with('success', 'Challenge created. Add or generate a cover image below.');
    }

    public function editChallenge(LevelUpChallengeEntry $entry): Response
    {
        $entry->load(['track.hubCategory']);

        $track = $entry->track;
        $hubLabel = $track->hubCategory?->label
            ?? (is_array($track->subject_categories) && isset($track->subject_categories[0]) && is_string($track->subject_categories[0])
                ? $track->subject_categories[0]
                : '');
        $picker = $this->challengeHubPickerProps();
        $subcategoryOptions = $hubLabel !== ''
            ? ($picker['subcategories_by_category'][$hubLabel] ?? [])
            : [];

        return Inertia::render('admin/challenge-hub/ChallengeEdit', array_merge($picker, [
            'entry' => [
                'id' => $entry->id,
                'title' => $entry->title,
                'slug' => $entry->slug,
                'description' => $entry->description,
                'subcategory_key' => $entry->subcategory_key,
                'sort_order' => $entry->sort_order,
                'is_active' => $entry->is_active,
                'cover_image_url' => $this->publicUrl($entry->cover_image_path),
                'last_image_prompt' => $entry->last_image_prompt,
            ],
            'track' => [
                'id' => $track->id,
                'name' => $track->name,
                'slug' => $track->slug,
                'hub_label' => $hubLabel,
            ],
            'subcategory_options' => $subcategoryOptions,
        ]));
    }

    public function editCategory(ChallengeHubCategory $category): Response
    {
        return Inertia::render('admin/challenge-hub/CategoryEdit', [
            'category' => [
                'id' => $category->id,
                'slug' => $category->slug,
                'label' => $category->label,
                'icon' => $category->icon,
                'filter_key' => $category->filter_key,
                'is_new' => $category->is_new,
                'is_active' => $category->is_active,
                'sort_order' => $category->sort_order,
                'cover_image_url' => $this->publicUrl($category->cover_image_path),
            ],
        ]);
    }

    public function updateCategory(Request $request, ChallengeHubCategory $category): RedirectResponse
    {
        $data = $request->validate([
            'label' => 'required|string|max:255',
            'is_new' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer|min:0|max:65535',
        ]);

        $slug = $this->uniqueChallengeHubCategorySlug($data['label'], $category->id);
        $filterKey = $this->uniqueChallengeHubCategoryFilterKey($data['label'], $category->id);

        $category->update([
            'slug' => $slug,
            'label' => $data['label'],
            'icon' => $category->icon !== '' ? $category->icon : 'layers',
            'filter_key' => $filterKey,
            'is_new' => $data['is_new'] ?? false,
            'is_active' => $data['is_active'] ?? true,
            'sort_order' => $data['sort_order'] ?? $category->sort_order,
        ]);

        return redirect()->route('admin.challenge-hub.categories.edit', $category->fresh()->slug)
            ->with('success', 'Category updated.');
    }

    public function uploadCategoryCover(Request $request, ChallengeHubCategory $category, ChallengeHubImageService $images): RedirectResponse
    {
        $request->validate([
            'cover_image' => 'required|image|max:10240',
        ]);

        try {
            $dir = 'challenge-hub/categories/'.$category->id;
            $filename = 'cover-upload-'.time();
            if ($category->cover_image_path) {
                $images->deleteIfExists($category->cover_image_path);
            }
            $file = $request->file('cover_image');
            if (! $file) {
                return redirect()->back()->with('error', 'No file received.');
            }
            $path = $images->storeUploadedCover($file, $dir, $filename);
            $category->update(['cover_image_path' => $path]);
        } catch (RuntimeException $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }

        return redirect()->route('admin.challenge-hub.categories.edit', $category->fresh()->slug)
            ->with('success', 'Category image uploaded.');
    }

    public function generateCategoryCover(Request $request, ChallengeHubCategory $category, ChallengeHubImageService $images): RedirectResponse
    {
        $data = $request->validate([
            'prompt' => 'required|string|min:12|max:2000',
        ]);

        try {
            $dir = 'challenge-hub/categories/'.$category->id;
            $filename = 'cover-'.time();
            if ($category->cover_image_path) {
                $images->deleteIfExists($category->cover_image_path);
            }
            $path = $images->generateAndStore($data['prompt'], $dir, $filename);
            $category->update(['cover_image_path' => $path]);
        } catch (RuntimeException $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }

        return redirect()->route('admin.challenge-hub.categories.edit', $category->fresh()->slug)
            ->with('success', 'Category image generated.');
    }

    protected function uniqueChallengeHubCategorySlug(string $label, ?int $exceptCategoryId = null): string
    {
        return $this->uniqueSlugFromLabel($label, ChallengeHubCategory::class, 'category', $exceptCategoryId);
    }

    protected function uniqueLevelUpTrackSlug(string $name, ?int $exceptTrackId = null): string
    {
        return $this->uniqueSlugFromLabel($name, LevelUpTrack::class, 'track', $exceptTrackId);
    }

    /**
     * @param  class-string<ChallengeHubCategory|LevelUpTrack>  $modelClass
     */
    protected function uniqueSlugFromLabel(string $label, string $modelClass, string $fallbackWord, ?int $exceptId = null): string
    {
        $base = Str::slug($label);
        if ($base === '') {
            $base = $fallbackWord;
        }
        $base = mb_substr($base, 0, 64);

        $candidate = $base;
        $n = 2;
        while (
            $modelClass::query()
                ->where('slug', $candidate)
                ->when($exceptId !== null, fn ($q) => $q->where('id', '!=', $exceptId))
                ->exists()
        ) {
            $suffix = '-'.$n;
            $maxBaseLen = 64 - mb_strlen($suffix);
            $candidate = mb_substr($base, 0, max(1, $maxBaseLen)).$suffix;
            $n++;
        }

        return $candidate;
    }

    protected function publicUrl(?string $path): ?string
    {
        if (! is_string($path) || $path === '') {
            return null;
        }

        return Storage::disk('public')->url($path);
    }

    /**
     * @return array{hub_categories: list<array{id: int, label: string, slug: string}>, subcategories_by_category: array<string, list<string>>}
     */
    protected function challengeHubPickerProps(): array
    {
        $hubCategories = ChallengeHubCategory::query()
            ->with(['quizSubcategories' => fn ($q) => $q->orderBy('sort_order')->orderBy('name')])
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['id', 'label', 'slug']);

        $hubCategoryRows = $hubCategories->map(fn (ChallengeHubCategory $c) => [
            'id' => $c->id,
            'label' => $c->label,
            'slug' => $c->slug,
        ])->values()->all();

        $subcategoriesByCategory = [];
        foreach ($hubCategories as $c) {
            $subcategoriesByCategory[$c->label] = $c->quizSubcategories->pluck('name')->values()->all();
        }

        return [
            'hub_categories' => $hubCategoryRows,
            'subcategories_by_category' => $subcategoriesByCategory,
        ];
    }

    protected function quizSubcategoryExistsForHubId(int $hubId, string $name): bool
    {
        $name = trim($name);
        if ($name === '') {
            return false;
        }

        return ChallengeQuizSubcategory::query()
            ->where('challenge_hub_category_id', $hubId)
            ->where('name', $name)
            ->exists();
    }

    protected function quizSubcategoryExistsForHubLabel(string $categoryLabel, string $subcategoryName): bool
    {
        $hub = ChallengeHubCategory::query()->where('label', $categoryLabel)->first();
        if (! $hub) {
            return false;
        }

        return $this->quizSubcategoryExistsForHubId($hub->id, $subcategoryName);
    }

    protected function uniqueChallengeHubCategoryFilterKey(string $label, ?int $exceptCategoryId = null): string
    {
        $base = Str::slug($label, '_');
        if ($base === '') {
            $base = 'category';
        }
        $base = mb_substr($base, 0, 64);

        $candidate = $base;
        $n = 2;
        while (
            ChallengeHubCategory::query()
                ->where('filter_key', $candidate)
                ->when($exceptCategoryId !== null, fn ($q) => $q->where('id', '!=', $exceptCategoryId))
                ->exists()
        ) {
            $suffix = '_'.$n;
            $maxBaseLen = 64 - mb_strlen($suffix);
            $candidate = mb_substr($base, 0, max(1, $maxBaseLen)).$suffix;
            $n++;
        }

        return $candidate;
    }
}
