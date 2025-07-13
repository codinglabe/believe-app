<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Organization extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'ein',
        'name',
        'ico',
        'street',
        'city',
        'state',
        'zip',
        'classification',
        'ruling',
        'deductibility',
        'organization',
        'status',
        'tax_period',
        'filing_req',
        'ntee_code',
        'email',
        'phone',
        'contact_name',
        'contact_title',
        'website',
        'description',
        'mission',
        'registration_status',
        'has_edited_irs_data',
        'original_irs_data'
    ];

    protected $casts = [
        'original_irs_data' => 'array',
        'has_edited_irs_data' => 'boolean'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function getFormattedEinAttribute()
    {
        return substr($this->ein, 0, 2) . '-' . substr($this->ein, 2);
    }

    public function nteeCode()
    {
        return $this->belongsTo(NteeCode::class, 'ntee_code', 'ntee_codes');
    }

    // Scope for active organizations
    public function scopeActive($query)
    {
        return $query->where('registration_status', 'approved');
    }

    // Scope for search
    public function scopeSearch($query, $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('name', 'LIKE', "%{$search}%")
                ->orWhere('description', 'LIKE', "%{$search}%")
                ->orWhere('mission', 'LIKE', "%{$search}%");
        });
    }
}
