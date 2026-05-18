<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupporterBrpTransaction extends Model
{
    protected $fillable = [
        'user_id',
        'type',
        'amount_brp',
        'reference_type',
        'reference_id',
        'description',
    ];

    protected $casts = [
        'amount_brp' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
