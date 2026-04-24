<?php

namespace App\Services;

use App\Models\ChallengeHubCategory;
use App\Models\ChallengeQuestion;
use App\Models\ChallengeQuizSubcategory;
use App\Support\ChallengeQuestionHasher;
use App\Support\ProfileReligions;
use Illuminate\Database\QueryException;
use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\IOFactory;

/**
 * Fixed header row (do not rename or reorder). Each data row sets category, subcategory, religion, difficulty in the file.
 */
final class ChallengeQuestionImportService
{
    private const REQUIRED_HEADERS = [
        'category',
        'subcategory',
        'question',
        'option_a',
        'option_b',
        'option_c',
        'option_d',
        'correct_answer',
    ];

    private const OPTIONAL_HEADERS = ['religion', 'explanation', 'difficulty'];

    /**
     * @return array{
     *     inserted: int,
     *     skipped_duplicates: int,
     *     skipped_invalid: int,
     *     errors: list<array{row: int, message: string}>
     * }
     */
    public function import(UploadedFile $file): array
    {
        $realPath = $file->getRealPath();
        if (! is_string($realPath) || $realPath === '' || ! is_readable($realPath)) {
            throw new \InvalidArgumentException('Could not read the uploaded file.');
        }

        $extension = strtolower((string) $file->getClientOriginalExtension());

        $rows = match ($extension) {
            'csv', 'txt' => $this->parseCsv($realPath),
            'xlsx', 'xls' => $this->parseExcel($realPath),
            default => throw new \InvalidArgumentException('Use a .csv, .xlsx, or .xls file.'),
        };

        return $this->processRows($rows);
    }

    /**
     * @return list<array{row: int, cells: array<string, string>}>
     */
    private function parseCsv(string $path): array
    {
        $handle = fopen($path, 'rb');
        if ($handle === false) {
            throw new \InvalidArgumentException('Could not open CSV.');
        }

        $header = fgetcsv($handle);
        if ($header === false) {
            fclose($handle);

            throw new \InvalidArgumentException('Empty CSV.');
        }

        $header = array_map(fn ($h) => $this->stripBom(strtolower(trim((string) $h))), $header);
        $index = $this->buildColumnIndex($header);

        $out = [];
        $line = 2;
        while (($row = fgetcsv($handle)) !== false) {
            $cells = $this->extractRowCells($index, $row);
            $out[] = ['row' => $line, 'cells' => $cells];
            $line++;
        }

        fclose($handle);

        return $out;
    }

    /**
     * @return list<array{row: int, cells: array<string, string>}>
     */
    private function parseExcel(string $path): array
    {
        try {
            $spreadsheet = IOFactory::load($path);
        } catch (\Throwable $e) {
            throw new \InvalidArgumentException('Could not read spreadsheet: '.$e->getMessage());
        }

        $sheet = $spreadsheet->getActiveSheet();
        $raw = $sheet->toArray(null, true, true, false);
        if ($raw === [] || ($raw[0] ?? []) === []) {
            throw new \InvalidArgumentException('Empty spreadsheet.');
        }

        $headerRow = array_shift($raw);
        $header = [];
        foreach ($headerRow as $cell) {
            $header[] = $this->stripBom(strtolower(trim($this->cellToString($cell))));
        }

        $index = $this->buildColumnIndex($header);

        $out = [];
        $line = 2;
        foreach ($raw as $row) {
            if (! is_array($row)) {
                $line++;

                continue;
            }
            $cells = $this->extractRowCellsFromList($index, $row);
            $out[] = ['row' => $line, 'cells' => $cells];
            $line++;
        }

        return $out;
    }

    /**
     * @param  list<string>  $header
     * @return array<string, int>
     */
    private function buildColumnIndex(array $header): array
    {
        $map = [];
        foreach ($header as $i => $raw) {
            $key = $this->canonicalHeaderKey((string) $raw);
            if ($key === '') {
                continue;
            }
            if (! isset($map[$key])) {
                $map[$key] = $i;
            }
        }

        foreach (self::REQUIRED_HEADERS as $req) {
            if (! isset($map[$req])) {
                throw new \InvalidArgumentException(
                    'Missing column: '.$req.'. Download the template — required headers: '.
                    implode(', ', array_merge(self::REQUIRED_HEADERS, self::OPTIONAL_HEADERS)).'.'
                );
            }
        }

        return $map;
    }

