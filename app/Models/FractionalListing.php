<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FractionalListing extends Model
{
    use HasFactory;

    protected $fillable = [
        'livestock_animal_id',
        'livestock_user_id',
        'fractional_asset_id',
        'country_code',
        'tag_number',
        'status',
        'notes',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        // Ensure livestock_user_id is set before creating
        static::creating(function ($listing) {
            // Auto-generate tag number if not set
            if (empty($listing->tag_number)) {
                $listing->tag_number = static::generateTagNumber($listing);
            }
            
            // Ensure livestock_user_id is set - try to get from authenticated user if null
            if (empty($listing->livestock_user_id)) {
                $user = \Illuminate\Support\Facades\Auth::user();
                if ($user && method_exists($user, 'livestockUser') && $user->livestockUser) {
                    $listing->livestock_user_id = $user->livestockUser->id;
                } else {
                    // Try to get from existing listings for the same asset
                    $existingListing = static::where('fractional_asset_id', $listing->fractional_asset_id)
                        ->whereNotNull('livestock_user_id')
                        ->first();
                    if ($existingListing) {
                        $listing->livestock_user_id = $existingListing->livestock_user_id;
                    }
                }
            }
        });

        // Auto-generate tag number before updating if not set
        static::updating(function ($listing) {
            if (empty($listing->tag_number)) {
                $listing->tag_number = static::generateTagNumber($listing);
            }
        });
    }

    /**
     * Generate a unique tag number based on buyer's farm country code.
     */
    protected static function generateTagNumber($listing): string
    {
        // Get country code - priority: listing country_code, buyer profile country, default 'ZM'
        $countryCode = null;

        // First, try to get from listing's country_code
        if (!empty($listing->country_code)) {
            $countryCode = strtoupper($listing->country_code);
        }

        // If not set, try to get from buyer's profile (farm country code)
        if (!$countryCode && $listing->livestock_user_id) {
            $livestockUser = LivestockUser::find($listing->livestock_user_id);
            if ($livestockUser && $livestockUser->buyerProfile && $livestockUser->buyerProfile->country) {
                $countryCode = strtoupper($livestockUser->buyerProfile->country);
                
                // If it's a full country name, try to get the code from countries table
                if (strlen($countryCode) > 2) {
                    $country = Country::where('name', $livestockUser->buyerProfile->country)
                        ->orWhere('code', $livestockUser->buyerProfile->country)
                        ->where('is_active', true)
                        ->first();
                    if ($country) {
                        $countryCode = strtoupper($country->code);
                    }
                }
            }
        }

        // If still not found, try existing listings for this asset
        if (!$countryCode && $listing->fractional_asset_id && $listing->livestock_user_id) {
            $existingListing = static::where('livestock_user_id', $listing->livestock_user_id)
                ->where('fractional_asset_id', $listing->fractional_asset_id)
                ->whereNotNull('country_code')
                ->first();
            if ($existingListing) {
                $countryCode = $existingListing->country_code;
            }
        }

        // Default to 'ZM' if no country code found
        if (!$countryCode) {
            $countryCode = 'ZM';
        }

        // Get all existing tag numbers for this asset and country code
        $existingTagsQuery = static::where('country_code', $countryCode)
            ->whereNotNull('tag_number');
        
        // If fractional_asset_id is set, filter by it; otherwise get all tags for this country
        if ($listing->fractional_asset_id) {
            $existingTagsQuery->where('fractional_asset_id', $listing->fractional_asset_id);
        }
        
        $existingTags = $existingTagsQuery->pluck('tag_number')->toArray();

        // Also check pre-generated tags
        $preGeneratedTags = PreGeneratedTag::where('country_code', strtoupper($countryCode))
            ->pluck('tag_number')
            ->toArray();

        $allTags = array_merge($existingTags, $preGeneratedTags);

        // Extract numbers from existing tags (e.g., "ZM-001" -> 1)
        $existingNumbers = [];
        foreach ($allTags as $tag) {
            if (preg_match('/^' . preg_quote($countryCode, '/') . '-(\d+)$/i', $tag, $matches)) {
                $existingNumbers[] = (int)$matches[1];
            }
        }

        // Find the next available number
        $nextNumber = 1;
        if (!empty($existingNumbers)) {
            $maxNumber = max($existingNumbers);
            $nextNumber = $maxNumber + 1;
        }

        // Generate tag number with zero-padding (e.g., ZM-001, ZM-002)
        $tagNumber = $countryCode . '-' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);

        // Ensure uniqueness (in case of race conditions)
        $attempts = 0;
        while ((static::where('tag_number', $tagNumber)->exists() || 
                PreGeneratedTag::where('tag_number', $tagNumber)->exists()) && 
               $attempts < 100) {
            $nextNumber++;
            $tagNumber = $countryCode . '-' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);
            $attempts++;
        }

        // Also set country_code if not already set
        if (empty($listing->country_code)) {
            $listing->country_code = $countryCode;
        }

        return $tagNumber;
    }

    /**
     * Get the livestock animal.
     */
    public function animal(): BelongsTo
    {
        return $this->belongsTo(LivestockAnimal::class, 'livestock_animal_id');
    }

    /**
     * Get the livestock user (owner).
     */
    public function livestockUser(): BelongsTo
    {
        return $this->belongsTo(LivestockUser::class, 'livestock_user_id');
    }

    /**
     * Get the fractional asset.
     */
    public function fractionalAsset(): BelongsTo
    {
        return $this->belongsTo(FractionalAsset::class, 'fractional_asset_id');
    }

    /**
     * Check if listing is active.
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /**
     * Check if listing is pending.
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }
}
