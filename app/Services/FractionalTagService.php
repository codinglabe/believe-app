<?php

namespace App\Services;

use App\Models\FractionalOffering;
use App\Models\FractionalShareTag;
use Illuminate\Support\Facades\DB;

class FractionalTagService
{
    /**
     * Assign tag number to a purchase based on tokens
     * Logic:
     * 1. First create new full shares (new tag numbers) - buyer owns these full shares
     * 2. Then fill incomplete shares with remaining tokens (existing incomplete tags)
     * 3. Then add remaining tokens to a new incomplete share (new tag number)
     */
    public function assignTagNumber(FractionalOffering $offering, int $tokens): array
    {
        $tokensPerShare = $offering->tokens_per_share;
        $remainingTokens = $tokens;
        $assignedTags = [];

        // Step 1: Create new full shares first (buyer owns these full shares, so they get new tags)
        while ($remainingTokens >= $tokensPerShare) {
            $tagNumber = $this->generateNextTagNumber($offering);
            $newTag = FractionalShareTag::create([
                'offering_id' => $offering->id,
                'tag_number' => $tagNumber,
                'tokens_filled' => $tokensPerShare,
                'tokens_per_share' => $tokensPerShare,
                'is_complete' => true,
            ]);

            $assignedTags[] = [
                'tag_number' => $tagNumber,
                'tokens' => $tokensPerShare,
            ];

            $remainingTokens -= $tokensPerShare;
        }

        // Step 2: Fill incomplete shares with remaining tokens (existing incomplete tags)
        while ($remainingTokens > 0) {
            $incompleteTag = FractionalShareTag::where('offering_id', $offering->id)
                ->where('is_complete', false)
                ->first();

            if (!$incompleteTag) {
                break; // No more incomplete shares to fill
            }

            $tokensNeeded = $tokensPerShare - $incompleteTag->tokens_filled;
            $tokensToFill = min($remainingTokens, $tokensNeeded);

            if ($tokensToFill > 0) {
                $incompleteTag->tokens_filled += $tokensToFill;
                
                if ($incompleteTag->tokens_filled >= $tokensPerShare) {
                    $incompleteTag->is_complete = true;
                }
                
                $incompleteTag->save();

                $assignedTags[] = [
                    'tag_number' => $incompleteTag->tag_number,
                    'tokens' => $tokensToFill,
                ];

                $remainingTokens -= $tokensToFill;
            } else {
                break;
            }
        }

        // Step 3: Add remaining tokens to a NEW incomplete share (create new tag)
        if ($remainingTokens > 0) {
            // Always create a new incomplete share tag for remaining tokens
            $tagNumber = $this->generateNextTagNumber($offering);
            $newIncompleteTag = FractionalShareTag::create([
                'offering_id' => $offering->id,
                'tag_number' => $tagNumber,
                'tokens_filled' => $remainingTokens,
                'tokens_per_share' => $tokensPerShare,
                'is_complete' => false,
            ]);

            $assignedTags[] = [
                'tag_number' => $tagNumber,
                'tokens' => $remainingTokens,
            ];
        }

        return $assignedTags;
    }

    /**
     * Generate the next tag number for an offering
     */
    private function generateNextTagNumber(FractionalOffering $offering): string
    {
        // Get the highest tag number for this offering
        $lastTag = FractionalShareTag::where('offering_id', $offering->id)
            ->orderBy('id', 'desc')
            ->first();

        if ($lastTag) {
            // Extract number from tag (e.g., "#1001" -> 1001)
            $lastNumber = (int) str_replace('#', '', $lastTag->tag_number);
            $nextNumber = $lastNumber + 1;
        } else {
            // Start from 1001
            $nextNumber = 1001;
        }

        return '#' . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Get all tag numbers for a user's orders in an offering
     */
    public function getUserTags(int $userId, int $offeringId): array
    {
        return FractionalOrder::where('user_id', $userId)
            ->where('offering_id', $offeringId)
            ->where('status', 'paid')
            ->select('tag_number', DB::raw('SUM(tokens) as total_tokens'))
            ->groupBy('tag_number')
            ->get()
            ->toArray();
    }
}

