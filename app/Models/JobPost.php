<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JobPost extends Model
{
    protected $fillable = [
        'title',
        'description',
        'requirements',
        'pay_rate',
        'currency',
        'type',
        'location_type',
        'city',
        'state',
        'country',
        'time_commitment_min_hours',
        'application_deadline',
        'date_posted',
        'status',
        'position_id',
        'organization_id'
    ];

    // Relationships
    public function position()
    {
        return $this->belongsTo(JobPosition::class, 'position_id');
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }
}