    private function canonicalHeaderKey(string $raw): string
    {
        $h = strtolower(trim($raw));
        $h = $this->stripBom($h);

        return match ($h) {
            'correct', 'correct_option', 'answer' => 'correct_answer',
            default => $h,
        };
    }

    private function stripBom(string $s): string
    {
        if (str_starts_with($s, "\xEF\xBB\xBF")) {
            return substr($s, 3);
        }

        return $s;
    }

    /**
     * @param  array<string, int>  $index
     * @param  list<string|null>  $row
     * @return array<string, string>
     */
    private function extractRowCells(array $index, array $row): array
    {
        $cells = [];
        foreach (array_merge(self::REQUIRED_HEADERS, self::OPTIONAL_HEADERS) as $col) {
            if (! isset($index[$col])) {
                $cells[$col] = '';

                continue;
            }
            $i = $index[$col];
            $cells[$col] = trim((string) ($row[$i] ?? ''));
        }

        return $cells;
    }

    /**
     * @param  array<string, int>  $index
     * @param  array<int, mixed>  $row
     * @return array<string, string>
     */
    private function extractRowCellsFromList(array $index, array $row): array
    {
        $cells = [];
        foreach (array_merge(self::REQUIRED_HEADERS, self::OPTIONAL_HEADERS) as $col) {
            if (! isset($index[$col])) {
                $cells[$col] = '';

                continue;
            }
            $i = $index[$col];
            $cells[$col] = trim($this->cellToString($row[$i] ?? null));
        }

        return $cells;
    }

    private function cellToString(mixed $cell): string
    {
        if ($cell === null) {
            return '';
        }
        if (is_scalar($cell)) {
            return trim((string) $cell);
        }
        if (is_object($cell) && method_exists($cell, '__toString')) {
            return trim((string) $cell);
        }

        return '';
    }

    /**
     * @param  list<array{row: int, cells: array<string, string>}>  $rows
     * @return array{
     *     inserted: int,
     *     skipped_duplicates: int,
     *     skipped_invalid: int,
     *     errors: list<array{row: int, message: string}>
     * }
     */
    private function processRows(array $rows): array
    {
        $inserted = 0;
        $skippedDuplicates = 0;
        $skippedInvalid = 0;
        $errors = [];

        foreach ($rows as $item) {
            $rowNum = $item['row'];
            $d = $item['cells'];

            if ($this->rowIsEmpty($d)) {
                continue;
            }

            $message = $this->validateRow($d);
            if ($message !== null) {
                $skippedInvalid++;
                $errors[] = ['row' => $rowNum, 'message' => $message];

                continue;
            }

            $category = trim($d['category']);
            $subTrim = trim($d['subcategory']);
            $question = trim($d['question']);
            $oa = trim($d['option_a']);
            $ob = trim($d['option_b']);
            $oc = trim($d['option_c']);
            $od = trim($d['option_d']);
            $correct = strtoupper(trim($d['correct_answer']));

            $religionRaw = trim($d['religion'] ?? '');
            $religionNorm = $religionRaw !== '' ? ProfileReligions::nullableAllowed($religionRaw) : null;

            $difficultyRaw = trim($d['difficulty'] ?? '');
            $difficultyNorm = $difficultyRaw !== '' ? $difficultyRaw : null;

            $hash = ChallengeQuestionHasher::hash($category, $question, $oa, $ob, $oc, $od, $religionNorm);

            if (ChallengeQuestion::query()->where('content_hash', $hash)->exists()) {
                $skippedDuplicates++;

                continue;
            }

            try {
                $expl = trim($d['explanation']);

                ChallengeQuestion::create([
                    'category' => $category,
                    'subcategory' => $subTrim,
                    'religion' => $religionNorm,
                    'question' => $question,
                    'option_a' => $oa,
                    'option_b' => $ob,
                    'option_c' => $oc,
                    'option_d' => $od,
                    'correct_option' => $correct,
                    'explanation' => $expl !== '' ? $expl : null,
                    'difficulty' => $difficultyNorm,
                    'source' => ChallengeQuestion::SOURCE_CSV,
                    'content_hash' => $hash,
                ]);
                $inserted++;
            } catch (QueryException $e) {
                if (str_contains($e->getMessage(), 'content_hash')) {
                    $skippedDuplicates++;

                    continue;
                }
                $skippedInvalid++;
                $errors[] = ['row' => $rowNum, 'message' => 'Could not save row (database error).'];
            }
        }

        return [
            'inserted' => $inserted,
            'skipped_duplicates' => $skippedDuplicates,
            'skipped_invalid' => $skippedInvalid,
            'errors' => $errors,
        ];
    }

