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
     * 1. First fill any incomplete shares (same tag number)
     * 2. Then create new full shares (new tag numbers)
     * 3. Then add remaining tokens to the current incomplete share (same tag as step 1)
     */
    public function assignTagNumber(FractionalOffering $offering, int $tokens): array
    {
        $tokensPerShare = $offering->tokens_per_share;
        $remainingTokens = $tokens;
        $assignedTags = [];

        // Step 1: Fill incomplete shares first
        $incompleteTag = FractionalShareTag::where('offering_id', $offering->id)
            ->where('is_complete', false)
            ->first();

        if ($incompleteTag && $remainingTokens > 0) {
            $tokensAvailable = $tokensPerShare - $incompleteTag->tokens_filled;
            $tokensToFill = min($remainingTokens, $tokensAvailable);

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
            }
        }

        // Step 2: Create new full shares
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

        // Step 3: Add remaining tokens to incomplete share (or create new one)
        if ($remainingTokens > 0) {
            // Get the current incomplete tag (might be the one from step 1, or a new one)
            $currentIncompleteTag = FractionalShareTag::where('offering_id', $offering->id)
                ->where('is_complete', false)
                ->first();

            if (!$currentIncompleteTag) {
                // Create a new incomplete share tag
                $tagNumber = $this->generateNextTagNumber($offering);
                $currentIncompleteTag = FractionalShareTag::create([
                    'offering_id' => $offering->id,
                    'tag_number' => $tagNumber,
                    'tokens_filled' => 0,
                    'tokens_per_share' => $tokensPerShare,
                    'is_complete' => false,
                ]);
            }

            $currentIncompleteTag->tokens_filled += $remainingTokens;
            
            if ($currentIncompleteTag->tokens_filled >= $tokensPerShare) {
                $currentIncompleteTag->is_complete = true;
            }
            
            $currentIncompleteTag->save();

            $assignedTags[] = [
                'tag_number' => $currentIncompleteTag->tag_number,
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

