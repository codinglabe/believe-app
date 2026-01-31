<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class FundMeCategory extends Model
{
    use HasFactory;

    protected $table = 'fundme_categories';

    protected $fillable = ['name', 'slug', 'description', 'sort_order', 'is_active'];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function campaigns(): HasMany
    {
        return $this->hasMany(FundMeCampaign::class, 'fundme_category_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public static function booted(): void
    {
        static::creating(function (FundMeCategory $model) {
            if (empty($model->slug)) {
                $model->slug = Str::slug($model->name);
            }
        });
    }
}
