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
        'platform_email',
        'phone',
        'contact_name',
        'contact_title',
        'website',
        'youtube_channel_url',
        'youtube_access_token',
        'youtube_refresh_token',
        'youtube_token_expires_at',
        'description',
        'mission',
        'registered_user_image',
        'registration_status',
        'verification_source',
        'claim_verification_metadata',
        'has_edited_irs_data',
        'original_irs_data',
        'social_accounts',
        'tax_compliance_status',
        'tax_compliance_checked_at',
        'tax_compliance_meta',
        'is_compliance_locked',
        'gift_card_terms_approved',
        'gift_card_terms_approved_at',
        'dropbox_folder_name',
    ];

    protected $hidden = [
        'youtube_access_token',
        'youtube_refresh_token',
        'dropbox_access_token',
        'dropbox_refresh_token',
    ];

    protected $casts = [
        'original_irs_data' => 'array',
        'has_edited_irs_data' => 'boolean',
        'social_accounts' => 'array',
        'tax_compliance_checked_at' => 'datetime',
        'tax_compliance_meta' => 'array',
        'claim_verification_metadata' => 'array',
        'is_compliance_locked' => 'boolean',
        'gift_card_terms_approved' => 'boolean',
        'gift_card_terms_approved_at' => 'datetime',
        'youtube_token_expires_at' => 'datetime',
        'dropbox_token_expires_at' => 'datetime',
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

    public function form990Filings()
    {
        return $this->hasMany(Form990Filing::class);
    }

    public function getLatestForm990Filing()
    {
        return $this->form990Filings()->latest('tax_year')->first();
    }

    public function getOverdueForm990Filings()
    {
        return $this->form990Filings()
            ->where('is_filed', false)
            ->where(function ($query) {
                $query->where('due_date', '<', now())
                    ->orWhere('extended_due_date', '<', now());
            })
            ->get();
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

    /**
     * Get IRS board members for this organization (by EIN)
     */
    public function irsBoardMembers()
    {
        return $this->hasMany(IrsBoardMember::class, 'ein', 'ein');
    }

    public function newsletterRecipients()
    {
        return $this->hasMany(NewsletterRecipient::class, 'organization_id');
    }

    public function getFormattedEinAttribute()
    {
        return substr($this->ein, 0, 2) . '-' . substr($this->ein, 2);
    }

    /**
     * Get the Bridge integration for this organization
     */
    public function bridgeIntegration(): HasOne
    {
        return $this->hasOne(BridgeIntegration::class, 'integratable_id')
            ->where('integratable_type', self::class);
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

    public function complianceApplications()
    {
        return $this->hasMany(ComplianceApplication::class);
    }

    public function form1023Applications()
    {
        return $this->hasMany(Form1023Application::class);
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

    public function emailConnections()
    {
        return $this->hasMany(EmailConnection::class);
    }

    public function emailContacts()
    {
        return $this->hasMany(EmailContact::class);
    }

    public function giftCards()
    {
        return $this->hasMany(GiftCard::class);
    }

    public function fundmeCampaigns()
    {
        return $this->hasMany(FundMeCampaign::class, 'organization_id');
    }

    public function fundmeDonations()
    {
        return $this->hasMany(FundMeDonation::class, 'organization_id');
    }

    /**
     * Barter network: listings this nonprofit offers.
     */
    public function barterListings()
    {
        return $this->hasMany(NonprofitBarterListing::class, 'nonprofit_id');
    }

    /**
     * Barter: transactions where this org is the requester (A).
     */
    public function barterTransactionsRequested()
    {
        return $this->hasMany(NonprofitBarterTransaction::class, 'requesting_nonprofit_id');
    }

    /**
     * Barter: transactions where this org is the responder (B).
     */
    public function barterTransactionsResponding()
    {
        return $this->hasMany(NonprofitBarterTransaction::class, 'responding_nonprofit_id');
    }

    /**
     * Get all livestreams for this organization.
     */
    public function livestreams()
    {
        return $this->hasMany(OrganizationLivestream::class);
    }

    /**
     * Get active/live livestreams for this organization.
     */
    public function activeLivestreams()
    {
        return $this->livestreams()->where('status', 'live');
    }
}
