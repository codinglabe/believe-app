<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class VerificationDocument extends Model
{
    protected $fillable = [
        'bridge_kyc_kyb_submission_id',
        'document_type',
        'file_path',
        'status',
        'rejection_reason',
        'approval_notes',
        'rejected_at',
        'rejected_by',
        'approved_at',
        'approved_by',
    ];

    protected $casts = [
        'rejected_at' => 'datetime',
        'approved_at' => 'datetime',
    ];

    protected $appends = [
        'url',
    ];

    /**
     * Get the submission this document belongs to
     */
    public function submission(): BelongsTo
    {
        return $this->belongsTo(BridgeKycKybSubmission::class, 'bridge_kyc_kyb_submission_id');
    }

    /**
     * Get the user who rejected this document
     */
    public function rejectedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    /**
     * Get the user who approved this document
     */
    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Get the document URL
     */
    public function getUrlAttribute(): ?string
    {
        if (!$this->file_path) {
            return null;
        }
        return asset('storage/' . $this->file_path);
    }
}
