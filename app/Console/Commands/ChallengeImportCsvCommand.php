<?php

namespace App\Console\Commands;

use App\Models\ChallengeQuestion;
use App\Support\ChallengeQuestionHasher;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ChallengeImportCsvCommand extends Command
{
    protected $signature = 'challenge:import-csv
                            {path? : Path to CSV (default: database/data/challenge_questions_clean_unique.csv)}
                            {--category= : Only import rows where category matches (e.g. Faith)}';

    protected $description = 'Import challenge questions from CSV with content_hash deduplication.';

    public function handle(): int
    {
        $path = $this->argument('path') ?: database_path('data/challenge_questions_clean_unique.csv');

        if (! is_readable($path)) {
            $this->error('File not readable: '.$path);

            return self::FAILURE;
        }

        $filterCategory = $this->option('category') ? trim((string) $this->option('category')) : null;

        $handle = fopen($path, 'rb');
        if ($handle === false) {
            $this->error('Could not open file.');

            return self::FAILURE;
        }

        $header = fgetcsv($handle);
        if ($header === false) {
            fclose($handle);
            $this->error('Empty CSV.');

            return self::FAILURE;
        }

        $header = array_map(fn ($h) => strtolower(trim((string) $h)), $header);
        $expected = ['category', 'subcategory', 'question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'explanation', 'difficulty'];
        foreach ($expected as $col) {
            if (! in_array($col, $header, true)) {
                fclose($handle);
                $this->error('Missing column: '.$col);

                return self::FAILURE;
            }
        }

        $idx = array_flip($header);
        $inserted = 0;
        $skipped = 0;

        DB::beginTransaction();
        try {
            while (($row = fgetcsv($handle)) !== false) {
                if (count($row) < count($header)) {
                    continue;
                }
                $category = trim((string) ($row[$idx['category']] ?? ''));
                if ($category === '') {
                    continue;
                }
                if ($filterCategory !== null && strcasecmp($category, $filterCategory) !== 0) {
                    continue;
                }

                $question = trim((string) ($row[$idx['question']] ?? ''));
                $oa = trim((string) ($row[$idx['option_a']] ?? ''));
                $ob = trim((string) ($row[$idx['option_b']] ?? ''));
                $oc = trim((string) ($row[$idx['option_c']] ?? ''));
                $od = trim((string) ($row[$idx['option_d']] ?? ''));
                $correct = strtoupper(trim((string) ($row[$idx['correct_answer']] ?? '')));
                if ($question === '' || ! in_array($correct, ['A', 'B', 'C', 'D'], true)) {
                    $skipped++;

                    continue;
                }

                $hash = ChallengeQuestionHasher::hash($category, $question, $oa, $ob, $oc, $od);

                $exists = ChallengeQuestion::query()->where('content_hash', $hash)->exists();
                if ($exists) {
                    $skipped++;

                    continue;
                }

                ChallengeQuestion::create([
                    'category' => $category,
                    'subcategory' => trim((string) ($row[$idx['subcategory']] ?? '')) ?: null,
                    'question' => $question,
                    'option_a' => $oa,
                    'option_b' => $ob,
                    'option_c' => $oc,
                    'option_d' => $od,
                    'correct_option' => $correct,
                    'explanation' => trim((string) ($row[$idx['explanation']] ?? '')) ?: null,
                    'difficulty' => trim((string) ($row[$idx['difficulty']] ?? '')) ?: null,
                    'source' => ChallengeQuestion::SOURCE_CSV,
                    'content_hash' => $hash,
                ]);
                $inserted++;
            }
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            fclose($handle);
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        fclose($handle);

        $this->info("Inserted: {$inserted}, skipped (duplicate/invalid): {$skipped}");

        return self::SUCCESS;
    }
}
