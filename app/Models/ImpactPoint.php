<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ImpactPoint extends Model
{
    protected $fillable = [
        'user_id',
        'source_type',
        'source_id',
        'points',
        'description',
        'metadata',
        'activity_date',
    ];

    protected $casts = [
        'points' => 'decimal:2',
        'metadata' => 'array',
        'activity_date' => 'date',
    ];

    /**
     * Get the user that earned these points.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the source model (polymorphic relationship).
     */
    public function source()
    {
        return $this->morphTo('source', 'source_type', 'source_id');
    }
}
