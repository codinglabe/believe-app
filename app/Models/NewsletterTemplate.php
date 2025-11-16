<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NewsletterTemplate extends Model
{
    protected $fillable = [
        'organization_id',
        'name',
        'subject',
        'content',
        'html_content',
        'template_type',
        'settings',
        'is_active',
        'frequency_limit',
        'custom_frequency_days',
        'frequency_notes'
    ];

    protected $casts = [
        'settings' => 'array',
        'is_active' => 'boolean'
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function newsletters(): HasMany
    {
        return $this->hasMany(Newsletter::class);
    }
}
