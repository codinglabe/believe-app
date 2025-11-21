<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VolunteerTimesheet extends Model
{
    protected $fillable = [
        'job_application_id',
        'organization_id',
        'created_by',
        'work_date',
        'hours',
        'description',
        'notes',
    ];

    protected $casts = [
        'work_date' => 'date',
        'hours' => 'decimal:6',
    ];

    // Relationships
    public function jobApplication()
    {
        return $this->belongsTo(JobApplication::class, 'job_application_id');
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Helper to get volunteer (user) through job application
    public function volunteer()
    {
        return $this->hasOneThrough(
            User::class,
            JobApplication::class,
            'id',
            'id',
            'job_application_id',
            'user_id'
        );
    }
}
