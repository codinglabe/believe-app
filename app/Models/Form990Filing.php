<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Form990Filing extends Model
{
    use HasFactory;

    protected $table = 'form_990_filings';

    protected $fillable = [
        'organization_id',
        'tax_year',
        'form_type',
        'filing_date',
        'is_filed',
        'due_date',
        'extended_due_date',
        'is_extended',
        'last_checked_at',
        'irs_data',
        'meta',
    ];

    protected $casts = [
        'filing_date' => 'date',
        'due_date' => 'date',
        'extended_due_date' => 'date',
        'is_filed' => 'boolean',
        'is_extended' => 'boolean',
        'last_checked_at' => 'datetime',
        'irs_data' => 'array',
        'meta' => 'array',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Check if filing is overdue
     */
    public function isOverdue(): bool
    {
        if ($this->is_filed) {
            return false;
        }

        $dueDate = $this->extended_due_date ?? $this->due_date;
        
        if (!$dueDate) {
            return false;
        }

        return $dueDate->isPast();
    }

    /**
     * Get days until due (negative if overdue)
     */
    public function daysUntilDue(): ?int
    {
        $dueDate = $this->extended_due_date ?? $this->due_date;
        
        if (!$dueDate) {
            return null;
        }

        return now()->diffInDays($dueDate, false);
    }
}
