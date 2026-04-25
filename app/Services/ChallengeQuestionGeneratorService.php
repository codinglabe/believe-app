<?php

namespace App\Services;

use App\Models\ChallengeQuestion;
use App\Models\ScriptureVerse;
use App\Support\ChallengeQuestionHasher;
use App\Support\ProfileReligions;
use Illuminate\Database\QueryException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ChallengeQuestionGeneratorService
{
    public function __construct(
        protected OpenAiService $openAi,
        protected ChallengeGroundingService $grounding,
    ) {}

    /**
     * Build multiple-choice questions from `scripture_verses` + `scripture_books`.
     * Options are always your DB references; with OPENAI + stem refiner on, one small batched call rewrites the stem/explanation (cheaper than full `generateBatchIfAllowed`).
     *
     * @return int Rows inserted
     */
    public function generateScriptureBatchIfAllowed(
        int $userId,
        string $category,
        ?string $subcategory = null,
        ?string $forceDifficultyCanonical = null,
        bool $practiceVariety = false,
        ?string $hubChallengeTitle = null,
        ?string $hubChallengeDescription = null,
        ?string $userReligionRaw = null,
    ): int {
        if (! config('services.challenge_quiz.scripture_mcq_enabled', true)) {
            return 0;
        }

        $category = trim($category);
        if ($category === '') {
            return 0;
        }

        $religionStored = ProfileReligions::nullableAllowed($userReligionRaw);
        $subTrim = is_string($subcategory) ? trim($subcategory) : '';
        $topicLabels = $subTrim !== '' ? [$subTrim, $category] : [$category];
        $topicLabels = $this->expandHubTopicLabelsForScriptureMcq($topicLabels);

        $q = $this->grounding->scriptureVerseQueryForHub($topicLabels, $religionStored);
        $count = (clone $q)->count();
        if ($count < 4) {
            return 0;
        }

        $pool = $q->inRandomOrder()->limit(min(500, max(20, $count)))->get();
        if ($pool->count() < 4) {
            return 0;
        }

        $batchSize = max(1, (int) config('services.challenge_quiz.openai_batch_size', 8));
        $forcedDiff = is_string($forceDifficultyCanonical) ? trim($forceDifficultyCanonical) : '';
        $forcedSub = $subTrim !== '' ? $subTrim : null;
        $attempts = 0;
        $maxAttempts = $batchSize * 20;

        /** @var list<array{excerpt: string, refs: list<string>, verse: ScriptureVerse, sameBook: bool}> $packs */
        $packs = [];
        while (count($packs) < $batchSize && $attempts < $maxAttempts) {
            $attempts++;
            if ($pool->count() < 4) {
                break;
            }
            $quartet = $this->sampleFourVerses($pool);
            if ($quartet === null) {
                break;
            }
            $refStrings = $quartet->map(fn (ScriptureVerse $v) => $this->formatScriptureReference($v))->all();
            if (count(array_unique($refStrings)) < 4) {
                continue;
            }
            $correct = $quartet->first();
            if (! $correct->relationLoaded('book')) {
                $correct->load('book');
            }
            if (! $correct->book) {
                continue;
            }
            $correctRef = $this->formatScriptureReference($correct);
            $wrong = $quartet->skip(1)->values();
            if ($wrong->count() < 3) {
                continue;
            }
            $excerpt = $this->verseExcerptForQuestion($correct->text);
            if ($excerpt === '') {
                continue;
            }
            $refs = [
                $correctRef,
                $this->formatScriptureReference($wrong[0]),
                $this->formatScriptureReference($wrong[1]),
                $this->formatScriptureReference($wrong[2]),
            ];
            $sameBookDistractors = $quartet->pluck('scripture_book_id')->unique()->count() === 1;
            $packs[] = [
                'excerpt' => $excerpt,
                'refs' => $refs,
                'verse' => $correct,
                'sameBook' => $sameBookDistractors,
            ];
        }

        if ($packs === []) {
            return 0;
        }

        $refined = $this->refineScriptureStemsWithOpenAiBatched(
            $packs,
            $category,
            $userId
        );
        $usedStemRefiner = is_array($refined);
        if (! $usedStemRefiner) {
            $refined = [];
        }

        $inserted = 0;
        foreach ($packs as $idx => $pack) {
            $correctRef = $this->formatScriptureReference($pack['verse']);
            $qText = (isset($refined[$idx]) && is_array($refined[$idx]) && is_string($refined[$idx]['q']) && trim($refined[$idx]['q']) !== '')
                ? trim($refined[$idx]['q'])
                : $this->composeScriptureMcqQuestion($pack['excerpt']);
            $expl = (isset($refined[$idx]) && is_array($refined[$idx]) && is_string($refined[$idx]['e']) && trim($refined[$idx]['e']) !== '')
                ? trim($refined[$idx]['e'])
                : $this->buildScriptureMcqExplanation($pack['verse'], $correctRef);

            $row = [
                'category' => $category,
                'subcategory' => $forcedSub,
                'question' => $qText,
                'option_a' => $pack['refs'][0],
                'option_b' => $pack['refs'][1],
                'option_c' => $pack['refs'][2],
                'option_d' => $pack['refs'][3],
                'correct_option' => 'A',
                'explanation' => $expl,
                'difficulty' => $this->scriptureQuestionDifficulty($forcedDiff, $practiceVariety, (bool) $pack['sameBook']),
            ];
            if (! $this->isValidRow($row, $category)) {
                continue;
            }
            if ($forcedDiff !== '') {
                $row['difficulty'] = in_array($forcedDiff, ['Easy', 'Medium', 'Hard'], true) ? $forcedDiff : 'Medium';
            }
            $row = $this->shuffleStoredOptions($row);

            $hash = ChallengeQuestionHasher::hash(
                $row['category'],
                $row['question'],
                $row['option_a'],
                $row['option_b'],
                $row['option_c'],
                $row['option_d'],
                $religionStored,
            );

            try {
                ChallengeQuestion::create([
                    'category' => $row['category'],
                    'religion' => $religionStored,
                    'subcategory' => $forcedSub,
                    'question' => $row['question'],
                    'option_a' => $row['option_a'],
                    'option_b' => $row['option_b'],
                    'option_c' => $row['option_c'],
                    'option_d' => $row['option_d'],
                    'correct_option' => strtoupper((string) $row['correct_option']),
                    'explanation' => $row['explanation'] ?? null,
                    'difficulty' => $row['difficulty'] ?? null,
                    'source' => ChallengeQuestion::SOURCE_SCRIPTURE,
                    'content_hash' => $hash,
                ]);
                $inserted++;
            } catch (QueryException) {
                continue;
            }
        }

        if ($inserted > 0) {
            Log::info('Challenge quiz scripture MCQ batch', [
                'user_id' => $userId,
                'inserted' => $inserted,
                'category' => $category,
                'stem_refiner' => $usedStemRefiner,
            ]);
        }

        return $inserted;
    }

    /**
     * One low-token OpenAI call: rewrites `question` + one-line `explanation` for each item; a–d = exact references from the DB. Returns null to fall back to local templates for all.
     *
     * @param  list<array{excerpt: string, refs: list<string>, verse: ScriptureVerse, sameBook: bool}>  $packs
     * @return list<array{q: string, e: string}>|null
     */
    protected function refineScriptureStemsWithOpenAiBatched(
        array $packs,
        string $category,
        int $userId,
    ): ?array {
        if ($packs === [] || ! (bool) config('services.challenge_quiz.scripture_stem_refiner_enabled', true)) {
            return null;
        }
        if (empty(config('services.openai.api_key'))) {
            return null;
        }

        $maxExcerpt = max(120, (int) config('services.challenge_quiz.scripture_stem_refiner_excerpt_max_chars', 320));
        $model = trim((string) config('services.challenge_quiz.scripture_stem_refiner_model', 'gpt-3.5-turbo'));
        if ($model === '') {
            $model = 'gpt-3.5-turbo';
        }
        $maxOut = (int) config('services.challenge_quiz.scripture_stem_refiner_max_output_tokens', 2200);
        if ($maxOut < 500) {
            $maxOut = 2200;
        }

        $items = [];
        foreach ($packs as $i => $pack) {
            /** @var ScriptureVerse $v */
            $v = $pack['verse'];
            $e = $this->verseExcerptForQuestion($v->text, $maxExcerpt);
            if ($e === '') {
                $e = trim($pack['excerpt']);
            }
            $r = $pack['refs'];
            if (count($r) < 4) {
                return null;
            }
            $items[] = [
                'i' => $i,
                'e' => $e,
                'a' => $r[0],
                'b' => $r[1],
                'c' => $r[2],
                'd' => $r[3],
                'ok' => 'A',
            ];
        }
        $payload = json_encode(['c' => $category, 'items' => $items], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($payload === false) {
            return null;
        }

        $messages = [
            [
                'role' => 'system',
                'content' => <<<'SYS'
You output only JSON, no markdown.

This is a multiple-choice quiz where the ONLY possible answers are four scripture location labels (the strings in fields a, b, c, d — book/chapter/verse or surah:ayah). Field "ok" is the single correct label among A/B/C/D for the text in "e".

For each item you must return "q" and "x":
- "q" (question text): Write one professional, clear educational line in English. The learner is choosing WHICH REFERENCE the quoted passage comes from. Lead with a natural phrase such as: "In which of the following passages is this found?" or "The following is recorded in which location?" or "This text appears at which reference?" You may add one short lead-in that describes the content (e.g. messengers reporting to Job) ONLY if the task in the same sentence is still: pick the correct a/b/c/d reference. Do NOT ask a question where the four reference strings would be the wrong type of answer (e.g. never "What disaster…?" or "Who said…?" when the choices are only citations).
- Embed the full text from "e" in straight double quotes inside "q" once. Do not end the quote in the middle of a word; if the excerpt is long, the supplied "e" is already a complete thought — copy it fully.
- "x" (explanation): One professional sentence: state the correct option letter and the reference, and that this passage is found there. No new facts not supported by the quote.
Return shape: {"r":[{"i":0,"q":"...","x":"..."} ...]}. One element per input item; "i" must match.
SYS
            ],
            [
                'role' => 'user',
                'content' => "Educational multiple-choice: identify the correct scripture reference. Category: {$category}. JSON only:\n".$payload,
            ],
        ];

        try {
            $result = $this->openAi->chatCompletionJson($messages, $model, 0.25, $maxOut);
        } catch (\Throwable $e) {
            Log::warning('Challenge quiz scripture stem refiner failed; using local stems.', ['message' => $e->getMessage()]);

            return null;
        }

        $decoded = json_decode($result['content'], true);
        if (! is_array($decoded) || ! isset($decoded['r']) || ! is_array($decoded['r'])) {
            return null;
        }
        $out = [];
        foreach ($decoded['r'] as $row) {
            if (! is_array($row)) {
                return null;
            }
            $i = (int) ($row['i'] ?? -1);
            $q = isset($row['q']) && is_string($row['q']) ? trim($row['q']) : '';
            $x = isset($row['x']) && is_string($row['x']) ? trim($row['x']) : '';
            if ($i < 0) {
                return null;
            }
            $out[$i] = ['q' => $q, 'e' => $x];
        }
        for ($i = 0, $c = count($packs); $i < $c; $i++) {
            if (! isset($out[$i]) || ($out[$i]['q'] === '')) {
                return null;
            }
        }

        Log::info('Challenge quiz scripture stem refiner', array_merge(
            [
                'user_id' => $userId,
                'category' => $category,
                'items' => count($packs),
                'model' => $model,
            ],
            [
                'total_tokens' => $result['total_tokens'] ?? null,
                'prompt_tokens' => $result['prompt_tokens'] ?? null,
                'completion_tokens' => $result['completion_tokens'] ?? null,
            ],
        ));

        $ordered = [];
        for ($i = 0, $c = count($packs); $i < $c; $i++) {
            $ordered[] = $out[$i];
        }

        return $ordered;
    }

    /**
     * Hub UI may use "Scripture" while imports tag books with Bible/Quran/Faith. Broaden OR labels (still scoped by book religion when profile religion is set).
     *
     * @param  list<string>  $labels
     * @return list<string>
     */
    protected function expandHubTopicLabelsForScriptureMcq(array $labels): array
    {
        $extra = [];
        foreach ($labels as $l) {
            $l = trim((string) $l);
            if ($l === '') {
                continue;
            }
            if (strcasecmp($l, 'Scripture') === 0 || strcasecmp($l, 'Scriptures') === 0) {
                $extra = array_merge($extra, [
                    'Bible', 'Biblical', 'Quran', "Qur'an", 'Koran', 'KJV', 'Gospel', 'Old Testament', 'New Testament',
                ]);
            }
        }

        $merged = array_values(array_unique(array_filter(
            array_map('trim', array_merge($labels, $extra)),
            fn (string $t) => $t !== '',
        )));

        return $merged;
    }

    /**
     * Prefer four verses from the same book so options look similar (plausible distractors), like a good written quiz.
     * Falls back to four random verses if no book has enough variety in the pool.
     *
     * @param  Collection<int, ScriptureVerse>  $pool
     * @return Collection<int, ScriptureVerse>|null
     */
    protected function sampleFourVerses(Collection $pool): ?Collection
    {
        if ($pool->count() < 4) {
            return null;
        }

        if (! (bool) config('services.challenge_quiz.scripture_same_book_distractors', true)) {
            return $pool->count() > 4 ? $pool->random(4) : $pool;
        }

        $byBook = $pool->groupBy('scripture_book_id');
        $eligible = $byBook->filter(fn (Collection $verses) => $verses->count() >= 4);
        if ($eligible->isNotEmpty()) {
            $bookId = $eligible->keys()->random();
            $bookVerses = $eligible->get($bookId);
            if ($bookVerses === null) {
                return $pool->count() > 4 ? $pool->random(4) : $pool;
            }

            return $bookVerses->count() > 4 ? $bookVerses->random(4) : $bookVerses;
        }

        return $pool->count() > 4 ? $pool->random(4) : $pool;
    }

    /**
     * Vary the stem so items feel less repetitive than a single template.
     */
    protected function composeScriptureMcqQuestion(string $excerpt): string
    {
        $templates = [
            "Read the text below. Which reference matches it?\n\n\"%s\"",
            "This excerpt appears in exactly one of the answer choices. Which location is it from?\n\n\"%s\"",
            "Match the following to the correct chapter and verse (or surah:ayah where applicable).\n\n\"%s\"",
            "Which option below is the *exact* reference for this text?\n\n\"%s\"",
            "Choose the reference that matches this translation excerpt.\n\n\"%s\"",
            "Where is the following found? Select the right book/chapter/verse from the list.\n\n\"%s\"",
        ];
        $intro = $templates[random_int(0, count($templates) - 1)];

        return str_replace('%s', $excerpt, $intro);
    }

    /**
     * Slightly richer than a bare citation; helps the learner place the verse.
     */
    protected function buildScriptureMcqExplanation(ScriptureVerse $correct, string $correctRef): string
    {
        if (! $correct->relationLoaded('book')) {
            $correct->load('book');
        }
        $b = $correct->book;
        if (! $b) {
            return 'This passage is from '.$correctRef.'.';
        }
        $name = trim((string) ($b->name ?: $b->short_name));
        $trans = trim((string) ($b->translation_label ?? ''));
        if ($trans !== '' && strcasecmp($trans, 'en') !== 0) {
            return 'This text is from '.$name.' ('.$trans.') at '.$correctRef.'.';
        }

        return 'This text is from '.$name.' — '.$correctRef.'.';
    }

    protected function formatScriptureReference(ScriptureVerse $v): string
    {
        if (! $v->relationLoaded('book')) {
            $v->load('book');
        }
        $b = $v->book;
        if (! $b) {
            return 'Verse #'.$v->id;
        }
        $short = trim((string) ($b->short_name ?: $b->name));

        return $short.' '.(int) $v->chapter_number.':'.(int) $v->verse_number;
    }

    /**
     * @param  int  $max  Sentence-aware cap (used for in-app stem; refiner can pass a higher max for OpenAI).
     */
    protected function verseExcerptForQuestion(?string $text, int $max = 220): string
    {
        $t = trim(preg_replace('/\s+/', ' ', (string) $text) ?? '');
        if ($t === '') {
            return '';
        }
        $max = max(60, $max);
        if (mb_strlen($t) <= $max) {
            return $t;
        }
        $slice = mb_substr($t, 0, $max);
        $bestEnd = 0;
        foreach (['. ', '? ', '! ', ".\n", '."', '؟ ', '۔ '] as $p) {
            $pos = mb_strrpos($slice, $p);
            if ($pos !== false && $pos > 35) {
                $end = $pos + mb_strlen($p);
                if ($end > $bestEnd) {
                    $bestEnd = $end;
                }
            }
        }
        if ($bestEnd > 40) {
            return rtrim(mb_substr($t, 0, $bestEnd));
        }
        $e = Str::limit($t, $max, '…');

        return is_string($e) ? $e : $t;
    }

    /**
     * When distractors are from the same book, the item is usually harder (similar-looking references).
     */
    protected function scriptureQuestionDifficulty(
        string $forcedDiff,
        bool $practiceVariety,
        bool $sameBookDistractors = false,
    ): string {
        if (in_array($forcedDiff, ['Easy', 'Medium', 'Hard'], true)) {
            return $forcedDiff;
        }
        if ($practiceVariety) {
            return ['Easy', 'Medium', 'Hard'][random_int(0, 2)];
        }
        if ($sameBookDistractors) {
            return 'Hard';
        }

        return 'Medium';
    }

    /**
     * Generate and persist new questions when the pool is empty (no app-level cache / daily cap).
     *
     * @param  string|null  $forceDifficultyCanonical  Easy|Medium|Hard — all rows use this; null with practiceVariety mixes difficulties.
     * @param  bool  $practiceVariety  When true, prompt asks for a mix of Easy/Medium/Hard (Practice mode).
     * @param  string|null  $hubChallengeTitle  Hub card title (e.g. "Daily Quran") — scopes generation to that challenge.
     * @param  string|null  $hubChallengeDescription  Hub card body text — same.
     * @param  string|null  $userReligionRaw  {@see User::$religion} — tags rows and steers OpenAI away from other traditions.
     * @return int Number of new rows inserted
     */
    public function generateBatchIfAllowed(
        int $userId,
        string $category,
        ?string $subcategory = null,
        ?string $forceDifficultyCanonical = null,
        bool $practiceVariety = false,
        ?string $hubChallengeTitle = null,
        ?string $hubChallengeDescription = null,
        ?string $userReligionRaw = null,
    ): int {
        $category = trim($category);
        if ($category === '') {
            return 0;
        }

        $religionStored = ProfileReligions::nullableAllowed($userReligionRaw);

        if (! config('services.openai.api_key')) {
            Log::warning('Challenge quiz OpenAI skipped: no API key');

            return 0;
        }

        $batchSize = (int) config('services.challenge_quiz.openai_batch_size', 8);
        $model = (string) config('services.challenge_quiz.model', 'gpt-3.5-turbo');
        $maxTokens = (int) config('services.challenge_quiz.max_output_tokens', 4096);

        $subTrim = is_string($subcategory) ? trim($subcategory) : '';
        $subRules = $subTrim !== ''
            ? <<<SUB

Topic scope (required): every question must belong ONLY to this subcategory — use the exact subcategory string "{$subTrim}" on each question row. Do not write questions for other subtopics, other hub challenges, or generic {$category} trivia outside "{$subTrim}". The subcategory field in JSON must be exactly "{$subTrim}" for every item.
SUB
            : "\nVary subcategory strings if helpful; stay within the main category theme.";

        $forcedDiff = is_string($forceDifficultyCanonical) ? trim($forceDifficultyCanonical) : '';
        $difficultyRules = $forcedDiff !== ''
            ? "\nDifficulty (required): every question must have difficulty exactly \"{$forcedDiff}\" (same spelling)."
            : ($practiceVariety
                ? "\nDifficulty: include a balanced mix of Easy, Medium, and Hard questions across the batch; set each row's difficulty field to Easy, Medium, or Hard accordingly."
                : '');

        $titleTrim = is_string($hubChallengeTitle) ? trim($hubChallengeTitle) : '';
        $descTrim = is_string($hubChallengeDescription) ? trim(strip_tags((string) $hubChallengeDescription)) : '';
        $descTrim = $descTrim !== '' ? Str::limit($descTrim, 600, '…') : '';
        $titleTrim = str_replace('"', "'", $titleTrim);
        $descTrim = str_replace('"', "'", $descTrim);
        $challengeFocus = '';
        if ($titleTrim !== '' || $descTrim !== '') {
            $parts = [];
            if ($titleTrim !== '') {
                $parts[] = 'The learner started the hub challenge titled "'.$titleTrim.'".';
            }
            if ($descTrim !== '') {
                $parts[] = 'Challenge description: '.$descTrim;
            }
            $challengeFocus = "\n\nHub challenge focus (required): ".implode(' ', $parts)
                .' Every question and answer must stay on-theme for THIS challenge only — not unrelated '.$category.' trivia that could belong to a different hub card.';
        }

        $traditionAlignment = ProfileReligions::challengeQuizPromptAlignment($religionStored);

        $subForGrounding = $subTrim !== '' ? $subTrim : null;
        $groundingSection = $this->buildGroundingPromptSection($category, $subForGrounding, $religionStored);
        $openAiTokenLog = null;

        $messages = [
            [
                'role' => 'system',
                'content' => 'You output only JSON. No markdown. The JSON must match the user schema exactly.',
            ],
            [
                'role' => 'user',
                'content' => <<<PROMPT
Create exactly {$batchSize} unique multiple-choice quiz questions for educational quizzes.
Category (exact string for every row): "{$category}".{$traditionAlignment}{$challengeFocus}{$subRules}{$difficultyRules}{$groundingSection}
Each question must have four options (A–D), one correct answer, a short explanation, and a difficulty field.
Options must be parallel in style: clear, short sentences or phrases (8–20 words) that a learner can compare; do not use raw "Book 1:2" strings as options unless the GROUNDING block is only about citation recall — prefer meaningful content answers grounded in the passages.
Correct answer distribution (required): across this batch of {$batchSize} questions, spread correct_option roughly evenly across A, B, C, and D. Do not default most answers to A — models often bias toward A; intentionally vary which letter is correct.
Avoid duplicating famous questions verbatim from common trivia apps; vary wording.
Return JSON object: {"questions":[{"category":"{$category}","subcategory":"string","question":"string","option_a":"string","option_b":"string","option_c":"string","option_d":"string","correct_option":"A|B|C|D","explanation":"string","difficulty":"Easy|Medium|Hard"}]}
PROMPT,
            ],
        ];

        try {
            $result = $this->openAi->chatCompletionJson($messages, $model, 0.45, $maxTokens);
            $openAiTokenLog = [
                'total_tokens' => $result['total_tokens'] ?? null,
                'prompt_tokens' => $result['prompt_tokens'] ?? null,
                'completion_tokens' => $result['completion_tokens'] ?? null,
                'finish_reason' => $result['finish_reason'] ?? null,
                'max_output_tokens' => $maxTokens,
            ];
            $decoded = json_decode($result['content'], true);
        } catch (\Throwable $e) {
            Log::error('Challenge quiz OpenAI generation failed', ['message' => $e->getMessage()]);

            return 0;
        }

        if (! is_array($decoded) || ! isset($decoded['questions']) || ! is_array($decoded['questions'])) {
            Log::warning('Challenge quiz OpenAI invalid JSON shape');

            return 0;
        }

        $inserted = 0;
        $forcedSub = $subTrim !== '' ? $subTrim : null;

        foreach ($decoded['questions'] as $row) {
            if (! $this->isValidRow($row, $category)) {
                continue;
            }

            $rowDiff = isset($row['difficulty']) && is_string($row['difficulty']) ? trim($row['difficulty']) : '';
            if ($forcedDiff !== '' && strcasecmp($rowDiff, $forcedDiff) !== 0) {
                continue;
            }

            /** Randomize which column holds the correct answer so LLM “always A” bias does not dominate the bank. */
            $row = $this->shuffleStoredOptions($row);

            $hash = ChallengeQuestionHasher::hash(
                $row['category'],
                $row['question'],
                $row['option_a'],
                $row['option_b'],
                $row['option_c'],
                $row['option_d'],
                $religionStored,
            );

            $correct = strtoupper((string) $row['correct_option']);
            try {
                ChallengeQuestion::create([
                    'category' => $row['category'],
                    'religion' => $religionStored,
                    'subcategory' => $forcedSub ?? ($row['subcategory'] ?? null),
                    'question' => $row['question'],
                    'option_a' => $row['option_a'],
                    'option_b' => $row['option_b'],
                    'option_c' => $row['option_c'],
                    'option_d' => $row['option_d'],
                    'correct_option' => $correct,
                    'explanation' => $row['explanation'] ?? null,
                    'difficulty' => $forcedDiff !== '' ? $forcedDiff : ($row['difficulty'] ?? null),
                    'source' => ChallengeQuestion::SOURCE_OPENAI,
                    'content_hash' => $hash,
                ]);
                $inserted++;
            } catch (QueryException $e) {
                // duplicate hash
                continue;
            }
        }

        if ($inserted > 0) {
            Log::info('Challenge quiz OpenAI batch', array_merge(
                [
                    'user_id' => $userId,
                    'inserted' => $inserted,
                    'category' => $category,
                ],
                is_array($openAiTokenLog) ? $openAiTokenLog : [],
            ));
        } elseif (is_array($openAiTokenLog) && $openAiTokenLog !== [] && (int) ($openAiTokenLog['total_tokens'] ?? 0) > 0) {
            Log::info('Challenge quiz OpenAI call (0 rows stored)', array_merge(
                [
                    'user_id' => $userId,
                    'category' => $category,
                ],
                $openAiTokenLog,
            ));
        }

        return $inserted;
    }

    /**
     * @param  array<string, mixed>  $row
     */
    protected function isValidRow(array $row, string $expectedCategory): bool
    {
        $need = ['question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option'];
        foreach ($need as $k) {
            if (empty($row[$k]) || ! is_string($row[$k])) {
                return false;
            }
        }
        $co = strtoupper(trim((string) $row['correct_option']));
        if (! in_array($co, ['A', 'B', 'C', 'D'], true)) {
            return false;
        }
        $cat = (string) ($row['category'] ?? $expectedCategory);

        return trim($cat) === trim($expectedCategory);
    }

    /**
     * Permute option_a–d randomly and remap correct_option so gameplay sees A/B/C/D equally often over time.
     *
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    protected function shuffleStoredOptions(array $row): array
    {
        $entries = [
            ['orig' => 'A', 'text' => trim((string) $row['option_a'])],
            ['orig' => 'B', 'text' => trim((string) $row['option_b'])],
            ['orig' => 'C', 'text' => trim((string) $row['option_c'])],
            ['orig' => 'D', 'text' => trim((string) $row['option_d'])],
        ];

        shuffle($entries);

        $correct = strtoupper(trim((string) $row['correct_option']));
        $newCorrect = 'A';
        foreach ($entries as $i => $e) {
            if ($e['orig'] === $correct) {
                $newCorrect = chr(ord('A') + $i);

                break;
            }
        }

        return array_merge($row, [
            'option_a' => $entries[0]['text'],
            'option_b' => $entries[1]['text'],
            'option_c' => $entries[2]['text'],
            'option_d' => $entries[3]['text'],
            'correct_option' => $newCorrect,
        ]);
    }

    /**
     * When passages exist for this category/subcategory (+ religion scope), constrain the model to that text only.
     */
    protected function buildGroundingPromptSection(string $category, ?string $subcategory, ?string $profileReligion): string
    {
        if (! config('services.challenge_quiz.grounding.enabled', true)) {
            return '';
        }

        $limit = max(1, (int) config('services.challenge_quiz.grounding.passage_limit', 10));
        $passages = $this->grounding->passagesForChallengePrompt($category, $subcategory, $profileReligion, $limit);
        $formatted = $this->grounding->formatPassagesForStructuredGroundingPrompt($passages);

        if ($formatted === '') {
            return '';
        }

        return "\n\nGROUNDING (required — sole factual source)
The numbered blocks below are loaded from this app's database (imported scripture and/or admin grounding passages) for this hub category. Every question, every correct option, and every wrong option must be faithful to this material. Do not invent references, events, or wording that cannot be supported here.

".$formatted;
    }
}
