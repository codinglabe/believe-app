<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BankVerification extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'user_name',
        'bank_account_owner_name',
        'bank_account_owner_email',
        'bank_account_owner_phone',
        'bank_account_owner_address',
        'bank_name',
        'account_type',
        'account_mask',
        'name_similarity_score',
        'organization_match_score',
        'address_match_score',
        'ein_verified',
        'verification_status',
        'verification_method',
        'plaid_access_token',
        'plaid_item_id',
        'plaid_data',
        'verified_at',
        'rejection_reason',
    ];

    protected $casts = [
        'bank_account_owner_address' => 'array',
        'plaid_data' => 'array',
        'name_similarity_score' => 'float',
        'organization_match_score' => 'float',
        'address_match_score' => 'float',
        'ein_verified' => 'boolean',
        'verified_at' => 'datetime',
    ];

    protected $hidden = [
        'plaid_access_token',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isVerified(): bool
    {
        return $this->verification_status === 'verified';
    }

    public function isPending(): bool
    {
        return $this->verification_status === 'pending';
    }

    public function isRejected(): bool
    {
        return $this->verification_status === 'rejected';
    }

    public function hasNameMismatch(): bool
    {
        return $this->verification_status === 'name_mismatch';
    }

    public function getStatusBadgeClass(): string
    {
        return match($this->verification_status) {
            'verified' => 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
            'name_mismatch' => 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
            'rejected' => 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100',
            default => 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
        };
    }

    public function getStatusText(): string
    {
        return match($this->verification_status) {
            'verified' => 'Verified',
            'name_mismatch' => 'Needs Review',
            'rejected' => 'Rejected',
            default => 'Pending',
        };
    }

    public function getNameMatchStatus(): string
    {
        if ($this->name_similarity_score >= 80) {
            return 'excellent_match';
        } elseif ($this->name_similarity_score >= 60) {
            return 'good_match';
        } else {
            return 'poor_match';
        }
    }

    public function getOrganizationMatchStatus(): string
    {
        if ($this->organization_match_score >= 70) {
            return 'excellent_match';
        } elseif ($this->organization_match_score >= 40) {
            return 'good_match';
        } else {
            return 'poor_match';
        }
    }

    public function getAddressMatchStatus(): string
    {
        if ($this->address_match_score >= 80) {
            return 'excellent_match';
        } elseif ($this->address_match_score >= 50) {
            return 'good_match';
        } else {
            return 'poor_match';
        }
    }
}
