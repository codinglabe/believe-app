<?php

namespace App\Services;

use App\Models\IrsBoardMember;
use Illuminate\Support\Str;

/**
 * Lightweight 990-based org claim verification.
 *
 * Policy: "Organization access is granted when a registering individual matches
 * a named officer on the organization's IRS Form 990 and self-attests their role."
 *
 * Use: getOfficersForEIN(), matchRegistrantToOfficers(), then require
 * attestation checkbox and store verification_source = "IRS 990 + self attestation".
 */
class OrgClaim990Service
{
    public const VERIFICATION_SOURCE = 'IRS 990 + self attestation';

    /**
     * Get officers/directors for an EIN (from irs_board_members, 990-derived).
     * Prefer latest tax year; include active and recent.
     */
    public function getOfficersForEIN(string $ein, ?string $taxYear = null): array
    {
        $query = IrsBoardMember::forEin($ein)->active();

        if ($taxYear) {
            $query->forTaxYear($taxYear);
        } else {
            $query->orderByDesc('tax_year')->limit(500);
        }

        return $query->get()->map(fn (IrsBoardMember $m) => [
            'id' => $m->id,
            'name' => $m->name,
            'position' => $m->position,
            'tax_year' => $m->tax_year,
        ])->values()->all();
    }

    /**
     * Match registrant name (and optionally title) to 990 officers.
     * When the org has 2+ officers, we ALWAYS show the full list so the user must select their name.
     * Only when there is exactly 1 officer do we allow single_match (no list).
     *
     * @return array{ status: 'single_match'|'multiple_matches'|'no_match', matched_id?: int, possible_matches?: array }
     */
    public function matchRegistrantToOfficers(string $registrantName, ?string $registrantTitle, string $ein): array
    {
        $officers = $this->getOfficersForEIN($ein);
        if (empty($officers)) {
            return ['status' => 'no_match', 'possible_matches' => []];
        }

        // If org has 2 or more officers, ALWAYS show the list so user selects their name (e.g. 24 people).
        $officerList = array_slice(array_map(fn ($m) => ['id' => $m['id'], 'name' => $m['name'], 'position' => $m['position'], 'tax_year' => $m['tax_year']], $officers), 0, 50);
        if (count($officers) >= 2) {
            return [
                'status' => 'multiple_matches',
                'possible_matches' => $officerList,
            ];
        }

        // Exactly 1 officer: allow single_match if name matches
        $registrantName = $this->normalizeName($registrantName);
        $registrantTitle = $registrantTitle ? $this->normalizeTitle($registrantTitle) : null;
        $officer = $officers[0];
        $score = $this->nameMatchScore($registrantName, $officer['name']);
        if ($registrantTitle && isset($officer['position']) && $this->titleMatches($registrantTitle, $officer['position'])) {
            $score += 20;
        }
        if ($score >= 50) {
            return [
                'status' => 'single_match',
                'matched_id' => $officer['id'],
                'matched_name' => $officer['name'],
                'matched_position' => $officer['position'] ?? null,
                'tax_year' => $officer['tax_year'] ?? null,
            ];
        }
        return ['status' => 'no_match', 'possible_matches' => $officerList];
    }

    /**
     * Normalize name for comparison: lowercase, collapse spaces.
     */
    private function normalizeName(string $name): string
    {
        return Str::lower(trim(preg_replace('/\s+/', ' ', $name)));
    }

    private function normalizeTitle(string $title): string
    {
        return Str::lower(trim($title));
    }

    /**
     * Score 0–80: last name + first initial or full first name match.
     */
    private function nameMatchScore(string $registrantNormalized, string $officerName): int
    {
        $officerNormalized = $this->normalizeName($officerName);
        $regParts = array_filter(explode(' ', $registrantNormalized));
        $offParts = array_filter(explode(' ', $officerNormalized));

        if (empty($regParts) || empty($offParts)) {
            return 0;
        }

        $regFirst = $regParts[0];
        $regLast = end($regParts);
        $offFirst = $offParts[0];
        $offLast = end($offParts);

        $lastNameMatch = $regLast === $offLast;
        $firstInitialMatch = strlen($regFirst) > 0 && strlen($offFirst) > 0 && $regFirst[0] === $offFirst[0];
        $firstFullMatch = $regFirst === $offFirst;

        if (!$lastNameMatch) {
            return 0;
        }
        if ($firstFullMatch) {
            return 80;
        }
        if ($firstInitialMatch) {
            return 50;
        }
        return 0;
    }

    private function titleMatches(string $registrantTitle, ?string $officerPosition): bool
    {
        if (empty($officerPosition)) {
            return false;
        }
        $off = Str::lower(trim($officerPosition));
        $r = $registrantTitle;
        if (str_contains($off, $r) || str_contains($r, $off)) {
            return true;
        }
        $aliases = [
            'president' => ['president', 'ceo', 'executive director'],
            'director' => ['director', 'trustee', 'board member'],
            'treasurer' => ['treasurer', 'cfo'],
            'secretary' => ['secretary'],
        ];
        foreach ($aliases as $key => $list) {
            if (str_contains($r, $key)) {
                foreach ($list as $a) {
                    if (str_contains($off, $a)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /**
     * Build verification_metadata for storage when claim is approved.
     */
    public function buildVerificationMetadata(int $irsBoardMemberId, ?string $taxYear, string $matchType = 'name'): array
    {
        return [
            'verification_source' => self::VERIFICATION_SOURCE,
            'irs_board_member_id' => $irsBoardMemberId,
            'tax_year' => $taxYear,
            'match_type' => $matchType,
            'verified_at' => now()->toIso8601String(),
        ];
    }
}
