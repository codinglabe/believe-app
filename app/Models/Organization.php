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
        'balance',
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
        'registered_user_image',
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

    public function users()
    {
        return $this->hasManyThrough(User::class, BoardMember::class, 'organization_id', 'id', 'id', 'user_id');
    }

    public function contentItems()
    {
        return $this->hasMany(ContentItem::class);
    }

    public function campaigns()
    {
        return $this->hasMany(Campaign::class);
    }

    public function activeMembers()
    {
        return $this->users()->where('login_status', true);
    }

    // Helper methods
    public function getDefaultSettings()
    {
        return [
            'send_time' => '07:00',
            'channels' => ['push'],
            'quiet_hours_start' => '21:00',
            'quiet_hours_end' => '07:00',
        ];
    }

    public function boardMembers()
    {
        return $this->hasMany(BoardMember::class);
    }

    public function newsletterRecipients()
    {
        return $this->hasMany(NewsletterRecipient::class, 'organization_id');
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

    /**
     * Add funds to the organization's balance.
     *
     * @param float $amount
     * @param string $method
     * @param array $meta
     * @return void
     */
    public function addFund(float $amount, string $method = 'raffle_sales', array $meta = []): void
    {
        $this->increment('balance', $amount);

        // Record transaction for the organization's user if it exists
        if ($this->user) {
            $this->user->recordTransaction([
                'type' => 'raffle_sale',
                'amount' => $amount,
                'payment_method' => $method,
                'meta' => array_merge($meta, ['organization_id' => $this->id]),
            ]);
        }
    }

    /**
     * Get the current balance of the organization.
     *
     * @return float
     */
    public function currentBalance(): float
    {
        return (float) $this->balance;
    }
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

    public function followers()
    {
        return $this->belongsToMany(User::class, 'user_favorite_organizations', 'organization_id', 'user_id')
            ->withPivot('notifications') // notifications column include
            ->withTimestamps();
    }
}
