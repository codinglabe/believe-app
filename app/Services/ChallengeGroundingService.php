<?php

namespace App\Services;

use App\Models\ChallengeGroundingPassage;
use App\Models\ScriptureBook;
use App\Models\ScriptureVerse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Retrieves stored passages (manual rows + bulk-imported scripture verses) for Challenge quiz grounding.
 * Tags on {@see ChallengeGroundingPassage::$topics} or {@see ScriptureBook::$topics} must overlap hub category / subcategory labels.
 */
class ChallengeGroundingService
{
    /**
     * @return Collection<int, ChallengeGroundingPassage>
     */
    public function getPassagesByTopic(string $topic, ?string $profileReligion, int $limit): Collection
    {
        $topic = trim($topic);
        if ($topic === '' || $limit < 1 || ! Schema::hasTable('challenge_grounding_passages')) {
            return collect();
        }

        return ChallengeGroundingPassage::query()
            ->where(fn (Builder $q) => $this->scopeJsonTopicContains($q, 'topics', $topic))
            ->where(fn (Builder $q) => $this->scopeReligionUniversalOrMatch($q, 'religion', $profileReligion))
            ->inRandomOrder()
            ->limit($limit)
            ->get();
    }

    /**
     * @return Collection<int, ScriptureVerse>
     */
    public function getScriptureVersesByTopic(string $topic, ?string $profileReligion, int $limit): Collection
    {
        $topic = trim($topic);
        if ($topic === '' || $limit < 1 || ! Schema::hasTable('scripture_verses')) {
            return collect();
        }

        return ScriptureVerse::query()
            ->with('book')
            ->whereHas('book', function (Builder $q) use ($topic, $profileReligion) {
                $q->where('is_active', true)
                    ->whereNotNull('topics')
                    ->where(fn (Builder $inner) => $this->scopeJsonTopicContains($inner, 'topics', $topic))
                    ->where(fn (Builder $inner) => $this->scopeReligionUniversalOrMatch($inner, 'religion', $profileReligion));
            })
            ->inRandomOrder()
            ->limit($limit)
            ->get();
    }

    /**
     * Base query for building MCQ from DB: books whose `topics` match any hub label (OR), and religion rules.
     *
     * @param  list<string>  $topicLabels
     * @return Builder<ScriptureVerse, $this>
     */
    public function scriptureVerseQueryForHub(array $topicLabels, ?string $profileReligion): Builder
    {
        if (! Schema::hasTable('scripture_verses') || ! Schema::hasTable('scripture_books')) {
            return ScriptureVerse::query()->whereRaw('1=0');
        }

        $labels = array_values(array_unique(array_filter(array_map('trim', $topicLabels), fn (string $t) => $t !== '')));
        if ($labels === []) {
            return ScriptureVerse::query()->whereRaw('1=0');
        }

        return ScriptureVerse::query()
            ->with('book')
            ->whereNotNull('text')
            ->where('text', '!=', '')
            ->whereHas('book', function (Builder $q) use ($labels, $profileReligion) {
                $q->where('is_active', true)
                    ->whereNotNull('topics')
                    ->where(function (Builder $outer) use ($labels) {
                        foreach ($labels as $t) {
                            $outer->orWhere(
                                fn (Builder $inner) => $this->scopeJsonTopicContains($inner, 'topics', $t)
                            );
                        }
                    })
                    ->where(
                        fn (Builder $inner) => $this->scopeReligionUniversalOrMatch($inner, 'religion', $profileReligion)
                    );
            });
    }

    /**
     * Merge scripture verses (bulk imports) and manual grounding passages for subcategory then category.
     *
     * @return Collection<int, ChallengeGroundingPassage>
     */
    public function passagesForChallengePrompt(string $category, ?string $subcategory, ?string $profileReligion, int $limit): Collection
    {
        $limit = max(1, $limit);
        $merged = collect();
        /** @var array<string, true> $seen */
        $seen = [];

        foreach (array_unique(array_filter(array_map('trim', [
            is_string($subcategory) ? $subcategory : '',
            $category,
        ]))) as $topic) {
            if ($merged->count() >= $limit) {
                break;
            }
            $take = $limit - $merged->count();

            foreach ($this->getScriptureVersesByTopic($topic, $profileReligion, $take) as $verse) {
                $book = $verse->book;
                if (! $book) {
                    continue;
                }
                $key = 'v:'.$verse->id;
                if (isset($seen[$key])) {
                    continue;
                }
                $seen[$key] = true;
                $merged->push($this->verseAsEphemeralPassage($verse, $book));
                if ($merged->count() >= $limit) {
                    break 2;
                }
            }

            $take = $limit - $merged->count();
            foreach ($this->getPassagesByTopic($topic, $profileReligion, $take) as $p) {
                $key = 'p:'.$p->getKey();
                if (isset($seen[$key])) {
                    continue;
                }
                $seen[$key] = true;
                $merged->push($p);
                if ($merged->count() >= $limit) {
                    break 2;
                }
            }
        }

        return $merged;
    }

