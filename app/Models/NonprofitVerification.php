<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NonprofitVerification extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'ein',
        'organization_legal_name',
        'manager_name',
        'manager_title',
        'verification_status',
        'verification_method',
        'nonprofit_exists',
        'nonprofit_in_good_standing',
        'name_matches_public_records',
        'manager_listed_as_officer',
        'profile_name_matches_ceo',
        'profile_name_matches_any_officer',
        'profile_name_matches_organization_name',
        'propublica_data',
        'officers_list',
        'ceo_info',
        'fraud_flags',
        'compliance_score',
        'verification_notes',
        'verified_at',
        'rejection_reason',
        'required_documents',
    ];

    protected $casts = [
        'nonprofit_exists' => 'boolean',
        'nonprofit_in_good_standing' => 'boolean',
        'name_matches_public_records' => 'boolean',
        'manager_listed_as_officer' => 'boolean',
        'profile_name_matches_ceo' => 'boolean',
        'profile_name_matches_any_officer' => 'boolean',
        'profile_name_matches_organization_name' => 'boolean',
        'propublica_data' => 'array',
        'officers_list' => 'array',
        'ceo_info' => 'array',
        'fraud_flags' => 'array',
        'verified_at' => 'datetime',
        'required_documents' => 'array',
        'compliance_score' => 'integer',
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

    public function isFraudFlagged(): bool
    {
        return $this->verification_status === 'flagged_fraud';
    }

    public function needsAdditionalDocs(): bool
    {
        return $this->verification_status === 'needs_additional_docs';
    }

    public function getStatusDisplayAttribute(): string
    {
        return match($this->verification_status) {
            'verified' => 'Verified',
            'pending' => 'Pending',
            'rejected' => 'Rejected',
            'flagged_fraud' => 'Fraud Flagged',
            'needs_additional_docs' => 'Additional Documents Required',
            default => 'Unknown',
        };
    }

    public function getVerificationMethodDisplayAttribute(): string
    {
        return match($this->verification_method) {
            'irs_records' => 'IRS Records Verification',
            'system_error' => 'System Error',
            default => 'Standard Verification',
        };
    }

    public function isVerifiedByIRS(): bool
    {
        return $this->verification_method === 'irs_records' && $this->isVerified();
    }

    public function getFormattedEinAttribute(): string
    {
        if (!$this->ein) {
            return '';
        }
        
        // Format EIN as XX-XXXXXXX
        $clean = preg_replace('/[^0-9]/', '', $this->ein);
        if (strlen($clean) === 9) {
            return substr($clean, 0, 2) . '-' . substr($clean, 2);
        }
        
        return $this->ein;
    }
}
