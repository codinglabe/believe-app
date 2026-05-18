<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NonprofitExemptionCertificate extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'organization_id',
        'state_code',
        'certificate_file_path',
        'certificate_number',
        'issued_date',
        'expiry_date',
        'status',
        'approved_by',
        'approved_at',
        'notes',
    ];

    protected $casts = [
        'issued_date' => 'date',
        'expiry_date' => 'date',
        'approved_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved' && !$this->isExpired();
    }

    public function isExpired(): bool
    {
        if (!$this->expiry_date) {
            return false;
        }
        return $this->expiry_date->isPast();
    }

    public function isValid(): bool
    {
        return $this->isApproved() && !$this->isExpired();
    }
}
