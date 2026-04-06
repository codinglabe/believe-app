<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class BridgeKycKybSubmission extends Model
{
    protected $fillable = [
        'bridge_integration_id',
        'type',
        'submission_status',
        'ein',
        'bridge_customer_id',
        'bridge_response',
        'submission_data',
    ];

    protected $casts = [
        'bridge_response' => 'array',
        'submission_data' => 'array',
    ];

    protected $appends = [
        'id_front_image_url',
        'id_back_image_url',
    ];

    /**
     * Get the bridge integration this submission belongs to
     */
    public function bridgeIntegration(): BelongsTo
    {
        return $this->belongsTo(BridgeIntegration::class);
    }

    /**
     * Get the full URL for the ID front image (from verification_documents table)
     */
    public function getIdFrontImageUrlAttribute(): ?string
    {
        $doc = $this->getVerificationDocument('id_front');
        if (!$doc || !$doc->file_path) {
            return null;
        }
        return asset('storage/' . $doc->file_path);
    }

    /**
     * Get the full URL for the ID back image (from verification_documents table)
     */
    public function getIdBackImageUrlAttribute(): ?string
    {
        $doc = $this->getVerificationDocument('id_back');
        if (!$doc || !$doc->file_path) {
            return null;
        }
        return asset('storage/' . $doc->file_path);
    }
    
    /**
     * Get the file path for the ID front image (from verification_documents table)
     */
    public function getIdFrontImagePathAttribute(): ?string
    {
        $doc = $this->getVerificationDocument('id_front');
        return $doc ? $doc->file_path : null;
    }
    
    /**
     * Get the file path for the ID back image (from verification_documents table)
     */
    public function getIdBackImagePathAttribute(): ?string
    {
        $doc = $this->getVerificationDocument('id_back');
        return $doc ? $doc->file_path : null;
    }

    /**
     * Check if submission is approved
     */
    public function isApproved(): bool
    {
        return $this->submission_status === 'approved';
    }

    /**
     * Check if submission is rejected
     */
    public function isRejected(): bool
    {
        return $this->submission_status === 'rejected';
    }

    /**
     * Get all verification documents for this submission
     */
    public function verificationDocuments(): HasMany
    {
        return $this->hasMany(VerificationDocument::class, 'bridge_kyc_kyb_submission_id');
    }

    /**
     * Get a specific verification document by type
     */
    public function getVerificationDocument(string $documentType): ?VerificationDocument
    {
        return $this->verificationDocuments()->where('document_type', $documentType)->first();
    }

    /**
     * Get the control person for this submission
     */
    public function controlPerson(): HasOne
    {
        return $this->hasOne(ControlPerson::class, 'bridge_kyc_kyb_submission_id');
    }

    /**
     * Get all associated persons for this submission
     */
    public function associatedPersons(): HasMany
    {
        return $this->hasMany(AssociatedPerson::class, 'bridge_kyc_kyb_submission_id');
    }

    /**
     * Get business data from organization (via bridge_integration)
     */
    public function getBusinessData()
    {
        $integration = $this->bridgeIntegration;
        if (!$integration) {
            return null;
        }

        $organization = $integration->integratable;
        if (!$organization || !($organization instanceof \App\Models\Organization)) {
            return null;
        }

        return [
            'business_name' => $organization->name,
            'business_email' => $organization->email,
            'ein' => $organization->ein,
            'business_address' => [
                'street_line_1' => $organization->street_line_1,
                'city' => $organization->city,
                'subdivision' => $organization->state,
                'postal_code' => $organization->postal_code,
                'country' => $organization->country ?? 'USA',
            ],
        ];
    }
}
