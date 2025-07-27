<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JobApplication extends Model
{
    protected $fillable = [
        'job_post_id',
        'user_id',
        'address',
        'city',
        'state',
        'country',
        'date_of_birth',
        'postal_code',
        'emergency_contact_name',
        'emergency_contact_relationship',
        'emergency_contact_phone',
        'volunteer_experience',
        'work_or_education_background',
        'languages_spoken',
        'certifications',
        'medical_conditions',
        'physical_limitations',
        'consent_background_check',
        'drivers_license_number',
        'willing_background_check',
        'ever_convicted',
        'conviction_explanation',
        'reference_name',
        'reference_relationship',
        'reference_contact',
        'agreed_to_terms',
        'digital_signature',
        'signed_date',
        'tshirt_size',
        'heard_about_us',
        'social_media_handle',
        'status',
        'resume',
        'cover_letter',
    ];

    protected $casts = [
        'languages_spoken' => 'array',
        'certifications' => 'array',
        'consent_background_check' => 'boolean',
        'willing_background_check' => 'boolean',
        'ever_convicted' => 'boolean',
        'agreed_to_terms' => 'boolean',
        'signed_date' => 'date',
        'date_of_birth' => 'date',
    ];

    // Relationships
    public function jobPost()
    {
        return $this->belongsTo(JobPost::class, 'job_post_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
