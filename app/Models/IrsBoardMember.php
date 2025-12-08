<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class IrsBoardMember extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'irs_board_members';

    protected $fillable = [
        'ein',
        'name',
        'position',
        'status',
        'tax_year',
        'appointed_date',
        'term_end_date',
        'removed_date',
        'notes',
        'irs_data',
    ];

    protected $casts = [
        'appointed_date' => 'date',
        'term_end_date' => 'date',
        'removed_date' => 'date',
        'irs_data' => 'array',
    ];

    /**
     * Get the organization that this board member belongs to
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'ein', 'ein');
    }

    /**
     * Scope to get only active board members
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope to get board members for a specific EIN
     */
    public function scopeForEin($query, string $ein)
    {
        return $query->where('ein', $ein);
    }

    /**
     * Scope to get board members for a specific tax year
     */
    public function scopeForTaxYear($query, string $taxYear)
    {
        return $query->where('tax_year', $taxYear);
    }

    /**
     * Mark board member as inactive (when they leave or term expires)
     */
    public function markAsInactive(?string $reason = null): void
    {
        $this->update([
            'status' => 'inactive',
            'removed_date' => now(),
            'notes' => $this->notes ? $this->notes . "\n" . ($reason ?? 'Marked as inactive') : ($reason ?? 'Marked as inactive'),
        ]);
    }

    /**
     * Mark board member as expired (when term ends)
     */
    public function markAsExpired(): void
    {
        $this->update([
            'status' => 'expired',
            'removed_date' => $this->term_end_date ?? now(),
        ]);
    }

    /**
     * Mark board member as removed
     */
    public function markAsRemoved(?string $reason = null): void
    {
        $this->update([
            'status' => 'removed',
            'removed_date' => now(),
            'notes' => $this->notes ? $this->notes . "\n" . ($reason ?? 'Removed from board') : ($reason ?? 'Removed from board'),
        ]);
    }

    /**
     * Reactivate a board member
     */
    public function reactivate(): void
    {
        $this->update([
            'status' => 'active',
            'removed_date' => null,
        ]);
    }
}
