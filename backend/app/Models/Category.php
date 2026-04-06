<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    protected $table = 'categories';

    protected $fillable = [
        'name',
        'status',
        'parent_id',
    ];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Category::class, 'parent_id');
    }

    /** Subcategories / detail rows (same table; products use parent rows only). */
    public function scopeLeaves($query)
    {
        return $query->whereNotNull('parent_id');
    }

    /** Top-level categories (assigned to products / marketplace products). */
    public function scopeParents($query)
    {
        return $query->whereNull('parent_id');
    }

    public function getDisplayNameAttribute(): string
    {
        if ($this->relationLoaded('parent') && $this->parent) {
            return $this->parent->name.' → '.$this->name;
        }

        return $this->name;
    }
}
