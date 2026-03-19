<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KioskActivityLog extends Model
{
    protected $table = 'kiosk_activity_log';

    protected $fillable = ['user_id', 'category_slug', 'action_key', 'metadata'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
