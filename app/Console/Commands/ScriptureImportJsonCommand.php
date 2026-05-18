<?php

namespace App\Console\Commands;

use App\Models\ScriptureBook;
use App\Models\ScriptureVerse;
use App\Support\ProfileReligions;
use Illuminate\Console\Command;

/**
 * Bulk-import scripture from a JSON file into `scripture_books` + `scripture_verses`.
 *
 * File format: JSON array of objects, each with chapter, verse, and text (aliases c, v, t allowed):
 * [{"chapter":1,"verse":1,"text":"..."}, ...]
 *
 * Hub labels: use repeatable --topic=Faith --topic=Bible (shell-friendly) and/or --topics='["Faith","Bible"]' JSON.
 */
class ScriptureImportJsonCommand extends Command
{
    protected $signature = 'scripture:import-json
                            {file : Path to JSON file (absolute or relative to base_path())}
                            {identifier : Unique book key, e.g. kjv or quran-en-asad}
                            {--name= : Full book title (defaults to identifier)}
                            {--short-name= : Short label for references (e.g. KJV)}
                            {--religion= : One of profile religions, or omit for universal (any learner)}
                            {--topic=* : Hub category/subcategory label (repeat option for multiple)}
                            {--topics= : Optional JSON array string, e.g. ["Faith","Bible"] (PowerShell/cmd may need care)}
                            {--language= : Optional language code}
                            {--translation= : Optional translation label}';

    protected $description = 'Import scripture verses from JSON (full Bible/Quran/etc.) for challenge quiz grounding.';

    public function handle(): int
    {
        $identifier = trim((string) $this->argument('identifier'));
        if ($identifier === '') {
            $this->error('identifier must not be empty.');

            return self::FAILURE;
        }

        $religionRaw = $this->option('religion');
        $religion = is_string($religionRaw) && trim($religionRaw) !== ''
            ? ProfileReligions::nullableAllowed(trim($religionRaw))
            : null;
        if (is_string($religionRaw) && trim($religionRaw) !== '' && $religion === null) {
            $this->error('Invalid --religion. Allowed: '.implode(', ', ProfileReligions::OPTIONS).' or omit for universal.');

            return self::FAILURE;
        }

        $topicFlags = array_values(array_filter(
            array_map(fn ($t) => trim((string) $t), (array) $this->option('topic')),
            fn (string $t) => $t !== ''
        ));

        $topicsJson = $this->option('topics');
        $topicsFromJson = [];
        if (is_string($topicsJson) && trim($topicsJson) !== '') {
            $decoded = json_decode(trim($topicsJson), true);
            if (! is_array($decoded)) {
                $this->error('--topics must be valid JSON array, e.g. ["Faith","Quran"]');

                return self::FAILURE;
            }
            $topicsFromJson = array_values(array_filter($decoded, fn ($t) => is_string($t) && trim($t) !== ''));
            if ($topicsFromJson === []) {
                $this->error('--topics array must contain at least one non-empty string label.');

                return self::FAILURE;
            }
        }

        $topics = array_values(array_unique(array_merge($topicFlags, $topicsFromJson)));
        if ($topics === []) {
            $this->warn('No --topic / --topics: grounding will not match this book until you update scripture_books.topics.');
        }

        $fileArg = (string) $this->argument('file');
        $path = $fileArg;
        if (! is_file($path)) {
            $path = base_path($fileArg);
        }
        if (! is_readable($path)) {
            $this->error("File not found or not readable: {$fileArg}");

            return self::FAILURE;
        }

        $raw = file_get_contents($path);
        if ($raw === false) {
            $this->error('Could not read file.');

            return self::FAILURE;
        }

        $data = json_decode($raw, true);
        if (! is_array($data)) {
            $this->error('JSON root must be an array of {chapter, verse, text} objects.');

            return self::FAILURE;
        }

        $name = is_string($this->option('name')) && trim($this->option('name')) !== ''
            ? trim($this->option('name'))
            : $identifier;
        $shortName = is_string($this->option('short-name')) && trim($this->option('short-name')) !== ''
            ? trim($this->option('short-name'))
            : null;
        $language = is_string($this->option('language')) && trim($this->option('language')) !== ''
            ? trim($this->option('language'))
            : null;
        $translation = is_string($this->option('translation')) && trim($this->option('translation')) !== ''
            ? trim($this->option('translation'))
            : null;

        $book = ScriptureBook::query()->updateOrCreate(
            ['identifier' => $identifier],
            [
                'religion' => $religion,
                'name' => $name,
                'short_name' => $shortName,
                'language' => $language,
                'translation_label' => $translation,
                'topics' => $topics,
                'is_active' => true,
            ],
        );

        $now = now();
        $rows = [];
        $skipped = 0;

        foreach ($data as $item) {
            if (! is_array($item)) {
                $skipped++;

                continue;
            }
            $ch = (int) ($item['chapter'] ?? $item['c'] ?? 0);
            $vn = (int) ($item['verse'] ?? $item['v'] ?? 0);
            $text = trim((string) ($item['text'] ?? $item['t'] ?? ''));
            if ($ch < 1 || $vn < 1 || $text === '') {
                $skipped++;

                continue;
            }
            $rows[] = [
                'scripture_book_id' => $book->id,
                'chapter_number' => $ch,
                'verse_number' => $vn,
                'text' => $text,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        if ($rows === []) {
            $this->error('No valid verse rows found in JSON.');

            return self::FAILURE;
        }

        $this->info('Upserting '.count($rows).' verses for book "'.$book->name.'" (id '.$book->id.')…');

        $bar = $this->output->createProgressBar((int) ceil(count($rows) / 300));
        $bar->start();

        foreach (array_chunk($rows, 300) as $chunk) {
            ScriptureVerse::query()->upsert(
                $chunk,
                ['scripture_book_id', 'chapter_number', 'verse_number'],
                ['text', 'updated_at'],
            );
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info('Done. Verses in DB: '.ScriptureVerse::query()->where('scripture_book_id', $book->id)->count().'. Skipped invalid rows: '.$skipped);

        return self::SUCCESS;
    }
}