    /**
     * @param  array<string, string>  $d
     */
    private function rowIsEmpty(array $d): bool
    {
        foreach ($d as $v) {
            if (trim($v) !== '') {
                return false;
            }
        }

        return true;
    }

    /**
     * @param  array<string, string>  $d
     */
    private function validateRow(array $d): ?string
    {
        $category = trim($d['category'] ?? '');
        $sub = trim($d['subcategory'] ?? '');
        $question = trim($d['question'] ?? '');
        $oa = trim($d['option_a'] ?? '');
        $ob = trim($d['option_b'] ?? '');
        $oc = trim($d['option_c'] ?? '');
        $od = trim($d['option_d'] ?? '');
        $correctRaw = trim($d['correct_answer'] ?? '');
        $explanation = $d['explanation'] ?? '';
        $religionRaw = trim($d['religion'] ?? '');
        $difficultyRaw = trim($d['difficulty'] ?? '');

        if ($category === '') {
            return 'Category is required.';
        }
        if (mb_strlen($category) > 128) {
            return 'Category must be 128 characters or fewer.';
        }
        if ($sub === '') {
            return 'Subcategory is required.';
        }
        if (mb_strlen($sub) > 128) {
            return 'Subcategory must be 128 characters or fewer.';
        }

        if (! ChallengeHubCategory::query()->where('label', $category)->exists()) {
            return 'Unknown hub category (label must match Challenge Hub → Categories exactly).';
        }

        if (! $this->subcategoryExistsForHubLabel($category, $sub)) {
            return 'Subcategory is not defined for this hub (Challenge Hub → Subcategories).';
        }

        if ($religionRaw !== '' && ProfileReligions::nullableAllowed($religionRaw) === null) {
            return 'religion must be empty or one of: '.implode(', ', ProfileReligions::values()).'.';
        }

        if ($difficultyRaw !== '' && ! in_array($difficultyRaw, ['Easy', 'Medium', 'Hard'], true)) {
            return 'difficulty must be empty, Easy, Medium, or Hard.';
        }

        if ($question === '') {
            return 'Question text is required.';
        }
        if (mb_strlen($question) > 65000) {
            return 'Question text is too long (max 65000 characters).';
        }

        foreach (['A' => $oa, 'B' => $ob, 'C' => $oc, 'D' => $od] as $label => $opt) {
            if ($opt === '') {
                return "Option {$label} is required.";
            }
            if (mb_strlen($opt) > 512) {
                return "Option {$label} must be 512 characters or fewer.";
            }
        }

        $correct = strtoupper($correctRaw);
        if (! in_array($correct, ['A', 'B', 'C', 'D'], true)) {
            return 'correct_answer must be A, B, C, or D.';
        }

        if (mb_strlen($explanation) > 10000) {
            return 'Explanation must be 10000 characters or fewer.';
        }

        return null;
    }

    private function subcategoryExistsForHubLabel(string $categoryLabel, string $subcategoryName): bool
    {
        $hub = ChallengeHubCategory::query()->where('label', $categoryLabel)->first();
        if (! $hub) {
            return false;
        }

        return ChallengeQuizSubcategory::query()
            ->where('challenge_hub_category_id', $hub->id)
            ->where('name', $subcategoryName)
            ->exists();
    }
}
