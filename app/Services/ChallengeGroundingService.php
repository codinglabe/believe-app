<?php

namespace App\Services;

use App\Models\ChallengeGroundingPassage;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Retrieves stored passages (scripture, citations, study notes — any text) for Challenge quiz grounding.
 * Tags on each row should overlap hub {@see $category} label and/or quiz subcategory name for matching.
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
            ->where(function ($q) use ($topic) {
                $q->whereJsonContains('topics', $topic);
                $lower = strtolower($topic);
                if ($lower !== $topic) {
                    $q->orWhereJsonContains('topics', $lower);
                }
                $title = ucfirst($lower);
                if ($title !== $topic && $title !== $lower) {
                    $q->orWhereJsonContains('topics', $title);
                }
            })
            ->where(function ($q) use ($profileReligion) {
                $q->whereNull('religion');
                if ($profileReligion !== null && $profileReligion !== '') {
                    $q->orWhere('religion', $profileReligion);
                }
            })
            ->inRandomOrder()
            ->limit($limit)
            ->get();
    }

    /**
     * Merge passages for subcategory tag first, then hub category label, without duplicates.
     *
     * @return Collection<int, ChallengeGroundingPassage>
     */
    public function passagesForChallengePrompt(string $category, ?string $subcategory, ?string $profileReligion, int $limit): Collection
    {
        $limit = max(1, $limit);
        $merged = collect();
        $seen = [];

        foreach (array_unique(array_filter(array_map('trim', [
            is_string($subcategory) ? $subcategory : '',
            $category,
        ]))) as $topic) {
            if ($merged->count() >= $limit) {
                break;
            }
            $take = $limit - $merged->count();
            foreach ($this->getPassagesByTopic($topic, $profileReligion, $take) as $p) {
                if (! isset($seen[$p->id])) {
                    $seen[$p->id] = true;
                    $merged->push($p);
                }
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

    protected function formatOnePassageForPrompt(ChallengeGroundingPassage $p, int $maxBodyChars): string
    {
        $type = trim((string) $p->source_type);
        $typeLabel = $type !== '' && strcasecmp($type, 'general') !== 0 ? '['.$type.'] ' : '';
        $ref = trim((string) $p->reference);
        $head = $ref !== '' ? $typeLabel.$ref : $typeLabel.'#'.$p->id;
        $body = Str::limit(trim((string) $p->text), $maxBodyChars, '…');

        return $head."\n".$body;
    }
}
