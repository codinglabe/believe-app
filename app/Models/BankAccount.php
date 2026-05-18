<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BankAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'account_name',
        'account_type',
        'bank_name',
        'plaid_account_id',
        'plaid_access_token',
        'is_verified',
        'verification_status',
        'verification_data',
        'last_verified_at',
    ];

    protected $casts = [
        'is_verified' => 'boolean',
        'verification_data' => 'array',
        'last_verified_at' => 'datetime',
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
        return $this->is_verified && $this->verification_status === 'verified';
    }

    public function getStatusBadgeClass(): string
    {
        return match($this->verification_status) {
            'verified' => 'bg-green-100 text-green-800',
            'pending' => 'bg-yellow-100 text-yellow-800',
            'failed' => 'bg-red-100 text-red-800',
            default => 'bg-gray-100 text-gray-800',
        };
    }

    public function getStatusText(): string
    {
        return match($this->verification_status) {
            'verified' => 'Verified',
            'pending' => 'Pending',
            'failed' => 'Failed',
            default => 'Unknown',
        };
    }

    public function getMaskedAccountNumber(): string
    {
        if (!$this->plaid_account_id) {
            return '****';
        }
        
        return '****' . substr($this->plaid_account_id, -4);
    }
}
