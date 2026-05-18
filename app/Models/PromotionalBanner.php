<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class PromotionalBanner extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'title',
        'type',
        'image_url',
        'text_content',
        'external_link',
        'is_active',
        'display_order',
        'starts_at',
        'ends_at',
        'background_color',
        'text_color',
        'description',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'display_order' => 'integer',
    ];

    /**
     * Scope to get only active banners
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('starts_at')
                  ->orWhere('starts_at', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('ends_at')
                  ->orWhere('ends_at', '>=', now());
            });
    }

    /**
     * Scope to order by display order
     */
    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('display_order')->orderBy('created_at', 'desc');
    }

    /**
     * Get the currently active banner
     */
    public static function getActiveBanner()
    {
        return static::active()->ordered()->first();
    }

    /**
     * Get all active banners for carousel
     */
    public static function getActiveBanners()
    {
        return static::active()->ordered()->get();
    }

    /**
     * Check if banner is currently active based on dates
     */
    public function isCurrentlyActive(): bool
    {
        if (!$this->is_active) {
            return false;
        }

        $now = now();
        
        if ($this->starts_at && $this->starts_at->isFuture()) {
            return false;
        }

        if ($this->ends_at && $this->ends_at->isPast()) {
            return false;
        }

        return true;
    }
}