    /**
     * Plain-text block for LLM prompts (bounded per passage and overall — limits input tokens/cost).
     *
     * @param  Collection<int, ChallengeGroundingPassage>  $passages
     */
    public function formatPassagesForPrompt(Collection $passages): string
    {
        if ($passages->isEmpty()) {
            return '';
        }

        $maxPer = max(1, (int) config('services.challenge_quiz.grounding.max_chars_per_passage', 900));
        /** Independent of max_per — overall prompt budget (do not merge with max_per or small totals are ignored). */
        $maxTotal = max(1, (int) config('services.challenge_quiz.grounding.max_total_chars', 10000));

        $parts = [];
        $used = 0;

        foreach ($passages as $p) {
            $chunk = $this->formatOnePassageForPrompt($p, $maxPer);
            $sep = $parts === [] ? '' : "\n\n";
            $addLen = mb_strlen($sep) + mb_strlen($chunk);

            if ($used + $addLen <= $maxTotal) {
                $parts[] = $chunk;
                $used += $addLen;

                continue;
            }

            $remaining = $maxTotal - $used - mb_strlen($sep);
            if ($remaining > 0) {
                $parts[] = Str::limit($chunk, $remaining, '…');
            }

            break;
        }

        $out = implode("\n\n", $parts);

        if (mb_strlen($out) <= $maxTotal) {
            return $out;
        }

        return mb_substr($out, 0, max(0, $maxTotal - 1)).'…';
    }

    /**
     * Same caps as {@see formatPassagesForPrompt} but a clearer shape for the model: numbered items, reference, source, body.
     * Keeps your DB/CSV scripture rows easy to read inside the OpenAI system/user prompt.
     */
    public function formatPassagesForStructuredGroundingPrompt(Collection $passages): string
    {
        if ($passages->isEmpty()) {
            return '';
        }

        $maxPer = max(1, (int) config('services.challenge_quiz.grounding.max_chars_per_passage', 900));
        $maxTotal = max(1, (int) config('services.challenge_quiz.grounding.max_total_chars', 10000));

        $parts = [];
        $used = 0;
        $index = 0;

        foreach ($passages as $p) {
            $index++;
            $ref = trim((string) $p->reference);
            $src = trim((string) $p->source_type);
            $workLine = 'Work/source id: '.($src !== '' ? $src : 'n/a');
            if ($p->religion !== null && (string) $p->religion !== '') {
                $workLine .= ' | tradition: '.trim((string) $p->religion);
            }
            $body = Str::limit(trim((string) $p->text), $maxPer, '…');
            $chunk = '### ['.$index.']'."\n"
                .'Reference: '.($ref !== '' ? $ref : '—')."\n"
                .$workLine."\n"
                ."Text (use only this material; do not invent other verses or facts):\n"
                .$body;
            $sep = $parts === [] ? '' : "\n\n";
            $addLen = mb_strlen($sep) + mb_strlen($chunk);

            if ($used + $addLen <= $maxTotal) {
                $parts[] = $chunk;
                $used += $addLen;

                continue;
            }
            $remaining = $maxTotal - $used - mb_strlen($sep);
            if ($remaining > 0) {
                $head = '### ['.$index.']'."\n"
                    .'Reference: '.($ref !== '' ? $ref : '—')."\n"
                    ."Text (trimmed to budget):\n";
                $parts[] = $head.Str::limit($body, max(0, $remaining - mb_strlen($head)), '…');
            }
            break;
        }

        $out = implode("\n\n", $parts);

        if (mb_strlen($out) <= $maxTotal) {
            return $out;
        }

        return mb_substr($out, 0, max(0, $maxTotal - 1)).'…';
    }

    protected function formatOnePassageForPrompt(ChallengeGroundingPassage $p, int $maxBodyChars): string
    {
        $type = trim((string) $p->source_type);
        $typeLabel = $type !== '' && strcasecmp($type, 'general') !== 0 ? '['.$type.'] ' : '';
        $ref = trim((string) $p->reference);
        $head = $ref !== '' ? $typeLabel.$ref : $typeLabel.'#'.$p->getKey();
        $body = Str::limit(trim((string) $p->text), $maxBodyChars, '…');

        return $head."\n".$body;
    }

    protected function verseAsEphemeralPassage(ScriptureVerse $verse, ScriptureBook $book): ChallengeGroundingPassage
    {
        $short = trim((string) ($book->short_name ?: $book->name));
        $ref = $short.' '.$verse->chapter_number.':'.$verse->verse_number;

        $m = new ChallengeGroundingPassage([
            'religion' => $book->religion,
            'source_type' => $book->identifier,
            'reference' => $ref,
            'text' => $verse->text,
            'topics' => $book->topics ?? [],
        ]);
        $m->id = -abs((int) $verse->id);

        return $m;
    }

    protected function scopeJsonTopicContains(Builder $query, string $column, string $topic): void
    {
        $query->where(function (Builder $q) use ($column, $topic) {
            $q->whereJsonContains($column, $topic);
            $lower = strtolower($topic);
            if ($lower !== $topic) {
                $q->orWhereJsonContains($column, $lower);
            }
            $title = ucfirst($lower);
            if ($title !== $topic && $title !== $lower) {
                $q->orWhereJsonContains($column, $title);
            }
        });
    }

    /**
     * When the learner has no tradition selected, include all books/passages (imports tag Christianity/Islam, not null).
     * When selected, only universal rows (null) or rows matching that tradition.
     */
    protected function scopeReligionUniversalOrMatch(Builder $query, string $column, ?string $profileReligion): void
    {
        if ($profileReligion === null || $profileReligion === '') {
            return;
        }

        $query->where(function (Builder $q) use ($column, $profileReligion) {
            $q->whereNull($column)
                ->orWhere($column, $profileReligion);
        });
    }
}
