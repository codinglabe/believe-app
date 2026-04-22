<?php

namespace App\Services;

use App\Models\ChallengeQuestion;
use App\Support\ChallengeQuestionHasher;
use App\Support\ProfileReligions;
use Illuminate\Database\QueryException;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class ChallengeQuestionGeneratorService
{
    public function __construct(
        protected OpenAiService $openAi,
    ) {}

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

        $messages = [
            [
                'role' => 'system',
                'content' => 'You output only JSON. No markdown. The JSON must match the user schema exactly.',
            ],
            [
                'role' => 'user',
                'content' => <<<PROMPT
Create exactly {$batchSize} unique multiple-choice quiz questions for educational quizzes.
Category (exact string for every row): "{$category}".{$traditionAlignment}{$challengeFocus}{$subRules}{$difficultyRules}
Each question must have four options (A–D), one correct answer, a short explanation, and a difficulty field.
Correct answer distribution (required): across this batch of {$batchSize} questions, spread correct_option roughly evenly across A, B, C, and D. Do not default most answers to A — models often bias toward A; intentionally vary which letter is correct.
Avoid duplicating famous questions verbatim from common trivia apps; vary wording.
Return JSON object: {"questions":[{"category":"{$category}","subcategory":"string","question":"string","option_a":"string","option_b":"string","option_c":"string","option_d":"string","correct_option":"A|B|C|D","explanation":"string","difficulty":"Easy|Medium|Hard"}]}
PROMPT,
            ],
        ];

        try {
            $result = $this->openAi->chatCompletionJson($messages, $model, 0.45, $maxTokens);
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
            Log::info('Challenge quiz OpenAI batch', [
                'user_id' => $userId,
                'inserted' => $inserted,
                'category' => $category,
            ]);
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
}
