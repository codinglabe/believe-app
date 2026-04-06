<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Meeting extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'description',
        'status',
        'meeting_id',
        'course_id',
    ];

    /**
     * Creator/host of the meeting (supporter or org user).
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Optional course (org meetings only).
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }
}
