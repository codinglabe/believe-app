<?php

namespace App\Services;

use App\Models\ChallengeQuestion;
use App\Support\ChallengeQuestionHasher;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class ChallengeQuestionGeneratorService
{
    public function __construct(
        protected OpenAiService $openAi,
    ) {}

    /**
     * Generate and persist new Faith (or other) questions when the pool is empty.
     * Respects per-user per-category daily batch cap.
     *
     * @return int Number of new rows inserted
     */
    public function generateBatchIfAllowed(int $userId, string $category, ?string $subcategory = null): int
    {
        $category = trim($category);
        if ($category === '') {
            return 0;
        }

        $maxBatches = (int) config('services.challenge_quiz.max_openai_batches_per_user_category_per_day', 20);
        $cacheKey = sprintf('challenge_quiz_ai_batches:%d:%s:%s', $userId, $category, now()->toDateString());
        $used = (int) Cache::get($cacheKey, 0);
        if ($used >= $maxBatches) {
            Log::info('Challenge quiz OpenAI batch cap reached', ['user_id' => $userId, 'category' => $category]);

            return 0;
        }

        if (! config('services.openai.api_key')) {
            Log::warning('Challenge quiz OpenAI skipped: no API key');

            return 0;
        }

        $batchSize = (int) config('services.challenge_quiz.openai_batch_size', 8);
        $model = (string) config('services.challenge_quiz.model', 'gpt-4o-mini');
        $maxTokens = (int) config('services.challenge_quiz.max_output_tokens', 4096);

        $subHint = $subcategory ? " Prefer subcategory: {$subcategory}." : '';

        $messages = [
            [
                'role' => 'system',
                'content' => 'You output only JSON. No markdown. The JSON must match the user schema exactly.',
            ],
            [
                'role' => 'user',
                'content' => <<<PROMPT
Create exactly {$batchSize} unique multiple-choice quiz questions for educational quizzes.
Category (exact string): "{$category}".{$subHint}
Each question must have four options (A–D), one correct answer, a short explanation, and difficulty Easy/Medium/Hard.
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
        foreach ($decoded['questions'] as $row) {
            if (! $this->isValidRow($row, $category)) {
                continue;
            }

            $hash = ChallengeQuestionHasher::hash(
                $row['category'],
                $row['question'],
                $row['option_a'],
                $row['option_b'],
                $row['option_c'],
                $row['option_d'],
            );

            $correct = strtoupper((string) $row['correct_option']);
            try {
                ChallengeQuestion::create([
                    'category' => $row['category'],
                    'subcategory' => $row['subcategory'] ?? null,
                    'question' => $row['question'],
                    'option_a' => $row['option_a'],
                    'option_b' => $row['option_b'],
                    'option_c' => $row['option_c'],
                    'option_d' => $row['option_d'],
                    'correct_option' => $correct,
                    'explanation' => $row['explanation'] ?? null,
                    'difficulty' => $row['difficulty'] ?? null,
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
            Cache::put($cacheKey, $used + 1, now()->endOfDay());
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
}
