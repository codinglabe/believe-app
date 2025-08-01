<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Organization extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'ein',
        'name',
        'stripe_product_id',
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
        'original_irs_data',
        'social_accounts'
    ];

    protected $casts = [
        'original_irs_data' => 'array',
        'has_edited_irs_data' => 'boolean',
        'social_accounts' => 'array',
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

    // public function favoritedBy()
    // {
    //     return $this->belongsToMany(User::class, 'user_favorite_organizations');
    // }

    public function isFavoritedByUser(): HasOne
    {
        return $this->hasOne(UserFavoriteOrganization::class, 'organization_id');
    }

    public function donations()
    {
        return $this->hasMany(Donation::class, 'organization_id');
    }

    public function products()
    {
        return $this->hasMany(Product::class, 'organization_id');
    }

    public function jobPosts()
    {
        return $this->hasMany(JobPost::class, 'organization_id', 'id');
    }

    public function events()
    {
        return $this->hasMany(Event::class, 'organization_id');
    }
}
