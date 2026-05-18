<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComplianceApplication extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'application_number',
        'status',
        'amount',
        'currency',
        'payment_status',
        'stripe_session_id',
        'stripe_payment_intent',
        'assistance_types',
        'description',
        'documents',
        'contact_name',
        'contact_email',
        'contact_phone',
        'submitted_at',
        'reviewed_at',
        'reviewed_by',
        'meta',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'assistance_types' => 'array',
        'documents' => 'array',
        'meta' => 'array',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public static function generateApplicationNumber(): string
    {
        do {
            $number = 'APP-' . strtoupper(bin2hex(random_bytes(3))) . '-' . now()->format('ymd');
        } while (self::where('application_number', $number)->exists());

        return $number;
    }
}
