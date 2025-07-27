<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class NodeBoss extends Model
{
    // Remove explicit property declaration for is_closed; Eloquent manages this dynamically.

    protected $fillable = [
        'user_id',
        'organization_id',
        'name',
        'description',
        'price',
        'suggested_amounts',
        'shares_available',
        'shares_sold',
        'start_date',
        'end_date',
        'is_closed',
        'image',
        'slug',
        'status',
        'created_by'
    ];

    protected $casts = [
        'suggested_amounts' => 'array',
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'is_closed' => 'boolean',
        'shares_available' => 'integer',
        'price' => 'decimal:2',
    ];

    // create slug from name
    public static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            // Generate unique slug
            do {
                $slug = Str::slug($model->name);
                $randomSuffix = '-' . Str::random(6);
                $fullSlug = $slug . $randomSuffix;
            } while (self::where('slug', $fullSlug)->exists());

            $model->slug = $fullSlug;
        });
    }



    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function purchases()
    {
        return $this->hasMany(Purchase::class);
    }

    public function nodeshare()
    {
        return $this->hasOne(NodeShare::class, 'node_boss_id');
    }

    public function nodeshares()
    {
        return $this->hasMany(NodeShare::class, 'node_boss_id');
    }


        public function nodeReferrals()
    {
        return $this->hasMany(NodeReferral::class);
    }

    public function shares()
    {
        return $this->hasMany(NodeShare::class);
    }

    public function soldShares()
    {
        return $this->hasMany(NodeSell::class);
    }

    public function getFormattedPriceAttribute()
    {
        return number_format((int)$this->price, 2);
    }

    public function getEndDateFormattedAttribute()
    {
        return $this->end_date ? $this->end_date->format('F j, Y') : 'N/A';
    }

    public function getStartDateFormattedAttribute()
    {
        return $this->start_date ? $this->start_date->format('F j, Y') : 'N/A';
    }

    public function isOpen()
    {
        return !$this->is_closed && $this->shares_available > 0 && now()->between($this->start_date, $this->end_date);
    }

    public function isClosed()
    {
        return $this->is_closed || $this->shares_available <= 0 || now()->greaterThanOrEqualTo($this->end_date);
    }
}
