<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UnityLoavesSchedule extends Model
{
    protected $table = 'unity_loaves_schedules';

    protected $fillable = [
        'location_id',
        'schedule_type',
        'title',
        'description',
        'day_of_week',
        'start_time',
        'end_time',
        'recurrence_text',
    ];

    protected $casts = [
        'start_time' => 'datetime:H:i',
        'end_time'   => 'datetime:H:i',
    ];

    public function location(): BelongsTo
    {
        return $this->belongsTo(UnityLoavesLocation::class, 'location_id');
    }

    /* Scopes by type */
    public function scopeMeals($query)
    {
        return $query->where('schedule_type', 'meal');
    }

    public function scopeDropoffs($query)
    {
        return $query->where('schedule_type', 'dropoff');
    }

    public function scopeServices($query)
    {
        return $query->where('schedule_type', 'service');
    }
}
