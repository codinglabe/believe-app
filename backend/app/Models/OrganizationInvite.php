<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class OrganizationInvite extends Model
{
    protected $fillable = [
        'excel_data_id',
        'inviter_id',
        'email',
        'organization_name',
        'ein',
        'token',
        'status',
        'sent_at',
        'accepted_at',
        'points_awarded_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'accepted_at' => 'datetime',
        'points_awarded_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($invite) {
            if (empty($invite->token)) {
                $invite->token = static::generateUniqueToken();
            }
        });
    }

    /**
     * Generate a unique token for the invite
     */
    protected static function generateUniqueToken(): string
    {
        do {
            $token = Str::random(32);
        } while (static::where('token', $token)->exists());

        return $token;
    }

    public function excelData(): BelongsTo
    {
        return $this->belongsTo(ExcelData::class);
    }

    public function inviter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'inviter_id');
    }
}
