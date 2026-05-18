<?php

namespace App\Console\Commands;

use App\Console\Concerns\BuildsScriptureImportHttpClient;
use App\Models\ScriptureBook;
use App\Models\ScriptureVerse;
use App\Support\ProfileReligions;
use Illuminate\Console\Command;
use Illuminate\Http\Client\PendingRequest;

/**
 * Bulk-import scripture over HTTP: full English Qur'an and/or KJV.
 * Qur'an: api.quran.com v4 translation per surah (English; no Uthmani Arabic).
 * KJV: api.getbible.net. Islam / Christianity; other traditions: `php artisan scripture:import-json`.
 */
class ScriptureImportRemoteCommand extends Command
{
    use BuildsScriptureImportHttpClient;

    private const QURAN_COM_API = 'https://api.quran.com/api/v4';

    private const KJV_API = 'https://api.getbible.net/v2/kjv';

    protected $signature = 'scripture:import-remote
                            {target=all : quran, kjv, or all (default: full Qur\'an + full KJV)}
                            {--quran-com-translation-id=20 : Quran.com translation resource (20 = Saheeh International)}
                            {--quran-identifier= : scripture_books.identifier (default: quran-com-tr-{id})}
                            {--kjv-id-prefix=kjv- : Per-biblical-book identifier prefix (Genesis = kjv-1)}
                            {--kjv-book= : Import only this biblical book 1–66 (kjv / all)}
                            {--kjv-from-book=1 : First biblical book when --kjv-book is not set}
                            {--kjv-to-book=66 : Last biblical book when --kjv-book is not set}
                            {--topic=* : Hub labels applied to every imported book (required)}';

    protected $description = 'Import full Qur\'an (Islam) and/or KJV (Christianity) from public APIs in one command.';

    public function handle(): int
    {
        $target = strtolower(trim((string) $this->argument('target')));
        if (! in_array($target, ['quran', 'kjv', 'all'], true)) {
            $this->error('target must be quran, kjv, or all.');

            return self::FAILURE;
        }

        $topics = $this->resolvedTopics();
        if ($topics === null) {
            return self::FAILURE;
        }

        if ($target === 'quran' || $target === 'all') {
            if ($this->importQuran($topics) !== self::SUCCESS) {
                return self::FAILURE;
            }
            if ($target === 'all') {
                $this->newLine();
            }
        }

        if ($target === 'kjv' || $target === 'all') {
            if ($this->importKjv($topics) !== self::SUCCESS) {
                return self::FAILURE;
            }
        }

        $this->newLine();
        $this->info('Remote scripture import finished.');

        return self::SUCCESS;
    }

    /**
     * @return list<string>|null
     */
    protected function resolvedTopics(): ?array
    {
        $topicFlags = array_values(array_filter(
            array_map(fn ($t) => trim((string) $t), (array) $this->option('topic')),
            fn (string $t) => $t !== ''
        ));
        if ($topicFlags === []) {
            $this->error('Provide at least one --topic= label (e.g. --topic=Faith --topic=Bible --topic=Quran).');

            return null;
        }

        return $topicFlags;
    }

    /**
     * @param  list<string>  $topics
     */
    protected function importQuran(array $topics): int
    {
        $religion = ProfileReligions::nullableAllowed('Islam');
        if ($religion !== 'Islam') {
            $this->error('Internal error: Islam must remain a valid profile religion for Qur\'an import.');

            return self::FAILURE;
        }

        $translationId = (int) $this->option('quran-com-translation-id');
        if ($translationId < 1) {
            $this->error('Invalid --quran-com-translation-id (use a positive resource id, e.g. 20 for Saheeh International).');

            return self::FAILURE;
        }

        $quranId = trim((string) $this->option('quran-identifier'));
        $identifier = $quranId !== '' ? $quranId : 'quran-com-tr-'.$translationId;

        $client = $this->scriptureImportHttp(120, 20);
        $this->info("Qur'an (Quran.com translation id {$translationId}, English) — 114 surahs…");

        $translationLabel = "resource:{$translationId}";
        $book = ScriptureBook::query()->updateOrCreate(
            ['identifier' => $identifier],
            [
                'religion' => $religion,
                'name' => "Qur'ān — English translation (Quran.com, {$translationLabel})",
                'short_name' => 'Qur\'an',
                'language' => 'en',
                'translation_label' => 'quran.com/'.$translationId,
                'topics' => $topics,
                'is_active' => true,
            ],
        );

        $bar = $this->output->createProgressBar(114);
        $bar->start();
        $now = now();
        $totalRows = 0;
        for ($surah = 1; $surah <= 114; $surah++) {
            $url = self::QURAN_COM_API.'/quran/translations/'.$translationId;
            $res = $client->get($url, ['chapter_number' => $surah]);
            if (! $res->successful()) {
                $this->error("HTTP {$res->status()} for surah {$surah} — {$url}");
                $bar->finish();
                $this->newLine();

                return self::FAILURE;
            }
            $json = $res->json();
            if (! is_array($json)) {
                $this->error("Invalid JSON for surah {$surah}");
                $bar->finish();
                $this->newLine();

                return self::FAILURE;
            }
            if (is_array($json['meta'] ?? null) && is_string($json['meta']['translation_name'] ?? null) && $surah === 1) {
                $tName = trim($json['meta']['translation_name']);
                if ($tName !== '') {
                    $book->name = "Qur'ān — {$tName} (Quran.com)";
                    $book->translation_label = "quran.com: {$tName} ({$translationId})";
                    $book->save();
                }
            }

            $list = is_array($json['translations'] ?? null) ? $json['translations'] : [];
            if ($list === []) {
                $this->error("No translation rows for surah {$surah}");
                $bar->finish();
                $this->newLine();

                return self::FAILURE;
            }
            $rows = [];
            foreach ($list as $idx => $t) {
                if (! is_array($t)) {
                    continue;
                }
                $vn = $this->quranComVerseNumberInSurah($t, (int) $idx);
                if ($vn < 1) {
                    continue;
                }
                $text = trim(preg_replace('/\s+/', ' ', (string) ($t['text'] ?? '')) ?? '');
                if ($text === '') {
                    continue;
                }
                $rows[] = [
                    'scripture_book_id' => $book->id,
                    'chapter_number' => $surah,
                    'verse_number' => $vn,
                    'text' => $text,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            foreach (array_chunk($rows, 300) as $chunk) {
                ScriptureVerse::query()->upsert(
                    $chunk,
                    ['scripture_book_id', 'chapter_number', 'verse_number'],
                    ['text', 'updated_at'],
                );
            }
            $totalRows += count($rows);
            $bar->advance();
        }
        $bar->finish();
        $this->newLine();
        $this->info("Qur'an: {$totalRows} ayāt in book id {$book->id} ({$book->identifier}).");

        return self::SUCCESS;
    }

    /**
     * @param  array<string, mixed>  $t
     */
    private function quranComVerseNumberInSurah(array $t, int $zeroIndex): int
    {
        $key = isset($t['verse_key']) ? (string) $t['verse_key'] : '';
        if (preg_match('/^(\d+):(\d+)$/', $key, $m)) {
            return (int) $m[2];
        }
        if (isset($t['verse_number']) && is_numeric($t['verse_number'])) {
            return (int) $t['verse_number'];
        }

        return $zeroIndex + 1;
    }

    /**
     * @param  list<string>  $topics
     */
    protected function importKjv(array $topics): int
    {
        $religion = ProfileReligions::nullableAllowed('Christianity');
        if ($religion !== 'Christianity') {
            $this->error('Internal error: Christianity must remain a valid profile religion for KJV import.');

            return self::FAILURE;
        }

        $idPrefix = trim((string) $this->option('kjv-id-prefix')) ?: 'kjv-';
        if (! preg_match('/^[a-z0-9_-]+$/i', rtrim($idPrefix, '-')) || rtrim($idPrefix, '-') === '') {
            $this->error('--kjv-id-prefix must be alphanumeric (with - or _); default kjv-');

            return self::FAILURE;
        }
        if (! str_ends_with($idPrefix, '-')) {
            $idPrefix .= '-';
        }

        $client = $this->scriptureImportHttp(120, 20);

        $booksRes = $client->get(self::KJV_API.'/books.json');
        if (! $booksRes->successful()) {
            $this->error('Could not load KJV books list: HTTP '.$booksRes->status());

            return self::FAILURE;
        }
        $bookMeta = $booksRes->json();
        if (! is_array($bookMeta)) {
            $this->error('Invalid getBible books.json response.');

            return self::FAILURE;
        }

        $single = $this->option('kjv-book');
        if ($single !== null && $single !== '') {
            $from = $to = max(1, min(66, (int) $single));
        } else {
            $from = max(1, (int) $this->option('kjv-from-book'));
            $to = min(66, (int) $this->option('kjv-to-book'));
        }
        if ($from > $to) {
            $this->error('Invalid KJV book range: kjv-from-book must be <= kjv-to-book.');

            return self::FAILURE;
        }

        $this->info("KJV (religion: {$religion}), biblical books {$from}–{$to}…");
        $totalVerses = 0;

        for ($bookNr = $from; $bookNr <= $to; $bookNr++) {
            $key = (string) $bookNr;
            $row = is_array($bookMeta[$key] ?? null) ? $bookMeta[$key] : null;
            if ($row === null) {
                $this->warn("Book {$bookNr} missing in books.json — skipped.");

                continue;
            }
            $bookName = is_string($row['name'] ?? null) ? trim($row['name']) : "Book {$bookNr}";
            $identifier = $idPrefix.$bookNr;

            $book = ScriptureBook::query()->updateOrCreate(
                ['identifier' => $identifier],
                [
                    'religion' => $religion,
                    'name' => 'KJV — '.$bookName,
                    'short_name' => $bookName,
                    'language' => 'en',
                    'translation_label' => 'KJV (getBible.net)',
                    'topics' => $topics,
                    'is_active' => true,
                ],
            );

            $verseCount = $this->fetchAndUpsertKjvBook($client, $book, $bookNr);
            if ($verseCount < 0) {
                return self::FAILURE;
            }
            $totalVerses += $verseCount;
            $this->line("  [{$bookNr}/66] {$bookName} — book id {$book->id}");
        }

        $this->info("KJV: approx. {$totalVerses} verse upserts in range.");

        return self::SUCCESS;
    }

    /**
     * @return int Verse rows upserted for this biblical book, or -1 on failure
     */
    protected function fetchAndUpsertKjvBook(PendingRequest $client, ScriptureBook $book, int $bookNr): int
    {
        $chapRes = $client->get(self::KJV_API.'/'.$bookNr.'/chapters.json');
        if (! $chapRes->successful()) {
            $this->error("chapters.json failed for book {$bookNr}: HTTP ".$chapRes->status());

            return -1;
        }
        $chapters = $chapRes->json();
        if (! is_array($chapters)) {
            $this->error("Invalid chapters.json for book {$bookNr}");

            return -1;
        }

        $chKeys = array_map('intval', array_keys($chapters));
        sort($chKeys);
        $now = now();
        $bookTotal = 0;

        foreach ($chKeys as $ch) {
            $cRes = $client->get(self::KJV_API.'/'.$bookNr.'/'.$ch.'.json');
            if (! $cRes->successful()) {
                $this->error("Book {$bookNr} chapter {$ch}: HTTP ".$cRes->status());

                return -1;
            }
            $cJson = $cRes->json();
            if (! is_array($cJson)) {
                $this->error("Invalid chapter JSON: book {$bookNr} ch {$ch}");

                return -1;
            }
            $verses = is_array($cJson['verses'] ?? null) ? $cJson['verses'] : [];
            $rows = [];
            foreach ($verses as $v) {
                if (! is_array($v)) {
                    continue;
                }
                $cn = (int) ($v['chapter'] ?? 0);
                $vn = (int) ($v['verse'] ?? 0);
                $text = trim((string) ($v['text'] ?? ''));
                if ($cn < 1 || $vn < 1 || $text === '') {
                    continue;
                }
                $rows[] = [
                    'scripture_book_id' => $book->id,
                    'chapter_number' => $cn,
                    'verse_number' => $vn,
                    'text' => $text,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
            foreach (array_chunk($rows, 300) as $chunk) {
                if ($chunk === []) {
                    continue;
                }
                ScriptureVerse::query()->upsert(
                    $chunk,
                    ['scripture_book_id', 'chapter_number', 'verse_number'],
                    ['text', 'updated_at'],
                );
            }
            $bookTotal += count($rows);
        }

        return $bookTotal;
    }
}
